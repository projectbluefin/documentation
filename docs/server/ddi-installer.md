---
mdx:
  format: md
title: "Boot, Install, and Update"
slug: /server/ddi-installer
description: "Boot Bluefin Server diskless, install it to disk, and manage updates and rollback."
---

<a id="boot-install-and-update-architecture"></a>

# Boot, Install, and Update

Bluefin Server boots a signed unified kernel image (UKI) and a read-only,
dm-verity-checked `/usr`. Diskless nodes keep the OS in RAM; installed nodes
have A/B OS slots and a persistent XFS root.

<a id="one-build-one-version-one-release-set"></a>

## Release files

Keep the UKI, OS image and signed checksums from the **same release** together.

| File | Use |
| --- | --- |
| `bluefin-server_<ver>.raw` | OS disk image (DDI), downloaded into RAM for diskless boot; also the diskless install source. |
| `bluefin-server-netboot_<ver>.efi` | Network boot UKI. |
| `bluefin-server-netboot_<ver>.esp.raw` | USB netboot image, including systemd-boot and Secure Boot enrollment keys. |
| `bluefin-server-installer_<ver>.raw` | [Offline USB installer](/server/usb-installer). |
| `bluefin-server-<ver>.efi` and `*.usr.raw` / `*.usr-verity.raw` | Installed-disk UKI and A/B update payloads. |
| `SHA256SUMS`, `SHA256SUMS.gpg` | Release checksums and their GPG signature. |
| Sysext assets | Optional features; see [system extensions](/server/systemd-sysext-extensions). |

## The boot chain

Secure Boot verifies systemd-boot and the UKI. The signed UKI fixes the kernel
command line, including `usrhash=`; dm-verity checks `/usr` against that hash.
`lockdown=integrity` is always enabled. See [Secure Boot keys](/server/secure-boot-keys)
and [release verification](/server/systemd-sysupdate-verification).

### Shim path (`-o shim True`, off by default)

