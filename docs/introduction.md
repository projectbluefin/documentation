---
title: Introduction to Bluefin
slug: /introduction
---
*Deinonychus antirrhopus*

## [docs.projectbluefin.io](https://docs.projectbluefin.io)

![image](https://github.com/user-attachments/assets/21208dd6-9ce5-41ba-9c21-d2bb97f7c1e8)

> Give me a lever long enough and a Free OS to set it on, and I can move the world.
>
> -Steve Langasek

## Features

Bluefin features a GNOME desktop configured by our community. It is designed to be hands off and to stay out of your way so you can focus on your applications.

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command line applications.

> Bluefin is also "An interpretation of the Ubuntu spirit built on Fedora technology", which is a certain era of Ubuntu's history that a significant amount of open source people grew up with, like the Classic X-men. We try to bring that vibe here, we're the reboot. Chill vibes.

- Ubuntu-like GNOME layout.
  - Integrates the following GNOME Extensions by default:
    - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - for a more Unity-like dock
    - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - for tray-like icons in the top right corner
    - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - Integrate your mobile device with your desktop
    - [Blur my Shell](https://github.com/aunetx/blur-my-shell) - for that bling
    - [Tailscale GNOME QS](https://extensions.gnome.org/extension/6139/tailscale-qs/) for [tailscale integration](https://universal-blue.discourse.group/t/tailscale-vpn/290)
    - [Search Light](https://github.com/icedman/search-light) - for search and a MacOS Spotlight workflow. Bound to <kbd>Super</kbd>-<kbd>Space</kbd> by default. Check the screenshot at the bottom of this page for an example
- [Developer Mode](/bluefin-dx) - Dedicated developer mode that transforms Bluefin into a powerful cloud native developer workstation
- [Ptyxis terminal](https://devsuite.app/ptyxis/) for container-focused workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) for container management
- [Tailscale](https://tailscale.com) - included for VPN along with `wireguard-tools`
  - Use `ujust toggle-tailscale` to turn it off if you don't plan on using it.
- [GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) included
- [Bazaar Application Store](https://github.com/kolunmi/bazaar) featuring [Flathub](https://flathub.org):
  - Use a familiar software center UI to install graphical software
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) included for flatpak management
- Quality of Life Features
  - [Starship](https://starship.rs) terminal prompt enabled by default
  - [Solaar](https://github.com/pwr-Solaar/Solaar) - included for Logitech mouse
    management along with `libratbagd`
  - [rclone](https://rclone.org/overview/) - mount almost any remote bucket onto your local machine, great for multiple machine setups
  - [restic](https://restic.net/) - A modern backup program that can back up your files
  - `zsh` and `fish` included ([Instructions](/administration#changing-the-default-terminal-shell)) as optional shells
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) for multi-GPU laptops
  
- Built on top of the the [Universal Blue main image](https://github.com/ublue-os/main) - resulting in easy sharing of benefits:
  - Extra udev rules for game controllers and [other devices](https://github.com/ublue-os/config) included out of the box
  - All multimedia codecs included
  - System designed for automatic staging of updates
    - If you've never used an image-based Linux before just use your computer normally
    - Don't overthink it, just shut your computer off when you're not using it

![Search Light on Bluefin](https://github.com/user-attachments/assets/ee44182f-15a1-4aa2-a521-84d48a42f7bc)
