---
mdx:
  format: md
title: "Offline USB Installer"
slug: /server/usb-installer
description: "Prepare a verified USB installer, enroll Secure Boot keys, and install or provision Bluefin Server."
---

# Offline USB Installer

Write `bluefin-server-installer_<ver>.raw` to USB to install without a network.
The stick contains the OS, signed boot images and Secure Boot enrollment keys.

**Writing the image erases the USB device. Installing erases the chosen target
disk completely. Check device names and keep backups before either step.**

<a id="burning-a-developer-stick-end-to-end"></a>

## Prepare the stick

Download the release and verify its signature and checksums:

```bash
tag=$(gh release view --repo projectbluefin/server --json tagName --jq .tagName)
ver=${tag#v}; dir=/var/tmp/usbstick/$tag; mkdir -p "$dir" && cd "$dir"
gh release download "$tag" --repo projectbluefin/server \
  --pattern "bluefin-server-installer_${ver}.raw" --pattern 'SHA256SUMS*'
gh api repos/projectbluefin/server/contents/files/os/sysupdate-keys/import-pubring.gpg \
  --jq .content | base64 -d > pubring.gpg
gpgv --keyring ./pubring.gpg SHA256SUMS.gpg SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS
```

Stop if verification fails. Find the USB device with
`lsblk -o NAME,TRAN,RM,SIZE,MODEL`, unmount its filesystems, and write through
its `/dev/disk/by-id/usb-*` name:

```bash
stick=/dev/disk/by-id/usb-<vendor>_<model>_<serial>-0:0
sudo dd if="bluefin-server-installer_${ver}.raw" of="$stick" bs=4M conv=fsync status=progress
sudo partx -u "$stick"; udevadm settle
```

