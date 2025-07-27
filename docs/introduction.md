---
title: Introduction to Bluefin
slug: /introduction
---

_Deinonychus antirrhopus_

## [docs.projectbluefin.io](https://docs.projectbluefin.io)

![image](https://github.com/user-attachments/assets/21208dd6-9ce5-41ba-9c21-d2bb97f7c1e8)

> Give me a lever long enough and a Free OS to set it on, and I can move the world.
>
> -Steve Langasek

## Features

Bluefin features a GNOME desktop configured by our community. It is designed to be hands-off and stay out of your way so you can focus on your applications.

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command-line applications.

> Bluefin is "An interpretation of the Ubuntu spirit built on Fedora technology"—a callback to an era of Ubuntu's history that many open source enthusiasts grew up with, much like the Classic X-Men. We aim to bring that same vibe here; think of us as the reboot. Chill vibes.

- Ubuntu-like GNOME layout.
  - Integrates the following GNOME Extensions by default:
    - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - for a more Unity-like dock
    - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - for tray-like icons in the top right corner
    - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - Integrate your mobile device with your desktop
    - [Blur my Shell](https://github.com/aunetx/blur-my-shell) - for that bling
    - [Tailscale GNOME QS](https://extensions.gnome.org/extension/6139/tailscale-qs/) for [tailscale integration](https://universal-blue.discourse.group/t/tailscale-vpn/290)
    - [Search Light](https://github.com/icedman/search-light) - provides search functionality and a macOS Spotlight-like workflow. Bound to <kbd>Super</kbd>-<kbd>Space</kbd> by default. Check the screenshot at the bottom of this page for an example
- [Developer Mode](/bluefin-dx) - Dedicated developer mode that transforms Bluefin into a powerful cloud-native developer workstation
- [Ptyxis terminal](https://devsuite.app/ptyxis/) for container-focused workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) for container management
- [Tailscale](https://tailscale.com) - included for VPN along with `wireguard-tools`
  - Use `ujust toggle-tailscale` to turn it off if you don't plan on using it.
- [GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) included
- [Bazaar Application Store](https://github.com/kolunmi/bazaar) featuring [Flathub](https://flathub.org):
  - Use a familiar software center UI to install graphical software
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) included for Flatpak management
- Quality of Life Features
  - [Starship](https://starship.rs) terminal prompt enabled by default
  - [Solaar](https://github.com/pwr-Solaar/Solaar) - included for managing Logitech mice
    along with `libratbagd`
  - [rclone](https://rclone.org/overview/) - mount nearly any remote storage service onto your local machine, great for multi-machine setups
  - [restic](https://restic.net/) - A modern backup program for your files
  - `zsh` and `fish` included ([Instructions](/command-line#changing-the-default-terminal-shell)) as optional shells
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) for laptops with multiple GPUs
- Built on top of the [Universal Blue main image](https://github.com/ublue-os/main) - enabling straightforward sharing of benefits:
  - Extra udev rules for game controllers and [other devices](https://github.com/ublue-os/config) included out of the box
  - All multimedia codecs included
  - System designed for automatic staging of updates
    - If you've never used an image-based Linux before, use your computer normally
    - Don't overthink it—just shut your computer off when you're not using it

![Search Light on Bluefin](https://github.com/user-attachments/assets/ee44182f-15a1-4aa2-a521-84d48a42f7bc)
