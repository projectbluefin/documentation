---
title: Introduction to Bluefin
slug: /introduction
---

_Deinonychus antirrhopus_

## [docs.projectbluefin.io](https://docs.projectbluefin.io)

![image](https://github.com/user-attachments/assets/21208dd6-9ce5-41ba-9c21-d2bb97f7c1e8)

:::tip

Give me a lever long enough and a Free OS to set it on, and I can move the world.

-- Steve Langasek

:::

## Features

Bluefin features a GNOME ([Donate](https://www.gnome.org/donate/)) desktop configured by our community. It is designed to be hands-off and stay out of your way so you can focus on your applications.

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command-line applications.

:::tip

Bluefin is "An interpretation of the Ubuntu spirit built on Fedora technology"—a callback to an era of Ubuntu's history that many open source enthusiasts grew up with, much like the Classic X-Men. We aim to bring that same vibe here; think of us as the reboot. Chill vibes.

:::

- Ubuntu-like GNOME layout.
  - Integrates the following GNOME Extensions by default:
    - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - for a more Unity-like dock
    - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - for tray-like icons in the top right corner
    - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - Integrate your mobile device with your desktop
    - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donate](https://github.com/sponsors/aunetx)) - for that bling
    - [Search Light](https://github.com/icedman/search-light) - provides search functionality and a macOS Spotlight-like workflow. Bound to <kbd>Super</kbd>-<kbd>Space</kbd> by default.
- [Developer Mode](/bluefin-dx) - Dedicated developer mode that transforms Bluefin into a powerful cloud-native developer workstation
- [Ptyxis terminal](https://devsuite.app/ptyxis/) for container-focused workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donate](https://github.com/sponsors/ranfdev)) for container management
- [Tailscale](https://tailscale.com) - included for VPN along with `wireguard-tools`
  - Use `systemctl disable --now tailscaled.service` to turn it off if you don't plan on using it.
  - [Tailscale systray support](https://tailscale.com/kb/1597/linux-systray) included
- [GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) ([Donate](https://github.com/sponsors/mjakeman)) included
- [Bazaar Application Store](https://github.com/kolunmi/bazaar) featuring [Flathub](https://flathub.org):
  - Use a familiar software center UI to install graphical software
  - Abandoned applications are unlisted. Applications that depend on out of date flatpak runtimes to be excluded from the app store.
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donate](https://ko-fi.com/heliguy)) included for Flatpak management
- Quality of Life Features
  - [Starship](https://starship.rs) terminal prompt enabled by default
  - [Solaar](https://github.com/pwr-Solaar/Solaar) - included for managing Logitech mice
    along with `libratbagd`
  - [rclone](https://rclone.org/overview/) ([Donate](https://github.com/sponsors/rclone)) - mount nearly any remote storage service onto your local machine, great for multi-machine setups
  - [restic](https://restic.net/) ([Donate](https://github.com/sponsors/restic)) - A modern backup program for your files
  - `zsh` and `fish` included ([Instructions](/command-line#changing-the-default-terminal-shell)) as optional shells
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) for laptops with multiple GPUs
- Built on top of the [Universal Blue](https://github.com/ublue-os/main) main image - enabling straightforward sharing of benefits:
  - Extra udev rules for game controllers and [other devices](https://github.com/ublue-os/config) included out of the box
  - All multimedia codecs included
  - System designed for automatic staging of updates
    - If you've never used an image-based Linux before, use your computer normally
    - Don't overthink it—just shut your computer off when you're not using it

## Distroless Focus

Bluefin specifically ships upstream tools in lieue of custom applications. The idea of a "distribution app store" has proven to be unsustainable for desktop application authors, so Bluefin ships tools like [Bazaar](https://github.com/kolunmi/bazaar) and [Homebrew](https://brew.sh) instead. Additionally the team purposely ensures that the workflows used in Bluefin remain not only distribution agnostic, but operating system agnostic. For example, `podman`, `docker`, and `flatpak` instead of distribution specific tooling, etc.

:::info[It's a Cross Platform World]

The workflows in Bluefin are purposely upstream focused -- we believe in a consistent Linux experience for everyone, wether it's WSL on Windows, Podman/Docker on a Mac, or any Linux system. The [cloud native ecosystem](http://cncf.io) has proven that this model works. This allows millions of existing developers to onboard with a workflow that they already know, and allows Linux to compete where it matters the most. A community-driven approach that leads to a sustainable future where we're in charge of our operating systems again.

:::

![Bazaar](https://github.com/user-attachments/assets/788def08-5743-4e38-a140-e75148f8a1c7)

![Bazaar2](https://github.com/user-attachments/assets/296d11eb-8c71-4c95-a2d0-bda1cb5ba5aa)
