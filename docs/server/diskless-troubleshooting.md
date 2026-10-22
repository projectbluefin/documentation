---
mdx:
  format: md
title: "Diskless Boot Troubleshooting"
slug: /server/diskless-troubleshooting
description: "Diagnose diskless boot failures, size RAM, retain logs, and avoid destructive Ignition settings."
---

# Diskless Boot Troubleshooting

## What a failing node prints

An initrd failure prints failed units, hints, recent journal errors and network
state on the monitor and serial console, waits **60 seconds**, then reboots.
There is no emergency shell: root is locked. Fix the network, server or config
and the next attempt can recover unattended.

To keep the summary visible longer, supply the `bluefin.failure_delay` system
credential (10–86400 seconds) through SMBIOS type 11, QEMU fw_cfg, or the ESP's
`/loader/credentials/bluefin.failure_delay.cred`. A `bluefin.failure_delay=`
kernel argument overrides it only without Secure Boot's command-line lock.
The minimum delay is 10 seconds.

## Minimum RAM

The entire DDI stays in `/run/machines` throughout the boot, backing `/usr`.
`/run` is tmpfs capped at 20% of RAM. The DDI **plus 64 MiB** must fit in both
free `/run` space and `MemAvailable`; allow roughly five times that combined
size in usable RAM, plus workload memory. For the 540 MiB `26.09.x` image,
plan on **4 GiB plus the workload**. QEMU with 3072 MiB assigned was refused;
3584 MiB booted. Requirements grow with image size.

The pre-download HEAD check stops a boot only when a successful response's
`Content-Length` proves the image cannot fit. Missing size, HTTP errors
(including signed URLs refusing HEAD) or no response produce
`cannot check that the OS image fits in RAM ...; downloading it anyway`.
A later download failure is still fatal and goes straight to the summary,
without waiting for the 300-second `/usr` device timeout.

## Failure modes

| Console summary | Check / action |
| --- | --- |
| `systemd-networkd-wait-online.service`: no routable link | Check carrier and DHCP. Timeout is 300 seconds. |
| `no network interface found` | NIC driver is missing from the initrd; the image needs its driver. |
| `systemd-import@...service`: `Transfer failed` | Check routing and boot-server availability. |
| HTTP 404 downloading the DDI | Put the DDI beside the netboot UKI, or fix the `import.pull` URL. |
| `NOT ENOUGH RAM FOR A DISKLESS BOOT` | Add RAM; see [Minimum RAM](#minimum-ram). |
| Import checksum/signature failure | Check interrupted downloads, DDI/checksum mismatch, missing `SHA256SUMS.gpg`, or an untrusted signing key. Keep one release's files together. |
| `systemd-veritysetup@usr.service` or `sysusr-usr.mount` | UKI and DDI versions differ; the DDI does not match the UKI's `usrhash=`. |
| `No unit failed: a device or job timed out` | A required device did not appear within the 300-second timeout. |
| `bluefin-ignition-credentials.service` | Read its journal reason: bad signature, signature HTTP/curl error, unreadable keyring, or unsigned config without permission. See [config trust rules](/server/booty-integration#per-node-configuration). |
| `ignition-<stage>.service` | Check config support and repeat-boot safety below. |

## Getting logs from a diskless node

Every boot gets a fresh machine ID and RAM journal; logs disappear on reboot
unless provisioned otherwise.

- **Initrd failures:** capture the monitor, serial (`ttyS0`, 115200), IPMI
  serial-over-LAN or BMC console log. `netconsole=` cannot be added to the
  signed command line, so it cannot capture initrd failures here.
- **Persistent logs after switch-root:** provision a `/var` disk with Ignition
  ([example](https://github.com/projectbluefin/server/blob/main/tests/fixtures/ignition/var-on-disk.ign)).
  `/var/log/journal` is created automatically. Each boot uses its own machine
  ID; read across them with:

  ```bash
  journalctl -D /var/log/journal --list-boots
  journalctl -D /var/log/journal -b -1
  ```

- **Stable machine ID:** do not write `/etc/machine-id` through Ignition; it
  suppresses first-boot vendor presets, so preset-only services stop starting.
  Use the `system.machine_id` credential (32 hex digits, or `firmware` for the
  SMBIOS UUID) instead. Explicit Ignition unit selections work independently.
- **Remote logs:** write `/etc/systemd/journal-upload.conf` with `[Upload]`
  and `URL=`, then enable `systemd-journal-upload.service` through Ignition.
  Send to a `systemd-journal-remote` collector. This starts after switch-root
  and cannot capture initrd failures.

## Ignition

Supply `ignition.config` or `ignition.config.url` as system credentials, or
serve `bluefin-node.ign` beside the netboot UKI under the
[Booty signature rules](/server/booty-integration#per-node-configuration).
`ignition.*` kernel arguments are **ignored**, with a console warning naming
the arguments, not their values. The signed UKI locks the command line.

Stages run in order: `fetch-offline`, network `fetch` when needed, `disks`,
`mount`, `files`, `umount`. There is no `kargs` stage.

| Config section | Support |
| --- | --- |
| `ignition.config.merge` / `replace`, `timeouts`, `security.tls` | Yes; remote content must follow the signature/hash rules above. |
| `storage.disks` | Yes, using `sgdisk`. |
| `storage.filesystems` | `xfs`, `ext4`, `vfat`, `swap`; not `btrfs`. |
| `storage.luks` | Key files only; no Clevis TPM2/Tang. |
| `storage.raid` | No; `mdadm` is absent. |
| `storage.files`, `directories`, `links` | Yes. |
| `systemd.units` contents, drop-ins, `enabled` | Yes, including with an existing machine ID. |
| `passwd.users`, `passwd.groups` | Yes. |
| `kernelArguments` | No; silently unapplied. |

**Ignition runs every boot. Destructive disk settings repeat every boot too.**

- Keep `wipeTable: false` and `wipePartitionEntry: false`. Existing partitions
  must match the configured number, label, size and type, or the disks stage fails.
- Use `wipeFilesystem: false` to reuse a filesystem matching the format and any
  specified label/UUID. A mismatch fails; `true` **erases it on every boot**.
- Set `"overwrite": true` for files with contents at paths that may already
  exist, including persistent files and files from factory `/etc`. The default
  `false` fails the files stage when the path exists.

Ignition applies unit selections before switch-root without changing unrelated
local enablement or masks. On installed nodes, enable selections apply when
new or changed, so a later operator disable persists until that selection
changes. An Ignition **disable** is enforced every boot, overriding a later
operator enable and earlier vendor presets. Diskless nodes reapply all
selections to fresh `/etc`; missing or masked units are retried next boot.

## See also

- [Boot, install and update](/server/ddi-installer).
- [Upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/diskless-troubleshooting.md) — diagnostics, unit-preset implementation and tests.
- [Build and test workflow](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer-build.md).
