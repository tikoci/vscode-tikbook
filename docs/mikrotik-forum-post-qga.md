# Forum Post: CHR QEMU Guest Agent on macOS

**Subject:** CHR guest agent not responding on macOS/QEMU - anyone got this working?

---

I've been trying to get QEMU guest agent working with CHR on macOS (Intel, Homebrew QEMU 10.2.1, HVF acceleration) and I'm seeing consistent timeouts despite proper virtio-serial configuration.

**Setup:**
- CHR 7.21.3 stable
- Standard virtio-serial device + Unix socket
- Channel name: `org.qemu.guest_agent.0` (per QEMU conventions)
- Proper QGA protocol framing (`guest-sync-delimited` with `0xFF` prefix)

**Result:**
Socket gets created, VM boots fine, but `guest-ping` never responds. Tested with CPU models default/host/qemu64/kvm64 after seeing the CPU suggestion in another thread - no difference.

I validated the whole test harness with a Debian cloud image as a control - it responds immediately with full `guest-info` output. So the QEMU/socket/methodology is correct.

MikroTik docs (CHR → Guest tools → KVM) explicitly list guest agent as supported with `guest-info`, `guest-network-get-interfaces`, `guest-file-*`, and `guest-exec` commands. I've seen forum reports of this working on Proxmox, but I'm wondering if there's something specific to macOS/HVF that breaks it.

**Has anyone successfully used CHR guest agent on macOS with QEMU?** Or is this a Linux-only thing despite the docs not mentioning platform restrictions?

---

For anyone wanting to reproduce, here's a minimal test script:

```bash
#!/usr/bin/env bash
set -euo pipefail

CHR_VERSION="7.21.3"
WORK_DIR="$HOME/.cache/chr-qga-test"

mkdir -p "$WORK_DIR" && cd "$WORK_DIR"

# Download CHR if needed
if [[ ! -f "chr-${CHR_VERSION}.img" ]]; then
  curl -fL -o "chr-${CHR_VERSION}.img.zip" \
    "https://download.mikrotik.com/routeros/${CHR_VERSION}/chr-${CHR_VERSION}.img.zip"
  unzip "chr-${CHR_VERSION}.img.zip"
fi

# Create test disk
qemu-img create -f qcow2 -F raw -b "chr-${CHR_VERSION}.img" test.qcow2

# Start VM with guest agent channel
qemu-system-x86_64 \
  -M accel=hvf \
  -m 256 \
  -nographic \
  -device virtio-serial \
  -chardev socket,path=qga.sock,server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
  -drive file=test.qcow2,if=virtio \
  -device virtio-net-pci,netdev=net0 \
  -netdev user,id=net0 \
  -pidfile qemu.pid \
  -daemonize

echo "Waiting 45s for boot..."
sleep 45

# Test guest-ping with proper QGA protocol
python3 - qga.sock <<'PYEOF'
import socket, json, sys
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(4)
try:
    s.connect(sys.argv[1])
    # Send 0xFF + guest-sync-delimited first
    sync_msg = json.dumps({"execute": "guest-sync-delimited", "arguments": {"id": 1}}).encode()
    s.sendall(b"\xff" + sync_msg)
    sync_resp = s.recv(65535)
    # Now send guest-ping
    s.sendall(json.dumps({"execute": "guest-ping"}).encode())
    resp = s.recv(65535)
    print(resp.decode('utf-8'))
except socket.timeout:
    print("ERROR: timeout waiting for guest-ping response")
    sys.exit(1)
finally:
    s.close()
PYEOF

# Cleanup
kill $(cat qemu.pid) 2>/dev/null || true
rm -f qga.sock qemu.pid test.qcow2
```

On my setup this times out every time. With a Debian cloud image swapped in, it responds instantly with `{"return": {}}`.

Curious if I'm missing something obvious or if this is genuinely broken on macOS. Would appreciate any insights from folks who've gotten this to work.

---

**Update:** I should mention that I've confirmed the socket file exists (`qga.sock`) and CHR is definitely booted and accessible via serial console. The guest agent just never talks back through the socket.
