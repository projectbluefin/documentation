---
mdx:
  format: md
title: System Containers
slug: /server/system-containers
description: Identify your shell, manage Bluefin Server's Homebrew environment, and add an Ubuntu system container.
---

# System Containers

Bluefin Server uses `systemd-nspawn` system containers for separate Linux
userspaces that share the host kernel. They are not virtual machines, OCI
workloads, or system extensions merged into the host's `/usr`.

The managed Homebrew environment and a manually added Ubuntu toolbox have
separate lifecycles. Run host administration commands from a **host shell** with
root or authorized sudo access. Being the Homebrew owner does not grant general
sudo access.

## Am I on the host or in a container?

Run these commands in the shell you are unsure about, including inside a tmux
pane:

```bash
systemd-detect-virt --container
hostname
type -a just brew tmux omp
```

- `systemd-nspawn` means a system container. The hostname identifies the machine:
  `bluefin-homebrew` for the managed Homebrew environment, or `ubuntu` for the
  example below.
- `none`, with a nonzero exit status, means no container was detected. This also
  applies when Bluefin Server itself runs in a VM; `--container` excludes VM
  detection.
- Your username, home directory and project paths can look identical on both
  sides. They do not identify the execution environment.

Console and SSH logins start on the host. The Homebrew integration does not move
that login shell into a container. It exposes command launchers instead:

- `/usr/bin/brew` dispatches into the Homebrew machine; it is not native Homebrew.
- `/var/lib/bluefin-homebrew/commands/<command>` also dispatches into that machine.
  Native host commands earlier in `PATH` take priority over these launchers.
- Inside the Homebrew machine, brewed programs run directly from
  `/home/linuxbrew/.linuxbrew`.

### What about `just omp` and tmux?

`just` does not guarantee host execution. **If `just` comes from Homebrew, its
recipe runs inside the Homebrew machine**, even when invoked at a host prompt.
With a native host `just`, individual recipe commands can still enter the guest
through their Homebrew launchers.

**A Homebrew-installed tmux runs its server, pane shells and any omp launched in
those panes inside the Homebrew machine.** These are not separate containers.
Inspect a custom recipe with `just --show omp` in the directory where you normally
run it. Bluefin Server does not ship an `omp` recipe.

Detaching from tmux returns to the shell that attached; `exit` closes a pane.
Detached sessions survive SSH disconnects, but not a Homebrew machine restart or
host reboot. To administer the host, use a separate host login or return to your
original host shell. Sudo inside a guest is not a way back to the host.

## Inspect machines from the host

```bash
machinectl list
machinectl list-images
machinectl status bluefin-homebrew
```

`list` shows running machines; `list-images` shows stored images, including ones
that are stopped. An image version such as `homebrew_<version>.raw` is not the
running machine name `bluefin-homebrew`.

## Manage the Homebrew environment

### Setup

The **Home Server** installer profile provisions the Homebrew environment and its
nonroot owner. See the [USB installer guide](/server/usb-installer) for installation
and private account/SSH credentials. The profile prepares the machine before
console and SSH login. Do not manually import a second machine named `homebrew`
for this profile.

The optional `homebrew` update feature supplies a version-matched machine image
and a `homebrew-integration` system extension containing the host bridge. Normal
OS updates select the matching immutable machine image without replacing your
installed packages.

The profile also installs `tmux` and `neovim` once in the background. Login does
not wait for those packages; a failed installation retries at the next boot.
After the first successful installation, removing a default package does not
cause it to be installed again.

### Packages and shared files

Run package operations as the configured **nonroot owner**, without `sudo`:

```bash
brew list
brew install ripgrep
brew update
brew upgrade
```

Only the owner may run `brew`. Other provisioned users can execute installed
tools with a read-only prefix. Automatic Homebrew updates and install-time
cleanup are disabled; run updates and cleanup explicitly.

| Data                                    | Location and persistence                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Installed packages                      | Host `/var/lib/bluefin-homebrew/prefix`, mounted at guest `/home/linuxbrew/.linuxbrew`; survives machine restarts and OS updates.                                                       |
| User homes and configured project roots | Shared read-write at the same paths, with the caller's UID/GID and normal file permissions.                                                                                             |
| Guest `/var`                            | Persistent under host `/var/lib/bluefin-homebrew/guest-var`.                                                                                                                            |
| Guest `/etc` and other overlay changes  | Preparation rebuilds guest `/etc` at host boot or when preparation is rerun, not on a machine-only restart. Other overlay changes are temporary. Edit host configuration from the host. |

Dispatch accepts a working directory in your authorized home or an explicit
`PROJECT_ROOTS` directory configured by an administrator in the host's root-owned
`/etc/bluefin-homebrew.conf`. `/` deliberately maps to the guest root. If a
command reports that its working directory is outside the authorized roots,
return to your home or ask the administrator to configure the project path.

Shared files and the host network make this a trusted toolbox, not a sandbox for
untrusted packages. Homebrew-installed Docker/Podman clients use the selected
host engine's API; their workloads do not run nested inside the Homebrew machine.
See [Enabling Extensions](/server/enabling-extensions) for optional host engines.

### Status, logs and restarts

Run on the **host**:

```bash
systemctl status bluefin-homebrew.service
journalctl -b -u bluefin-homebrew-prepare.service -u bluefin-homebrew.service
sudo systemctl restart bluefin-homebrew.service
```

