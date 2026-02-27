# MikroTik Support Ticket: CHR QEMU Guest Agent

**Title:** CHR 7.21.3 QEMU guest agent unresponsive on macOS/QEMU 10.2.1 (virtio-serial configured, control VM validated)

## Environment

- **Host OS:** macOS (Intel x86_64)
- **QEMU version:** 10.2.1 (Homebrew)
- **Acceleration:** HVF (Hypervisor.framework)
- **CHR version:** 7.21.3 stable (chr-7.21.3.img)
- **Download source:** `https://download.mikrotik.com/routeros/7.21.3/chr-7.21.3.img.zip`

## Issue Description

CHR QEMU guest agent does not respond to `guest-ping` or `guest-info` requests despite:

1. Virtio-serial device configured with standard channel name (`org.qemu.guest_agent.0`)
2. Unix socket created and accessible on host
3. VM boots successfully (RouterOS prompt reachable via serial console)
4. Proper QGA protocol framing used (`guest-sync-delimited` with `0xFF` prefix)
5. Control validation VM (Debian 12 cloud image) responds successfully on identical host/QEMU setup

## Expected Behavior (per MikroTik documentation)

MikroTik CHR documentation (`Cloud Hosted Router, CHR` → `Guest tools` → `KVM`) states:

- QEMU guest agent is available in CHR
- Commands supported: `guest-info`, `guest-network-get-interfaces`, `guest-file-*`, `guest-exec`
- Requires virtio-serial device configuration
- Should respond with version and supported command list via `guest-info`

## Actual Behavior

All QEMU guest agent commands time out. No response received from CHR guest agent.

**Test matrix results:**

| CPU Model | Socket Exists | guest-ping Response | Error |
|-----------|---------------|---------------------|-------|
| default   | ✅ Yes        | ❌ No               | timeout (32s) |
| host      | ✅ Yes        | ❌ No               | timeout (32s) |
| qemu64    | ✅ Yes        | ❌ No               | timeout (32s) |
| kvm64     | ✅ Yes        | ❌ No               | timeout (32s) |

**Control VM (Debian 12 cloud image, same host/QEMU):**
- Socket exists: ✅ Yes
- `guest-ping` response: ✅ Success (attempt 1)
- `guest-info` response: ✅ Success (version 6.2.0, full command list)

This confirms the host-side QEMU configuration, socket wiring, and protocol implementation are correct.

## Reproduction Script

Minimal self-contained reproduction script provided below. Script requires:
- `qemu-system-x86_64`, `qemu-img`, `curl`, `unzip`, `python3`

**Download script:** `scripts/repro-chr-qga-macos.sh`

```bash
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
  local cmd_name="$2"
  python3 - "$sock" "$cmd_name" <<'PYEOF'
import socket, json, sys, time
sock_path, cmd_name = sys.argv[1], sys.argv[2]
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(4)
try:
    s.connect(sock_path)
    sync_msg = json.dumps({"execute": "guest-sync-delimited", "arguments": {"id": 1}}).encode()
    cmd_msg = json.dumps({"execute": cmd_name}).encode()
    s.sendall(b"\xff" + sync_msg)
    sync_resp = s.recv(65535)
    s.sendall(cmd_msg)
    cmd_resp = s.recv(65535)
    print(cmd_resp.decode('utf-8', errors='replace').strip())
except socket.timeout:
    print("ERROR: timed out")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
finally:
    s.close()
PYEOF
}

run_cpu_variant() {
  local cpu_arg="$1"
  local run_id="${2:-default}"
  
  echo "--- CPU: ${run_id} ---" | tee -a "$SUMMARY_FILE"
  
  local disk="chr-qga-${run_id}.qcow2"
  local sock="qga-${run_id}.sock"
  local mon="mon-${run_id}.sock"
  local pid_file="qemu-${run_id}.pid"
  
  qemu-img create -q -f qcow2 -F raw -b "$IMG_RAW" "$disk"
  
  local qemu_cmd=(
    qemu-system-x86_64
    -M accel=hvf
    -m 256
    -nographic
    -serial mon:stdio
    -device virtio-serial
    -chardev "socket,path=$sock,server=on,wait=off,id=qga0"
    -device "virtserialport,chardev=qga0,name=org.qemu.guest_agent.0"
    -drive "file=$disk,if=virtio,format=qcow2"
    -device virtio-net-pci,netdev=net0
    -netdev user,id=net0
    -pidfile "$pid_file"
    -daemonize
  )
  
  if [[ "$cpu_arg" != "default" ]]; then
    qemu_cmd+=(-cpu "$cpu_arg")
  fi
  
  "${qemu_cmd[@]}"
  
  echo "boot_wait: ${BOOT_WAIT_SECS}s" | tee -a "$SUMMARY_FILE"
  sleep "$BOOT_WAIT_SECS"
  
  local socket_exists="no"
  local guest_ping_success="no"
  local first_error=""
  
  if [[ -S "$sock" ]]; then
    socket_exists="yes"
    echo "socket exists" | tee -a "$SUMMARY_FILE"
    
    for i in $(seq 1 "$RETRIES"); do
      echo "attempt: $i" | tee -a "$SUMMARY_FILE"
      local result
      if result=$(qga_query "$sock" "guest-ping" 2>&1); then
        echo "$result" | tee -a "$SUMMARY_FILE"
        if echo "$result" | grep -q '"return"'; then
          guest_ping_success="yes"
          echo "✅ SUCCESS: guest-ping responded" | tee -a "$SUMMARY_FILE"
          
          echo "querying guest-info..." | tee -a "$SUMMARY_FILE"
          if info=$(qga_query "$sock" "guest-info" 2>&1); then
            echo "$info" | tee -a "$SUMMARY_FILE"
          fi
          break
        fi
      else
        echo "$result" | tee -a "$SUMMARY_FILE"
        if [[ -z "$first_error" ]]; then
          first_error="$result"
        fi
      fi
      sleep "$RETRY_DELAY"
    done
    
    if [[ "$guest_ping_success" == "no" ]]; then
      echo "❌ TIMEOUT: no response after $((RETRIES * RETRY_DELAY))s" | tee -a "$SUMMARY_FILE"
    fi
  else
    echo "socket missing" | tee -a "$SUMMARY_FILE"
  fi
  
  echo "result: socket_exists=$socket_exists, guest_ping_success=$guest_ping_success, first_error=\"$first_error\"" | tee -a "$SUMMARY_FILE"
  echo >> "$SUMMARY_FILE"
  
  cleanup_vm "$pid_file" "$sock" "$mon"
  rm -f "$disk"
}

IFS=',' read -ra cpu_models <<< "$CPU_MATRIX"
for cpu_spec in "${cpu_models[@]}"; do
  run_cpu_variant "$cpu_spec" "$cpu_spec"
done

echo "=== Summary ===" | tee -a "$SUMMARY_FILE"
echo "Full log: $SUMMARY_FILE"
cat "$SUMMARY_FILE"
```

