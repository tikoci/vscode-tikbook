#!/bin/bash
set -euo pipefail

# CHR QEMU Guest Agent Test Script
# Purpose: Test MikroTik CHR guest agent directly with QEMU (bypassing UTM)
# This eliminates UTM as a variable and proves whether CHR's guest agent works

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="${SCRIPT_DIR}/../.tmp/chr-qemu-test"
CHR_VERSION="${CHR_VERSION:-7.21.3}"
ARCH="x86_64"  # Intel Mac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[+]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    local missing=()
    
    if ! command -v qemu-system-x86_64 &> /dev/null; then
        missing+=("qemu")
    fi
    
    if ! command -v socat &> /dev/null; then
        missing+=("socat")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing+=("curl")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        error "Missing required tools: ${missing[*]}"
        echo ""
        echo "Install with homebrew:"
        echo "  brew install ${missing[*]}"
        exit 1
    fi
    
    log "All prerequisites found"
    qemu-system-x86_64 --version | head -1
}

# Download CHR image from MikroTik
download_chr() {
    log "Setting up work directory..."
    mkdir -p "$WORK_DIR"
    cd "$WORK_DIR"
    
    local chr_file="chr-${CHR_VERSION}.img"
    local chr_url="https://download.mikrotik.com/routeros/${CHR_VERSION}/chr-${CHR_VERSION}.img.zip"
    
    if [ -f "$chr_file" ]; then
        log "CHR image already exists: $chr_file"
        return 0
    fi
    
    log "Downloading CHR ${CHR_VERSION} from MikroTik..."
    curl -L -o "chr-${CHR_VERSION}.img.zip" "$chr_url"
    
    log "Extracting image..."
    unzip -o "chr-${CHR_VERSION}.img.zip"
    
    if [ ! -f "$chr_file" ]; then
        error "Failed to extract CHR image"
        exit 1
    fi
    
    log "CHR image ready: $chr_file"
}

# Create overlay disk (don't modify original)
create_overlay() {
    log "Creating disk overlay..."
    local overlay_file="chr-overlay.qcow2"
    
    if [ -f "$overlay_file" ]; then
        warn "Removing old overlay..."
        rm "$overlay_file"
    fi
    
    qemu-img create -f qcow2 -b "chr-${CHR_VERSION}.img" -F raw "$overlay_file"
    log "Overlay created: $overlay_file"
}

# Create PID file for tracking
PID_FILE="$WORK_DIR/qemu.pid"
SOCKET_FILE="$WORK_DIR/qga.sock"
MONITOR_FILE="$WORK_DIR/qemu-monitor.sock"

# Cleanup function
cleanup() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log "Stopping QEMU (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 2
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    rm -f "$SOCKET_FILE" "$MONITOR_FILE"
}

# Start QEMU with guest agent configuration
start_qemu() {
    log "Starting QEMU with guest agent support..."
    
    # Clean up any existing instances
    cleanup
    
    local overlay_file="chr-overlay.qcow2"
    
    # QEMU command with guest agent setup
    # Key arguments:
    #   -device virtio-serial: virtio-serial bus for guest communication
    #   -chardev socket: create Unix socket for guest agent protocol
    #   -device virtserialport: connect chardev to guest agent name
    qemu-system-x86_64 \
        -name "chr-guest-agent-test" \
        -M accel=hvf \
        -cpu host \
        -smp 2 \
        -m 256 \
        -drive file="$overlay_file",format=qcow2,if=virtio \
        -device virtio-net,netdev=net0 \
        -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8728-:8728 \
        -device virtio-serial \
        -chardev socket,path="$SOCKET_FILE",server=on,wait=off,id=qga0 \
        -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
        -monitor unix:"$MONITOR_FILE",server,nowait \
        -display none \
        -daemonize \
        -pidfile "$PID_FILE"
    
    # Wait for PID file to be written
    sleep 2
    local qemu_pid=$(cat "$PID_FILE" 2>/dev/null || echo "unknown")
    
    log "QEMU started (PID: $qemu_pid)"
    log "Socket: $SOCKET_FILE"
    log "Monitor: $MONITOR_FILE"
    log ""
    warn "Wait for CHR to boot (usually 30-40 seconds)..."
    log ""
}

# Test guest agent
test_guest_agent() {
    log "Testing QEMU guest agent..."
    
    if [ ! -S "$SOCKET_FILE" ]; then
        error "Guest agent socket not found: $SOCKET_FILE"
        error "Make sure QEMU is running and CHR has booted"
        return 1
    fi
    
    log "Sending guest-info command..."
    local response=$(echo '{"execute":"guest-info"}' | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1)
    
    if echo "$response" | grep -q '"return"'; then
        log "✓ Guest agent responded!"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        error "Guest agent did not respond properly"
        echo "Response: $response"
        return 1
    fi
}

