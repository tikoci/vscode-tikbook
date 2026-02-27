#!/usr/bin/env bash
set -euo pipefail

# Minimal MikroTik CHR QEMU Guest Agent repro for macOS (Intel + Homebrew QEMU)
# Purpose: produce hard, reproducible evidence for MikroTik support.

CHR_VERSION="${CHR_VERSION:-7.21.3}"
CPU_MATRIX="${CPU_MATRIX:-default,host,qemu64,kvm64}"
WORK_DIR="${WORK_DIR:-$HOME/.cache/chr-qga-repro}"
BOOT_WAIT_SECS="${BOOT_WAIT_SECS:-45}"
RETRIES="${RETRIES:-8}"
RETRY_DELAY="${RETRY_DELAY:-4}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need qemu-system-x86_64
need qemu-img
need curl
need unzip
need python3

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

IMG_ZIP="chr-${CHR_VERSION}.img.zip"
IMG_RAW="chr-${CHR_VERSION}.img"
SUMMARY_FILE="$WORK_DIR/repro-summary-${CHR_VERSION}-$(date +%Y%m%d-%H%M%S).log"

if [[ ! -f "$IMG_RAW" ]]; then
  echo "Downloading CHR ${CHR_VERSION}..."
  curl -fL -o "$IMG_ZIP" "https://download.mikrotik.com/routeros/${CHR_VERSION}/${IMG_ZIP}"
  unzip -o "$IMG_ZIP" >/dev/null
fi

echo "=== CHR QGA Repro (macOS) ===" | tee "$SUMMARY_FILE"
echo "date: $(date -u +%FT%TZ)" | tee -a "$SUMMARY_FILE"
echo "qemu: $(qemu-system-x86_64 --version | head -1)" | tee -a "$SUMMARY_FILE"
echo "chr_version: ${CHR_VERSION}" | tee -a "$SUMMARY_FILE"
echo "cpu_matrix: ${CPU_MATRIX}" | tee -a "$SUMMARY_FILE"
echo >> "$SUMMARY_FILE"

cleanup_vm() {
  local pid_file="$1"
  local sock_file="$2"
  local mon_file="$3"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$pid_file" "$sock_file" "$mon_file"
}

qga_query() {
  local sock="$1"
  local cmd="$2"
  local token
  token="$(date +%s)"
  python3 - "$sock" "$cmd" "$token" <<'PY'
import json, socket, sys
sock_path = sys.argv[1]
cmd = sys.argv[2]
token = int(sys.argv[3])
msg = json.dumps({"execute": "guest-sync-delimited", "arguments": {"id": token}}).encode() + b"\n"
cmd_msg = cmd.encode() + b"\n"
try:
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.settimeout(2.5)
    s.connect(sock_path)
    s.sendall(b"\xff" + msg)
    sync_resp = s.recv(65535)
    s.sendall(cmd_msg)
    cmd_resp = s.recv(65535)
    out = (sync_resp + b"\n" + cmd_resp).decode(errors="replace").strip()
    print(out)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
PY
}

run_one() {
  local cpu_label="$1"
  local cpu_arg=()
  if [[ "$cpu_label" != "default" ]]; then
    cpu_arg=( -cpu "$cpu_label" )
  fi

  local overlay="chr-${CHR_VERSION}-${cpu_label}.qcow2"
  local pid_file="$WORK_DIR/qga-${cpu_label}.pid"
  local sock_file="$WORK_DIR/qga-${cpu_label}.sock"
  local mon_file="$WORK_DIR/qga-${cpu_label}.mon"

  rm -f "$overlay"
  qemu-img create -f qcow2 -b "$IMG_RAW" -F raw "$overlay" >/dev/null

  cleanup_vm "$pid_file" "$sock_file" "$mon_file"

  if [[ "$cpu_label" == "default" ]]; then
    qemu-system-x86_64 \
      -name "chr-qga-repro-${cpu_label}" \
      -M accel=hvf \
      -smp 2 \
      -m 512 \
      -drive file="$overlay",format=qcow2,if=virtio \
      -device virtio-net,netdev=net0 \
      -netdev user,id=net0 \
      -device virtio-serial \
      -chardev socket,path="$sock_file",server=on,wait=off,id=qga0 \
      -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
      -monitor unix:"$mon_file",server,nowait \
      -display none \
      -daemonize \
      -pidfile "$pid_file"
  else
    qemu-system-x86_64 \
      -name "chr-qga-repro-${cpu_label}" \
      -M accel=hvf \
      -cpu "$cpu_label" \
      -smp 2 \
      -m 512 \
      -drive file="$overlay",format=qcow2,if=virtio \
      -device virtio-net,netdev=net0 \
      -netdev user,id=net0 \
      -device virtio-serial \
      -chardev socket,path="$sock_file",server=on,wait=off,id=qga0 \
      -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
      -monitor unix:"$mon_file",server,nowait \
      -display none \
      -daemonize \
      -pidfile "$pid_file"
  fi

  sleep "$BOOT_WAIT_SECS"

  local ok="no"
  local first_err=""
  for _ in $(seq 1 "$RETRIES"); do
    local out
    out="$(qga_query "$sock_file" '{"execute":"guest-ping"}' 2>&1 || true)"
    if echo "$out" | grep -q '"return"'; then
      ok="yes"
      break
    fi
    if [[ -z "$first_err" ]]; then
      first_err="${out:-<empty-response>}"
    fi
    sleep "$RETRY_DELAY"
  done

  {
    echo "cpu=${cpu_label}"
    echo "socket_exists=$( [[ -S "$sock_file" ]] && echo yes || echo no )"
    echo "guest_ping_success=${ok}"
    echo "first_error=${first_err}"
    echo
  } | tee -a "$SUMMARY_FILE"

  cleanup_vm "$pid_file" "$sock_file" "$mon_file"
}

IFS=',' read -r -a cpus <<< "$CPU_MATRIX"
for cpu in "${cpus[@]}"; do
  run_one "$cpu"
done

echo "summary_file=${SUMMARY_FILE}" | tee -a "$SUMMARY_FILE"
