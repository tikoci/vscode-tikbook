#!/usr/bin/env bash
set -euo pipefail

# Control test: prove QGA test method/socket plumbing works on the same host+QEMU.
# Uses Ubuntu cloud image + cloud-init to install/start qemu-guest-agent.

WORK_DIR="${WORK_DIR:-$HOME/.cache/qga-control-ubuntu}"
UBUNTU_URL="${UBUNTU_URL:-https://cloud-images.ubuntu.com/minimal/releases/jammy/release/ubuntu-22.04-minimal-cloudimg-amd64.img}"
BOOT_WAIT_SECS="${BOOT_WAIT_SECS:-120}"
RETRIES="${RETRIES:-20}"
RETRY_DELAY="${RETRY_DELAY:-5}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }; }
need qemu-system-x86_64
need qemu-img
need curl
need python3
need hdiutil
need timeout

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

IMG_BASE="ubuntu-minimal.img"
OVERLAY="ubuntu-control.qcow2"
PID_FILE="$WORK_DIR/control.pid"
SOCK_FILE="$WORK_DIR/control-qga.sock"
MON_FILE="$WORK_DIR/control.mon"
SEED_DIR="$WORK_DIR/seed"
SEED_ISO="$WORK_DIR/seed.iso"

if [[ ! -f "$IMG_BASE" ]]; then
  echo "Downloading Ubuntu cloud image..."
  curl -fL -o "$IMG_BASE" "$UBUNTU_URL"
fi

rm -f "$OVERLAY"
qemu-img create -f qcow2 -b "$IMG_BASE" -F qcow2 "$OVERLAY" >/dev/null

rm -rf "$SEED_DIR" "$SEED_ISO"
mkdir -p "$SEED_DIR"
cat > "$SEED_DIR/meta-data" <<'EOF'
instance-id: qga-control-001
local-hostname: qga-control
EOF

cat > "$SEED_DIR/user-data" <<'EOF'
#cloud-config
package_update: true
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable --now qemu-guest-agent || true
EOF

hdiutil makehybrid -quiet -o "$SEED_ISO" "$SEED_DIR" -iso -joliet -default-volume-name cidata >/dev/null

cleanup() {
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "${pid}" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE" "$SOCK_FILE" "$MON_FILE"
}
trap cleanup EXIT INT TERM

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
    s.settimeout(3.0)
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

cleanup
qemu-system-x86_64 \
  -name "qga-control-ubuntu" \
  -M accel=hvf \
  -cpu host \
  -smp 2 \
  -m 1024 \
  -drive file="$OVERLAY",format=qcow2,if=virtio \
  -drive file="$SEED_ISO",media=cdrom,if=virtio \
  -device virtio-net,netdev=net0 \
  -netdev user,id=net0 \
  -device virtio-serial \
  -chardev socket,path="$SOCK_FILE",server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
  -monitor unix:"$MON_FILE",server,nowait \
  -display none \
  -daemonize \
  -pidfile "$PID_FILE"

sleep "$BOOT_WAIT_SECS"

echo "Waiting for guest agent response..."
for i in $(seq 1 "$RETRIES"); do
  out="$(qga_query "$SOCK_FILE" '{"execute":"guest-ping"}' 2>&1 || true)"
  if echo "$out" | grep -q '"return"'; then
    echo "SUCCESS: guest-ping responded on attempt ${i}"
    echo "$out"
    info="$(qga_query "$SOCK_FILE" '{"execute":"guest-info"}' 2>&1 || true)"
    echo "$info"
    exit 0
  fi
  echo "attempt=${i} response=${out:-<empty>}"
  sleep "$RETRY_DELAY"
done

echo "FAIL: control VM guest agent did not respond"
exit 1