Optional shim builds are **not an enrollment-free boot path**. Shim is not yet
Microsoft-signed; firmware must still trust the Bluefin db. Installed disks
boot systemd-boot directly, and UEFI HTTP Boot loads the UKI directly, bypassing
shim. Build details are in the [upstream boot reference](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer.md#the-boot-chain).

### Diskless (netboot UKI)

The initrd brings up DHCP, downloads `bluefin-server_<ver>.raw` into RAM,
verifies its signed checksums, opens its `/usr` through dm-verity, then boots
with a tmpfs root. `/etc` is recreated from image defaults on every boot;
provision persistent state separately.

The download URL comes from the UEFI HTTP boot origin (`bootorigin:`) or an
`import.pull` system credential supplied through SMBIOS type 11, QEMU fw_cfg,
or the ESP's `/loader/credentials/`. The image directory must also serve
`SHA256SUMS` and `SHA256SUMS.gpg`. A modified image or unsigned replacement
manifest is refused.

The initrd checks available RAM before downloading. On failure it prints a
summary to all consoles and reboots, not to an emergency shell. See
[diskless troubleshooting](/server/diskless-troubleshooting) for RAM sizing,
network errors and logs.

### UEFI HTTP boot

Firmware loads the netboot UKI directly, without systemd-boot. It must
**already trust the Bluefin DB key**: this path cannot enroll keys. The initrd
uses the UKI's directory for the DDI, signed checksums and optional
`bluefin-node.ign`. [Booty configuration rules](/server/booty-integration#per-node-configuration)
control whether that node config is accepted.

### Installed disk (disk UKI)

systemd-boot loads the disk UKI, which selects the matching `/usr` slot by
partition label and verity-derived UUIDs. GPT auto-discovery finds the persistent
XFS root. `/etc` persists across A/B updates, unlike a diskless node's `/etc`.

Updated UKIs get three boot attempts (`bluefin-server-<ver>+3-0.efi`). After
three failures, systemd-boot selects the previous UKI on the next boot.

## Installing to disk

Both paths use `systemd-sysinstall`: an ESP, copied `/usr` and verity slot A,
an empty slot B, and a persistent XFS root. The first installed boot creates
slot B and the root partition. See the [upstream layout reference](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer.md#installing-to-disk)
for repart definitions.

### From the USB installer (offline)

Follow the [USB installer runbook](/server/usb-installer). It includes disk
selection, erasure confirmation, Secure Boot enrollment and provisioning.

### From a diskless node

**Check the target device carefully. Installation can erase its contents.**
Use an empty disk. For a nonempty target, first run `partx --delete /dev/sdX`
to remove its partition devices from the kernel; this does not change disk
contents. systemd-repart v261 otherwise fails with `Device or resource busy`
after wiping the disk. The USB installer handles this automatically.

Run as root, replacing `/dev/sdX` with the target:

```bash
systemctl start run-bluefin-boot.mount
kernel="$(ls /run/bluefin/boot/EFI/Linux/bluefin-server-[0-9]*.efi)"
systemd-sysinstall --kernel="${kernel}" \
    --definitions=/run/bluefin/boot/bluefin/repart.d /dev/sdX
```

On older images, `Failed to resolve automatic CopyBlocks= path for partition
type usr` means a merged system extension hides the source block device. Run
`systemd-sysext unmerge` and retry.

## Updates

Installed nodes use `systemd-sysupdate`: it fills the inactive `/usr` and
verity slots and adds the new UKI, retaining two UKIs. Downloads require the
GPG-signed `SHA256SUMS`. List optional extensions with `updatectl features`;
for example, `updatectl enable zfs` includes ZFS in subsequent OS updates.
Image-locked extensions retain two versions, so rollback keeps the matching
extension. k0s and NVIDIA Container Toolkit update separately; see
[update verification](/server/systemd-sysupdate-verification).

### Automatic updates on installed nodes

Updates run 15 minutes after boot and then every two hours, with randomized
delay. The nightly reboot timer runs at 04:10 with randomized delay and reboots
only for a staged newer version. Run `systemd-sysupdate update` for a manual
update. Console and SSH banners show the running version, last check, staged
version and last error.

**Boot health and rollback:** a counted boot is blessed only after reaching
`multi-user.target` with no failed units (`boot-complete.target`). Update
checks wait until that judgment, so an unreachable update server does not
make a healthy boot fail.

If a counted boot is still unblessed after 15 minutes,
`bluefin-boot-deadline.timer` logs failed units and requests a reboot, even
when boot hangs before `multi-user.target`. Three failed attempts select the
previous UKI. A last attempt reboots only if another UKI is available, avoiding
a loop with no fallback. To change the deadline, use a timer drop-in:

```ini
[Timer]
OnBootSec=
OnBootSec=30min
```

After rollback, the failed version may still appear in `systemd-sysupdate pending`.
`bluefin-update-pending` blocks nightly and kured reboots into a UKI with no
tries left. A newer release replaces it and clears the block.

**Reboot holds and Kubernetes:**

- `/run/reboot-lock` holds automatic reboot until the next boot;
  `/etc/reboot-lock` holds it until removed. Both also prevent the deadline
  from setting the kured flag. Kured does not read these files itself.
- Running kubelet or k0s suppresses the nightly reboot. Updates set
  `/run/reboot-required`; kured must cordon, drain and reboot the node.
  Without kured, reboot it yourself.
- During deadline recovery, starting/running/stopping Kubernetes also uses
  kured. If its unit is stopped or failed, the node cannot drain or run kured
  and reboots directly.

**Fleet reboot lock:** non-Kubernetes hosts can take turns through a
[FleetLock server](https://coreos.github.io/zincati/development/fleetlock/protocol/).
Create `/etc/bluefin/reboot-lock.conf`:

```ini
URL=https://<fleetlock-host>/
GROUP=web
```

The system credentials `bluefin.reboot-lock.url` and
`bluefin.reboot-lock.group` override the file; the group defaults to `default`.
Without a URL, no fleet lock is used.

- Nightly reboot requires HTTP 200 from the lock server. Refusal or a network
  error skips that run. Extra attempts run at 04:40 and 05:10, each randomized
  by up to 30 minutes, when the file or a URL credential received by PID 1
  exists. A URL only in `/etc/credstore` gets the single nightly attempt.
- The boot deadline retries a refused slot every five minutes. If the server
  is unreachable, it reboots without a slot because the failed image may have
  broken networking. A node keeps its slot through boot retries and rollback.
- The slot is released after a healthy (`good` or `clean`) boot, with retries
  from one minute up to one hour. An unblessed node retains its slot and holds
  back the group. Find its client ID in the reboot-lock journal and release
  a stuck slot if necessary:

  ```bash
  curl -H 'fleet-lock-protocol: true' \
    -d '{"client_params":{"id":"<id>","group":"<group>"}}' \
    https://<fleetlock-host>/v1/steady-state
  ```

**Opt out:** `systemctl disable --now systemd-sysupdate-reboot.timer` stages
updates without nightly reboot. Disable `systemd-sysupdate.timer` too to stop
automatic updates. Opt-outs survive updates. Presets apply only on first boot;
to enable this policy on an older installation, run once:

```bash
systemctl preset systemd-sysupdate.timer systemd-sysupdate-reboot.timer \
  systemd-boot-check-no-failures.service bluefin-boot-deadline.timer
```

### Diskless and installer boots

These boots have no A/B slots; OS update/reboot units and timers are disabled.
A diskless node updates by rebooting into the release served by its boot server.

`bluefin-diskless-update-check.timer` checks signed checksums five minutes after
boot and then hourly. A newer release sets `/run/reboot-required` only if the
next boot can actually select it, such as Booty's fixed-name
`bluefin-server-netboot.efi`. A versioned UKI or explicit versioned DDI URL is
**pinned**: repoint the boot origin first. Network/signature errors are logged;
the check never reboots or fails the unit. Kured handles Kubernetes reboots;
other nodes need an operator or fleet tooling:

```bash
test -e /run/reboot-required
journalctl -u bluefin-diskless-update-check
```

## Ignition (opt-in)

Supply `ignition.config` (inline JSON or Butane YAML) or `ignition.config.url`
as a **system credential**, not a kernel argument. With neither credential,
network boots may use `bluefin-node.ign` beside the UKI, subject to
[config signature rules](/server/booty-integration#per-node-configuration).
No config means Ignition does not run.

Ignition runs on every boot; keep persistent disk operations idempotent.
See [supported settings and safety rules](/server/diskless-troubleshooting#ignition).

## PXE / HTTP boot service

[Booty](/server/booty-integration) serves releases, per-node configs and optional
disk installs. Without Booty, write `bluefin-server-netboot_<ver>.esp.raw` to
USB and supply `/loader/credentials/import.pull.cred` with the DDI pull URL
and signed-checksum verification. See [credential delivery](https://github.com/projectbluefin/server/blob/main/docs/skills/tpm2-credential-sealing.md)
for the required credential encoding and trust constraints.

## See also

- [Upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer.md) — build artifacts, repart/transfer definitions and helper internals.
- [Build and test workflow](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer-build.md).
- [Diskless troubleshooting](/server/diskless-troubleshooting).
- [Release verification](/server/systemd-sysupdate-verification).