For provisioning, mount `${stick}-part3` (the ESP), not
`/dev/disk/by-partlabel/bluefin-installer`: another stick can have the same
label. See [Credentials and the ESP](#credentials-and-the-esp). Otherwise,
unplug the stick after writes finish.

## Secure Boot

Secure Boot is required to authenticate the loader, UKI and its `/usr` hash.
The installer checks it before any install or Homelab prompt. It proceeds
without a warning only when Secure Boot is enabled and the firmware `db`
contains the stick's Bluefin certificate.

### Firmware steps

1. Open firmware setup (usually F2, Del, F10 or Esc). Put Secure Boot in
   **Setup Mode**: commonly “Reset to Setup Mode”, “Clear Secure Boot keys”
   or “Delete all keys”. Some firmware also needs Enabled or Custom mode.
2. Boot the stick. Choose **Enroll the Bluefin Server keys and restart**.
   Let the 15-second enrollment countdown finish. The systemd-boot menu's
   **Enroll Secure Boot keys: auto** entry does the same.
3. After restart, Secure Boot should be on. Boot the stick again if necessary.

**Enrollment replaces trust with the Bluefin keys only.** Microsoft-signed
option ROMs, including some graphics cards, may stop initializing. Keep
another display path or access to the firmware's “restore factory keys”.
Automatic `if-safe` enrollment happens only in VMs.

### The installer's check

Setup Mode offers enrollment. Disabled Secure Boot, other keys, or unreadable
Secure Boot variables produce a warning explaining what to fix. **Cancel** is
the default (Enter, an unlisted answer, or 10 minutes without an answer).
Cancelling leaves the reason on screen and touches no disk. Fix the firmware
and boot again.

**Continue without Secure Boot** requires a separate `yes`. Without Secure
Boot, disk writers can replace what boots and TPM-sealed secrets lose their
protection. [Unattended installs](#unattended-installs) refuse this state
unless explicitly allowed by credential.

## Using the installer

1. Boot the stick. **Bluefin Server <ver>** (minimal) is selected after three
   seconds. Choose **Bluefin Home Server** explicitly, or a Homelab role.
   Secure Boot is checked first.
2. **Home Server owner/options:** choose a nonroot owner, or Enter to defer
   owner creation to first boot. Homebrew is included; Podman defaults on,
   Docker and Homelab/KubeStellar off. Docker clients use Podman's API unless
   Docker is selected. Federation stays off. `q` or EOF cancels. Minimal
   skips these questions.
3. **Target disk:** select the numbered disk by size, model and by-id name.
   The USB stick is excluded. With one disk, Enter selects it; `q` cancels
   without touching a disk. Invalid numbers are asked again.
4. **Confirm:** the summary names the disk. Type `yes` to erase it and install;
   empty input or `no` cancels. This is the only erasure confirmation.
   The new installation is registered first in the firmware boot order.
5. Wait for the installed screen. The machine restarts in 15 seconds;
   Enter restarts immediately. **Remove the stick only when the screen goes
   blank:** the running installer still uses its `/usr`.
6. On first boot, Home Server creates its private or console-supplied owner
   and starts the Homebrew system container before login. SSH is key-only;
   root remains locked. Minimal and Homelab ask for a root password on tty1
   unless a password credential already answers it. See [First-boot prompts](#first-boot-prompts).

Cancellation or failure leaves the installer up with its error on the monitor.
The journal remains in RAM until power-off. With SSH access provisioned below:

```bash
journalctl -b -k
journalctl -u systemd-sysinstall
```

**Failure after erasure can leave the disk blank.** Boot the stick again to
retry. Invalid answers are re-prompted rather than ending the install.

## Boot flow

The stick boots systemd-boot and a signed installer UKI, uses the stick's
verity-checked `/usr`, then runs `systemd-sysinstall` on the monitor with a
tmpfs root. It does not need networking. Separate installer partition labels
prevent an existing Bluefin installation from being mistaken for the source.

The installer handles removal of old partition devices from the kernel before
erasure, avoiding systemd-repart v261's `Device or resource busy` failure.
Both USB and diskless installs produce the same
[installed layout](/server/ddi-installer#installing-to-disk). Installed nodes
update from official releases.

## Console banner

The login banner shows hostname, addresses, mDNS name, access instructions and
[update health](/server/systemd-sysupdate-verification). It refreshes when
addresses change. Homelab control planes also show the join passphrase and
Console access details; see [Homelab](/server/homelab-profile).

## Homelab entries

Homelab control-plane and node entries install the same OS and disk layout,
with offline extension payloads. They do **not** select Homebrew implicitly.
For SSH keys, MetalLB pools or other settings, edit
`bluefin/homelab/homelab-<role>.bu` on the stick's ESP before booting.

The node entry asks for the control plane's join passphrase. Enter uses the
stick's template; a `bluefin-cluster.passphrase` SMBIOS credential answers
unattended. sysinstall stores the role config with the installed UKI, sealed
to TPM2 when available (otherwise using the null key). Ignition reapplies it
every boot until an OS update replaces that UKI. First boot imports the
bundled extensions and removes their ESP copies.

k0s is not an installer entry; use the [Homelab templates](/server/homelab-profile).

## Home Server profile credentials

| Credential | Value / default |
| --- | --- |
| `bluefin.homebrew.profile` | `home-server` |
| `bluefin.homebrew.owner` | Nonroot name; omitted interactively means first-boot creation |
| `bluefin.homebrew.podman` | Boolean; `true` |
| `bluefin.homebrew.docker` | Boolean; `false` |
| `bluefin.homebrew.cluster` | Boolean; `false`; enables Homelab/KubeStellar, not federation |

Unattended Home Server installs require a private owner and
`passwd.hashed-password.<owner>` (`*` permits key-only access). Supply public
keys through `ssh.authorized_keys.<owner>`. Preparation writes `.ssh` as 0700
and `authorized_keys` as 0600 under the owner's UID/GID; absent key credentials
preserve existing keys. Invalid owners or booleans fail before erasure.
Keep sysusers, tmpfiles, password and key credentials private; sysinstall seals
them to TPM when available. Never put secrets in public null-key credentials.

The SSH owner is not the Console administrator: this option grants neither
general sudo nor an admin kubeconfig. For optional cluster setup, read the
Console URL and generated-once `admin` password at the physical/serial console
(private `/run/issue.d/51-kubestellar-console.issue`, not the journal). Headless
use needs private management-console access. See [Homelab HTTPS/DNS and access
limits](/server/homelab-profile); per-owner enrollment/recovery is not provided.
For Homebrew persistence and non-USB setup, use the
[system-container reference](https://github.com/projectbluefin/server/blob/main/docs/skills/system-containers.md).

## Unattended installs

Supply a `systemd.unit-dropin.systemd-sysinstall.service` **system credential**
through SMBIOS type 11 or QEMU fw_cfg. Plaintext `.cred` files on the ESP are
ignored. The drop-in replaces `ExecStart=` with the install command plus the
target disk and `--confirm=no`; the base command already has
`--erase=yes --variables=yes`. Set `StandardInput=null` so an unexpected prompt
fails rather than hangs. Use the exact drop-in from
[`scripts/dogfood-installer.sh`](https://github.com/projectbluefin/server/blob/main/scripts/dogfood-installer.sh).

This credential also marks the install unattended for the Secure Boot check.
Secure Boot must be on with the Bluefin keys, unless
`bluefin.install-allow-insecure-boot=1` is supplied as a credential. Otherwise
the install cancels before touching a disk; the journal gives the reason.
Supply the account/password credentials too so first boot does not block.

## First-boot prompts

Root ships locked (`!unprovisioned`). Netboot and non-USB installs do not prompt
for a root password. USB minimal and Homelab installs carry
`bluefin.prompt-root-password:1`, which blocks the first boot on tty1 until a
root password is set. `passwd.hashed-password.root` or
`passwd.plaintext-password.root` answers it, including a locked value such as
`!*`. Home Server masks this prompt and creates a nonroot owner instead.

## Credentials and the ESP

sysinstall stores locale, keymap, timezone and root-prompt credentials with the
installed UKI. Put other provisioning (users, SSH keys, sudoers, hostname,
network) in the stick's `/loader/credentials/`; it is copied to every installed
ESP and supplied on **every boot**, including the installer's boot.

ESP credentials must be encrypted; plaintext is ignored. Null-key credentials
work only with Secure Boot off and are **public obfuscation, not secrecy**.
The ESP is unencrypted FAT. Seal passwords and crackable password hashes with
`--with-key=tpm2` per node; Secure Boot can then remain on. See
[credential names and TPM sealing](https://github.com/projectbluefin/server/blob/main/docs/skills/tpm2-credential-sealing.md).

### Developer mode: an admin user with SSH and passwordless sudo

For an SSH-managed minimal node with Secure Boot **off**, generate these five
nonsecret credentials in a `creds/` directory. This grants passwordless sudo;
use only keys you intend to trust:

```bash
user=jorge; uid=1000; key="$(cat ~/.ssh/*.pub)"
enc() { sudo systemd-creds encrypt --with-key=null --name="$1" - "$2"; }
# Explicit UID avoids systemd-sysusers' system-account range.
printf 'u %s %s "%s" /home/%s /bin/bash\nm %s wheel\n' "$user" "$uid" "$user" "$user" "$user" \
  | enc sysusers.extra sysusers.extra.cred
printf 'd /home/%s 0700 %s %s -\nd /home/%s/.ssh 0700 %s %s -\nf+~ /home/%s/.ssh/authorized_keys 0600 %s %s - %s\nf+~ /etc/sudoers.d/50-%s 0440 root root - %s\n' \
  "$user" "$user" "$user" "$user" "$user" "$user" "$user" "$user" "$user" "$(printf '%s\n' "$key" | base64 -w0)" \
  "$user" "$(printf '%s ALL=(ALL:ALL) NOPASSWD: ALL\n' "$user" | base64 -w0)" \
  | enc tmpfiles.extra tmpfiles.extra.cred
# ssh.listen needs binary credentials; services use the base64 form.
printf 22 | enc ssh.listen - | base64 -d > ssh.listen.cred
# '*' allows key-only SSH; '!*' keeps root locked and answers its prompt.
printf '*' | enc "passwd.hashed-password.$user" "passwd.hashed-password.$user.cred"
printf '!*' | enc passwd.hashed-password.root passwd.hashed-password.root.cred
```

To use a GitHub user's public keys instead, fetch and inspect them first:

```bash
curl -fsSL https://github.com/<github-user>.keys > keys
ssh-keygen -lf keys
```

Set `key="$(cat ../keys)"` when running the recipe from `creds/`. Copy the
credentials onto the stick prepared above:

```bash
mkdir -p mnt && sudo mount "${stick}-part3" mnt
sudo mkdir -p mnt/loader/credentials && sudo cp creds/*.cred mnt/loader/credentials/
sync && sudo umount mnt
```

Check the OS partitions against the image and inspect the credentials before
unplugging. The ESP differs because it now contains credentials:

```bash
l=$(sudo losetup -fPr --show "bluefin-server-installer_${ver}.raw")
for p in 1 2; do sudo cmp "${l}p$p" "${stick}-part$p" && echo "part$p ok"; done
sudo losetup -d "$l"
sudo mount -o ro "${stick}-part3" mnt
dec() { sudo systemd-creds decrypt --with-key=null --name="$1" "mnt/loader/credentials/$1.cred"; }
dec sysusers.extra
dec tmpfiles.extra | awk '/authorized_keys/{print $NF}' | base64 -d | diff - keys && echo "keys ok"
dec tmpfiles.extra | awk '/sudoers/{print $NF}' | base64 -d
base64 -w0 mnt/loader/credentials/ssh.listen.cred \
  | sudo systemd-creds decrypt --with-key=null --name=ssh.listen - -
sudo umount mnt && sudo udisksctl power-off -b "$stick"
```

The `diff - keys` check assumes the GitHub `keys` file above; otherwise compare
against your chosen local public keys. Confirm the sudoers line grants only the
intended user and `ssh.listen` decrypts to `22`. Stop on mismatches.

Boot with Secure Boot off and explicitly accept the warning. After installation,
`ssh <user>@<node>` uses those keys and sudo needs no password. Omitting
`passwd.hashed-password.root.cred` instead makes first boot wait at the monitor
for a root password before SSH can start. Do not add secrets to this recipe.

## See also

- [Boot, install and update](/server/ddi-installer).
- [Secure Boot keys](/server/secure-boot-keys).
- [Upstream installer reference](https://github.com/projectbluefin/server/blob/main/docs/skills/usb-installer.md) — image, unit/drop-in and console implementation details.
- [Build and test workflow](https://github.com/projectbluefin/server/blob/main/docs/skills/ddi-installer-build.md).