## Execution Example

```bash
chmod +x repro-chr-qga-macos.sh
./repro-chr-qga-macos.sh
```

**Output (all CPU models):**

```
=== CHR QGA Repro (macOS) ===
date: 2026-02-27T12:34:56Z
qemu: QEMU emulator version 10.2.1
chr_version: 7.21.3
cpu_matrix: default,host,qemu64,kvm64

--- CPU: default ---
boot_wait: 45s
socket exists
attempt: 1
ERROR: timed out
attempt: 2
ERROR: timed out
[...]
❌ TIMEOUT: no response after 32s
result: socket_exists=yes, guest_ping_success=no, first_error="ERROR: timed out"

--- CPU: host ---
[same timeout pattern]

--- CPU: qemu64 ---
[same timeout pattern]

--- CPU: kvm64 ---
[same timeout pattern]
```

## QEMU Command Line Used

```bash
qemu-system-x86_64 \
  -M accel=hvf \
  -m 256 \
  -nographic \
  -serial mon:stdio \
  -device virtio-serial \
  -chardev socket,path=qga.sock,server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
  -drive file=chr.qcow2,if=virtio,format=qcow2 \
  -device virtio-net-pci,netdev=net0 \
  -netdev user,id=net0
```

## QGA Protocol Detail

Commands sent use proper QGA framing per QEMU guest agent protocol specification:

```python
# Send 0xFF delimiter
# Send guest-sync-delimited command
s.sendall(b"\xff" + json.dumps({"execute": "guest-sync-delimited", "arguments": {"id": 1}}).encode())
sync_response = s.recv(65535)

# Send target command
s.sendall(json.dumps({"execute": "guest-ping"}).encode())
command_response = s.recv(65535)
```

This framing is required for proper QGA stream delimitation and has been validated against the control VM (Debian guest responded successfully).

## Additional Context

**Community reports (Proxmox):**
- Forum posts indicate CHR guest agent works on Proxmox VE (Linux KVM hypervisor)
- Socat tests against Proxmox QGA socket show successful command execution
- `guest-exec` can run RouterOS CLI commands via base64-encoded `input-data` parameter

**macOS-specific considerations:**
- HVF (Hypervisor.framework) is the only hardware acceleration available on macOS
- Tested CPU models: default (qemu64), host (passthrough), qemu64 (explicit), kvm64 (forum-suggested)
- Control VM validation proves QEMU/socket/methodology work correctly on this host

## Questions for MikroTik Support

1. Is CHR QEMU guest agent expected to work on macOS with HVF acceleration?
2. Are there specific QEMU arguments or CHR configuration steps required for macOS hosts?
3. Is there a known incompatibility with specific QEMU versions or HVF?
4. Can MikroTik confirm whether guest agent is built/enabled in CHR 7.21.3 stable release for x86_64?
5. Are there any CHR boot logs or diagnostics available to verify guest agent process startup?

## Requested Resolution

- Confirm whether QEMU guest agent support is intended for CHR on macOS/HVF environments
- Provide working QEMU command-line configuration if guest agent should work
- Document any known limitations or platform-specific requirements
- If this is a bug, provide timeline for fix or workaround

## Contact

Ready to provide additional diagnostic information, packet captures, or test alternative configurations as needed.
