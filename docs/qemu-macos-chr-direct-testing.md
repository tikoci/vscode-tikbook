# QEMU on macOS for MikroTik CHR: Direct Testing Notes

Date: 2026-02-27

## Why this document exists

This captures practical command-line learnings for running CHR directly with Homebrew QEMU on Intel macOS (outside UTM), plus what was required to produce reproducible guest-agent evidence.

## Environment

- Host: macOS Intel
- QEMU: Homebrew `qemu` 10.2.1
- CHR tested: `7.21.3`
- Accelerator: `hvf`

## Minimal QEMU pattern for CHR + QGA channel

```bash
qemu-system-x86_64 \
  -M accel=hvf \
  -smp 2 \
  -m 512 \
  -drive file=chr-overlay.qcow2,format=qcow2,if=virtio \
  -device virtio-net,netdev=net0 \
  -netdev user,id=net0 \
  -device virtio-serial \
  -chardev socket,path=qga.sock,server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0 \
  -display none -daemonize -pidfile qemu.pid
```

## CPU model matrix tested

Forum clue tested: "Did you change CPU type to Default (`kvm64`)?"

CPU values tested in direct QEMU runs:

- `default` (no explicit `-cpu`)
- `host`
- `qemu64`
- `kvm64`

Result in this environment: all four produced the same CHR guest-agent non-response outcome.

## Important protocol detail (critical)

QGA socket probing should use proper framing to avoid false negatives:

1. Send `0xFF` delimiter
2. Send `guest-sync-delimited`
3. Send target command (`guest-ping`, `guest-info`, etc.)

Simple one-shot raw JSON writes can be misleading depending on stream state.

## Control validation on same host

A non-CHR control VM (Debian cloud image with `qemu-guest-agent`) was tested with the same host/QEMU/socket approach and responded successfully to:

- `guest-ping`
- `guest-info`

This validates host-side QEMU wiring and query methodology.

## First-boot RouterOS automation caveat

For REST fallback workflows that rely on initial RouterOS CLI setup, account for first-boot interactive prompt:

- `Do you want to see the software license? [Y/n]:`

Until handled, automated custom IP/REST setup commands may not run.

## Scripts in this repo

- `scripts/repro-chr-qga-macos.sh`:
  - Minimal MikroTik-focused repro script
  - Includes CPU matrix and reproducible summary output
- `scripts/control-qga-ubuntu-macos.sh`:
  - Control script validating QGA method on non-CHR guest

## Research extraction notes (MikroTik sites)

- MikroTik docs site: Atlassian Confluence (`help.mikrotik.com`)
  - Query by section names (`Guest tools`, `KVM`) to avoid page-tree noise
- MikroTik forum: Discourse (`forum.mikrotik.com`)
  - Query by post chronology, version mentions, and exact quoted clues