**Restarting ends all guest processes, including tmux and omp.** It preserves
installed packages and shared files. For an intentional stop/start:

```bash
sudo systemctl stop bluefin-homebrew.service
sudo systemctl start bluefin-homebrew.service
```

After changing shared-root configuration, stop the machine, rerun preparation,
then start it:

```bash
sudo systemctl stop bluefin-homebrew.service
sudo systemctl restart bluefin-homebrew-prepare.service
sudo systemctl start bluefin-homebrew.service
```

Do not use the generic `system-container start/reset` workflow for this managed
machine or delete its package prefix to troubleshoot it. To disable the feature,
follow [extension removal](/server/systemd-sysext-extensions).

## Example: add an Ubuntu container

This creates a separate, writable **Ubuntu 24.04 LTS** toolbox named `ubuntu` on
an x86-64 Bluefin Server host. It does not change Homebrew or install Ubuntu
packages into Bluefin. On ARM64, select the `arm64` archive instead.

### Download and verify the rootfs

In an empty working directory, download the **root tarball** from the
[official release directory](https://cloud-images.ubuntu.com/releases/noble/release/).
Do not use the VM `.img` or the small LXD metadata archive. These commands need
`curl`, `gpg` and `sha256sum`:

```bash
base=https://cloud-images.ubuntu.com/releases/noble/release
image=ubuntu-24.04-server-cloudimg-amd64-root.tar.xz
key=D2EB44626FDDC30B513D5BB71A5D6C4C7DB87C81
curl -fLO "$base/$image" &&
curl -fLO "$base/SHA256SUMS" &&
curl -fLO "$base/SHA256SUMS.gpg" &&
curl -fL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x$key" -o ubuntu-cloud-key.asc &&
gpg --import ubuntu-cloud-key.asc &&
gpg --verify SHA256SUMS.gpg SHA256SUMS &&
sha256sum --check --ignore-missing SHA256SUMS
```

Continue only if the signature and archive checksum checks succeed. Check the
signer fingerprint against the one above, published in
[Ubuntu's verification guide](https://ubuntu.com/docs/public-images/public-images-how-to/verify-image-checksum/).
An uncertified-key trust warning is expected for a newly imported key; the
signature must still be good and its fingerprint must match.
Verification uses your user GPG keyring; leave Bluefin's OS update trust keyring
unchanged.

### Import and start Ubuntu

From a **host shell**, in the directory containing the verified archive:

```bash
sudo importctl --class=machine import-tar ./ubuntu-24.04-server-cloudimg-amd64-root.tar.xz ubuntu
sudo install -d -m 0755 /etc/systemd/nspawn
sudo tee /etc/systemd/nspawn/ubuntu.nspawn >/dev/null <<'EOF'
[Exec]
Boot=yes
ResolvConf=replace-host
[Network]
Private=no
VirtualEthernet=no
EOF
sudo system-container start ubuntu
sudo system-container enter ubuntu
```

`importctl` imports the verified **local file**, not its URL, into
`/var/lib/machines/ubuntu`. `machinectl` manages the running machine; the
`system-container` helper wraps its start, poweroff, shell and remove commands.
Entering opens a **root Ubuntu shell** without needing the cloud image's locked
account password.

This example shares the host network and DNS, so guest services can occupy host
ports. Host homes and projects are **not** shared automatically. Containers
share the host kernel; installing an Ubuntu kernel does not replace Bluefin's.

### Work inside Ubuntu

These commands run **inside Ubuntu**, not on the Bluefin host:

```bash
hostname
systemd-detect-virt --container
apt-get update
apt-get upgrade
exit
```

Expect hostname `ubuntu` and container type `systemd-nspawn`. After `exit`, you
are back in the host shell that entered Ubuntu.

### Stop, start and autostart

Run on the **host**:

```bash
machinectl status ubuntu
sudo system-container stop ubuntu
```

`stop` requests a clean shutdown. Wait until `machinectl list` no longer lists
Ubuntu before starting it again:

```bash
sudo system-container start ubuntu
sudo machinectl enable ubuntu       # optional: start at host boot
sudo machinectl disable ubuntu      # undo autostart; does not stop it
```

Packages and files survive stop/start and Bluefin OS updates. Keep Ubuntu
updated with apt inside it, independently of Bluefin sysupdate and Brew updates.

### Back up, remove or restore Ubuntu

First disable autostart and stop the service synchronously. Then export its
filesystem from the **host**:

```bash
sudo machinectl disable ubuntu
sudo systemctl stop systemd-nspawn@ubuntu.service
sudo importctl export-tar ubuntu ./ubuntu-backup.tar.xz
```

**Reset deletes the entire Ubuntu guest filesystem.** Save your data and verify
your backup before removing it:

```bash
sudo system-container reset ubuntu
sudo rm /etc/systemd/nspawn/ubuntu.nspawn
```

To restore an exported backup, import it under the same name, recreate the
`ubuntu.nspawn` configuration above and start it:

```bash
sudo importctl --class=machine import-tar ./ubuntu-backup.tar.xz ubuntu
```

## References

- [machinectl](https://www.freedesktop.org/software/systemd/man/latest/machinectl.html)
- [importctl](https://www.freedesktop.org/software/systemd/man/latest/importctl.html)
- [Container settings](https://www.freedesktop.org/software/systemd/man/latest/systemd.nspawn.html)
- [Container detection](https://www.freedesktop.org/software/systemd/man/latest/systemd-detect-virt.html)
