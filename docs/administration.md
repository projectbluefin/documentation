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

## Virtual Private Networks (VPN)

[Tailscale](https://tailscale.com) is included by default to provide VPN services for both desktop and development use cases. [Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Using Tailscale with Mullvad](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) - provides the best out of the box experience
- [Using Tailscale with Docker](https://tailscale.com/docs/features/containers/docker) - for development
- [Using the system tray with tailscale](https://tailscale.com/docs/features/client/linux-systray) - follow this for setting up the tailscale icon in the system tray. Note that `wl-clipboard` is already included on the system so you do not need to install that.
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
| `ujust clean-system`           | Clean up unused containers, volumes, and flatpak runtimes                                                                                                                                                         |
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

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/). Bluefin Classic uses key-based signing, so verify it with the `cosign.pub` key from [ublue-os/bluefin](https://github.com/ublue-os/bluefin):

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

Dakota and Utah are signed keylessly instead — see [Supply Chain Security](/supply-chain) for their verification commands.
