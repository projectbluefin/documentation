---
title: Administrator's Guide
slug: /administration
---

#### Day to Day Operation

Bluefin is designed to be installed for the life of the hardware without reinstallation. Unlike traditional operating systems, the image is always pristine and "clean", making upgrades less problematic. Updates are automatic and silent by default.

This typically means you can set up your system once, and then have it remain that way. Then likely you'll never have to come back here. 🙂

:::tip

I want that "defaults lifestyle".

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin Desktop Environment Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## Installing Applications

Use [Bazaar](https://github.com/kolunmi/bazaar) to [install applications from Flathub](https://flathub.org/). System updates and upgrades are not handled by this application, its scope has been reduced to only install Flatpaks from Flathub. Two flatpak management tools are included:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) provides application management.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal) is also included for permission management.

## System Updates

Bluefin is designed to be "hands off". The system checks for updates every six(6) hours. This includes system updates, flatpaks, pet containers, and homebrew.

- Most images are published weekly, but we may push a new update at any given time.

Updates are applied when the system reboots. Therefore, it is recommended to routinely power off your device when it's not being used to ensure kernel updates are being applied. Application updates (like the browser) happen independently of this and don't require a reboot.

Machine firmware updates are provided through the Firmware application.

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### Managing Updates

In **Settings** → **Network** → A network setting, set **Metered Connection: has data limits or can incur charges** to pause Bluefin updates:

![Settings → Network → A network setting - `Metered Connection: has data limits or can incur charges` Highlight](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## Streams and Throttle Settings

Bluefin offers images based on the current version of Fedora, as well as a CentOS based image. This is to provide users with flexibility as to how aggressive they want their updates. These are referred to as "streams".

### Bluefin

`stable`: This is the default stream for Bluefin, aimed at most users. It is always aliased to the current version of Fedora but follows the Fedora CoreOS release schedule. This means that kernel upgrades come about 2 weeks after they land in Fedora, which can be useful for avoiding kernel regressions since the Bluefin team can pin to a specific kernel in those circumstances. We call this "gating" the kernel. `stable-daily` is available for those who want daily builds.

:::note[Latest (For Testers)]
`latest`: For users who want the very latest Fedora has to offer, an ungated Linux kernel, daily updates, full open throttle. 🔥 This stream is purposely left unbranded and is not meant for general purpose use.
:::

You can choose from three rolling tags, or lock to a specific version of Fedora. Check the [release notes](https://github.com/projectbluefin/bluefin/releases) for specific version information:

|                      | `stable` (default) or `stable-daily` | `latest`                   |
| -------------------- | ------------------------------------ | -------------------------- |
| Fedora Version:      | 43                                   | 43                         |
| GNOME Version:       | 49                                   | 49                         |
| Target User:         | All Users                            |                            |
| System Updates:      | Weekly or Daily                      | Daily                      |
| Application Updates: | Twice a Day                          | Twice a Day                |
| Kernel:              | Gated                                | Ungated                    |

**Note:** [Bluefin LTS](/lts) and [GDX](/gdx) not shown here, refer to their respective documentation for more details.

The major difference between `latest` and `stable` is the kernel cadence and when they do a major upgrade. `latest` will upgrade to the next major Fedora release as soon as it is available and builds daily. `stable` will upgrade when CoreOS does its userspace upgrade, which is usually a few weeks afterwards, and builds weekly or daily. Users can choose the `stable-daily` image for daily stable updates, or stick to `stable` for weekly builds.

#### Gated Kernel

The `stable` tag features a gated kernel. This kernel follows the same version as the [Fedora CoreOS stable stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable), which is a slower cadence than default Fedora Silverblue. The Universal Blue team may temporarily pin to a specific kernel in order to avoid regressions that may affect users.

Adding and editing kernel boot arguments is handled by `bootc kargs`. Check the [upstream documentation](https://bootc-dev.github.io/bootc/bootc-kargs.html) for more information.

:::info[It's all just Bluefin]

Bluefin's components are shared across all images, don't think of it as a separate "Edition" or "Spin". Bluefin strives to be the same across all the images, we feel that the aggressiveness of updates can be "be a setting". Ideally you use "Bluefin" and don't need to care about your update stream.

`lts` for a work machine and `stable` for your hot rod.

:::

### Switching between Streams

Use the `ujust rebase-helper` command to select rebase and select a specific stream:

![`ujust rebase-helper` - channel](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

Or select `date` and choose an older image.

![`ujust rebase-helper` - date](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### Switching between streams manually

Bluefin uses [`bootc`](https://bootc-dev.github.io/bootc/) to manage the operating system image. To inspect your current and staged deployments, run:

```sh
sudo bootc status
```

This displays your booted image, staged update (if any), and rollback target:

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

The `ghcr.io/projectbluefin/bluefin:stable` reference indicates the image and stream tag. Look for `:stable`, `:latest`, or pinned date tags.

If you have locally layered packages, reset them before switching streams:

```sh
rpm-ostree reset
```

**Pro Tip**: Bluefin's [release notes](https://github.com/projectbluefin/bluefin/releases) contain stream switching instructions for each release.

Use the `bootc switch` command to move to a different stream:

#### Manual Switch Examples

<details>

<summary>Switching to `:stable`. The `--enforce-container-sigpolicy` flag ensures signature validation for the target image:</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

Switching to `:testing`:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

Switching to NVIDIA hardware images:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Pinning to a specific date tag:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

Roll back to the previous deployment:

```sh
sudo bootc rollback
```

Use `skopeo inspect` to query image metadata and available tags:

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

This will show all the available tags and useful metadata like image and kernel versions.

Check the [bootc documentation](https://bootc-dev.github.io/bootc/) for more information.

## Virtual Private Networks (VPN)

[Tailscale](https://tailscale.com) is included by default to provide VPN services for both desktop and development use cases. [Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Using Tailscale with Mullvad](https://tailscale.com/kb/1258/mullvad-exit-nodes) - provides the best out of the box experience
- [Using Tailscale with Docker](https://tailscale.com/kb/1282/docker) - for development
- [Using the system tray with tailscale](https://tailscale.com/kb/1597/linux-systray) - follow this for setting up the tailscale icon in the system tray. Note that `wl-clipboard` is already included on the system so you do not need to install that.
- Tailscale's [YouTube channel](https://www.youtube.com/@Tailscale) has lots of great tips and tricks
- Good VPN providers may provide Wireguard configurations that can be imported directly into the Network Manager, check their documentation for more information:
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

There are also VPN providers on Flathub which will offer a good experience:

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([Donate](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN client](https://flathub.org/apps/com.protonvpn.www) - available on Flathub

Other VPN providers that are not explicitly mentioned here may a poor packaging experience and are not recommended. If your VPN provider falls into this category then exporting the wireguard configuration and importing it manually may be the best approach.

## Local Layering

Adding packages directly onto the host image is discouraged in Bluefin. The operating system is designed to remain pristine and reproducible as an OCI image managed by `bootc`.

Workloads should be isolated in containers (via Distrobox or Devcontainers), CLI tools installed via Homebrew, and graphical applications installed from Flathub.

If you must temporarily layer a host package:

```sh
rpm-ostree install <package>
```

To remove all layered packages and return to the pure image baseline:

```sh
rpm-ostree reset
```

Reboot to apply.

| Recommended Alternative | Avoid Layering on Host |
| ----------------------- | ---------------------- |
| Flatpak apps            | Graphical desktop apps |
| Homebrew CLI tools      | Host utilities         |
| Distrobox / Containers  | Developer runtimes     |

## Overwriting System Defaults

Bluefin system defaults are shipped on the base image along with Fedora configuration in `/usr/etc`. Most of these can be overridden by placing a file in `/etc`.

For example, the Distrobox configuration is in `/usr/etc/distrobox/distrobox.ini`. Your customization options will be placed in `/etc/distrobox/distrobox.ini`. This is useful for situations where you need a copy of the original file for reference.

Check the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) for more information on configuration options, in particular `~/.local` and `~/.config`.

## Community Aliases and Workarounds

[just](https://just.systems) is used as a task runner on Bluefin. These are commonly community convenience aliases, or more complex scripts that help automate some tasks or initial setup. This is aliased as `ujust`, so that you can use `just` itself for your other projects.

### Getting Started with ujust

- `ujust --choose` - Shows every command and the script that is being executed when that command is chosen. Useful for browsing the available commands
- `ujust -n $command` - The `-n` will run a command in dry-run mode, this is useful for inspecting the commands being run

:::tip

Pro tip, keep your own tasks and aliases in `~/.Justfile`, and they are also handy to put in the root of your project files to automate common tasks, check out this example from [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads).

:::

### Curated Tool Bundles

Bluefin includes curated CLI tool collections. These commands install curated collections of tools via Homebrew:

| Command             | Description                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | Modern CLI tools: atuin, bat, chezmoi, direnv, eza, fd, gh, glab, ripgrep, starship, tealdeer, television, zoxide, and more |

### System Commands

| Command                        | Description                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | Manually update the system, flatpaks, and brew formulas                                                                                                                                                           |
| `ujust toggle-updates`         | Enable or disable automatic system updates                                                                                                                                                                        |
| `ujust changelogs`             | Show the changelogs for each package since the last update                                                                                                                                                        |
| `ujust bios`                   | Reboot the PC and enter the BIOS/UEFI. Useful for running dual boot systems from independent disks                                                                                                                |
| `ujust bios-info`              | Display BIOS/UEFI information (manufacturer, product name, version, release date)                                                                                                                                 |
| `ujust device-info`            | Sends the status, flatpak list, and system info to the CentOS pastebin, and returns the URL to the terminal. This allows the end user to conveniently paste the URL with their info so others can help them debug |
| `ujust rebase-helper`          | Interactive assistant to switch between streams, rebase to different images, or roll back to a previous version                                                                                                   |
| `ujust clean-system`           | Clean up unused containers, volumes, and flatpak runtimes                                                                                                                         |
| `ujust check-idle-power-draw`  | Measure your system's idle power consumption using powerstat                                                                                                                                                      |
| `ujust check-local-overrides`  | Show files that differ between `/usr/etc` and `/etc` to identify local customizations                                                                                                                             |
| `ujust logs-this-boot`         | Show all system log messages from the current boot                                                                                                                                                                |
| `ujust logs-last-boot`         | Show all system log messages from the previous boot                                                                                                                                                               |
| `ujust enroll-secure-boot-key` | Enroll the Nvidia driver & KMOD signing key for secure boot (password: "universalblue")                                                                                                                           |
| `ujust toggle-user-motd`       | Toggle display of the message of the day in terminal                                                                                                                                                              |
| `ujust toggle-tpm2`            | Toggle automatic LUKS disk unlock via TPM (enable/disable with optional PIN)                                                                                                                                      |
| `ujust toggle-iwd`             | Switch between iwd and wpa_supplicant for Wi-Fi networking (iwd can improve throughput and reduce latency)                                                                                                        |
| `ujust benchmark`              | Run a one-minute system benchmark using stress-ng                                                                                                                                                                 |
| `ujust powerwash`              | Factory reset this device to its initial state (experimental feature)                                                                                                                                             |

### Developer Experience Commands

| Command                | Description                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ujust devmode`        | Toggle between Bluefin and the Developer Experience (bluefin-dx)                                                               |
| `ujust dx-group`       | Add your user to docker, incus-admin, libvirt, and dialout groups for full developer access                                    |
| `ujust bluefin-cli`    | Install Bluefin's curated command line experience with modern tools (atuin, bat, eza, fd, ripgrep, starship, zoxide, and more) |
| `ujust toggle-devmode` | Alias for `ujust devmode`                                                                                                      |

### Application Installation Commands

| Command                               | Description                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`             | Install [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/) for managing JetBrains IDEs      |
| `ujust install-opentabletdriver`      | Install or uninstall [OpenTabletDriver](https://opentabletdriver.net/), an open source tablet driver |
| `ujust install-system-flatpaks`       | Install the default system flatpaks (useful after rebasing)                                          |
| `ujust install-system-flatpaks-extra` | Install extra recommended flatpak applications                                                       |

Note that generally speaking Bluefin tries to keep the system Justfiles finely scoped, most of these are workarounds and not full-fledged commands. They may get removed or changed depending on the problem they were initially meant to solve.

## Managing Extensions

Bluefin uses the [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) by Matthew Jakeman to manage the desktop extensions. The application is included by default. You can access it via the [Logo Menu](https://github.com/Aryan20/Logomenu) (thanks Aryan Kaushik!)

![GNOME Extension Menu Option (opens Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

This is useful if you decide you do not want to use some of the ones bundled with Bluefin.

![Extension Manager - System Extensions Highlight](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

In the unlikely event that your session crashes, then all of your extensions will be disabled. In the rare case when this happens you may need to turn them all back on in the extensions manager.

:::

## Remote Management

:::note[Help Wanted]

This feature is incomplete and needs contributors to make it a reality

:::

Bluefin and Aurora include Cockpit for machine management. We're hoping to include more out-of-the-box management templates, please [check this issue](https://github.com/projectbluefin/bluefin/issues) if you're interested in volunteering.

## Verification

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/overview/). You can verify the signature by downloading the `cosign.pub` key from [this repo](https://github.com/projectbluefin/bluefin) and running the following command:

```sh
cosign verify --key cosign.pub ghcr.io/projectbluefin/bluefin
```