# Test network interfaces query
test_network_interfaces() {
    log "Querying network interfaces..."
    
    local response=$(echo '{"execute":"guest-network-get-interfaces"}' | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1)
    
    if echo "$response" | grep -q '"return"'; then
        log "✓ Network interfaces query successful!"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        return 0
    else
        warn "Network interfaces query failed"
        echo "Response: $response"
        return 1
    fi
}

# Execute RouterOS command via guest agent
test_guest_exec() {
    log "Testing guest-exec (execute RouterOS command)..."
    
    # Encode ":put [/system identity get name]" in base64
    local cmd_b64=$(echo -n ":put [/system identity get name]" | base64)
    
    local request='{"execute":"guest-exec","arguments":{"path":"/bin/sh","arg":["-c","echo '"$cmd_b64"' | base64 -d | /nova/bin/rscript"],"capture-output":true}}'
    
    log "Sending command..."
    local response=$(echo "$request" | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1)
    
    if echo "$response" | grep -q '"return"'; then
        log "✓ guest-exec command sent!"
        echo "$response" | jq . 2>/dev/null || echo "$response"
        
        # Extract PID to get output
        local pid=$(echo "$response" | grep -o '"pid":[0-9]*' | cut -d: -f2)
        if [ -n "$pid" ]; then
            log "Getting command output (PID: $pid)..."
            sleep 1
            local output_request='{"execute":"guest-exec-status","arguments":{"pid":'"$pid"'}}'
            local output=$(echo "$output_request" | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1)
            echo "$output" | jq . 2>/dev/null || echo "$output"
        fi
        return 0
    else
        warn "guest-exec failed"
        echo "Response: $response"
        return 1
    fi
}

# Interactive mode
interactive_mode() {
    log "Entering interactive guest agent test mode..."
    log "Socket: $SOCKET_FILE"
    log ""
    log "Try these commands:"
    echo '  echo '"'"'{"execute":"guest-info"}'"'"' | socat - UNIX-CONNECT:'"$SOCKET_FILE"
    echo '  echo '"'"'{"execute":"guest-network-get-interfaces"}'"'"' | socat - UNIX-CONNECT:'"$SOCKET_FILE"
    echo '  echo '"'"'{"execute":"guest-ping"}'"'"' | socat - UNIX-CONNECT:'"$SOCKET_FILE"
    log ""
    log "Press Ctrl+C to exit"
    log ""
    
    while true; do
        read -r -p "QMP> " cmd
        if [ -n "$cmd" ]; then
            echo "$cmd" | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1 | jq . 2>/dev/null || echo "$cmd" | socat - UNIX-CONNECT:"$SOCKET_FILE" 2>&1
        fi
    done
}

# Main execution
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  MikroTik CHR QEMU Guest Agent Test                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    
    case "${1:-start}" in
        start)
            # Don't cleanup on exit for start command
            trap - EXIT
            check_prerequisites
            download_chr
            create_overlay
            start_qemu
            log ""
            log "═══════════════════════════════════════════════════════════"
            log "QEMU is running in background"
            log ""
            log "Wait 30-40 seconds for CHR to boot, then run:"
            echo "  $0 test"
            log ""
            log "To stop QEMU:"
            echo "  $0 stop"
            log "═══════════════════════════════════════════════════════════"
            ;;
        
        test)
            cd "$WORK_DIR"
            log "Testing guest agent (waiting 5 seconds for socket)..."
            sleep 5
            
            test_guest_agent
            echo ""
            test_network_interfaces
            echo ""
            test_guest_exec
            
            log ""
            log "═══════════════════════════════════════════════════════════"
            log "Test complete!"
            log ""
            log "For interactive testing:"
            echo "  $0 interactive"
            log "═══════════════════════════════════════════════════════════"
            ;;
        
        interactive)
            cd "$WORK_DIR"
            interactive_mode
            ;;
        
        stop)
            cd "$WORK_DIR"
            cleanup
            log "QEMU stopped"
            ;;
        
        clean)
            warn "Cleaning up all test files..."
            cleanup
            rm -rf "$WORK_DIR"
            log "Cleaned: $WORK_DIR"
            ;;
        
        *)
            echo "Usage: $0 {start|test|interactive|stop|clean}"
            echo ""
            echo "Commands:"
            echo "  start       - Download CHR and start QEMU with guest agent"
            echo "  test        - Run automated guest agent tests"
            echo "  interactive - Interactive guest agent testing"
            echo "  stop        - Stop QEMU"
            echo "  clean       - Remove all test files"
            exit 1
            ;;
    esac
}

# Trap Ctrl+C (but not EXIT by default - will be disabled for start command)
trap cleanup INT TERM

main "$@"
