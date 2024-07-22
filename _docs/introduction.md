---
layout: page
title: Introduction to Bluefin
permalink: introduction
---

# Prerequisites

Bluefin, like all [Universal Blue](https://universal-blue.org) images, is a next generation Linux desktop, generally speaking we trend towards progressive improvement, and move away from legacy technologies as soon as possible. If legacy applications and techniques are important to you then Bluefin may not be for you. 

Bluefin is:

- Flatpak first. Applications that are not well maintained on Flathub generally won't work well. We always optimize for apps that take advantage of the next generation model.
- Optimized for the 90%, not the 4% - Bluefin takes the "stronger together" approach from cloud native, the value we provide is sharing a common model. You can always do what you want, but the value is to share best practices, we don't spend a lot of time on edge cases.
- Container first - For developers, the intended user experience is for a container experience.
- Doesn't support dual booting, it is strongly recommended to give Bluefin an entire disk, and manage booting into other operating systems from within your device's BIOS boot menu. 

If your requirements are outside of this scope, then **Bluefin might not be the best fit for you**. We recognize that in order to make a better Linux desktop that we have to leave a bunch of legacy applications and use cases behind. If this appeals to you, then Bluefin is for you.

![image](https://github.com/user-attachments/assets/3f83b3a8-7d8d-492d-bb00-bee259d16592)

# Features

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command line applications.

- Ubuntu-like GNOME layout.
  - Includes the following GNOME Extensions:
    - Dash to Dock - for a more Unity-like dock
    - Appindicator - for tray-like icons in the top right corner
    - GSConnect - Integrate your mobile device with your desktop    
    - Blur my Shell - for that bling
    - [Tailscale GNOME QS](https://extensions.gnome.org/extension/6139/tailscale-qs/) for [tailscale integration](https://universal-blue.discourse.group/t/tailscale-vpn/290)
- [Developer Mode](bluefin-dx) - Dedicated developer mode that transforms Bluefin into a powerful cloud native developer workstation.
- [Ptyxis terminal](https://universal-blue.discourse.group/docs?topic=300) for container-focused workflows
  - [Boxbuddy](https://flathub.org/apps/io.github.dvlv.boxbuddyrs) for container management
- [Tailscale](https://tailscale.com) - included for VPN along with `wireguard-tools`
     - Use `ujust toggle-tailscale` to turn it off if you don't plan on using it.
- [GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) included
- GNOME Software with [Flathub](https://flathub.org):
  - Use a familiar software center UI to install graphical software
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) included for flatpak management
- Quality of Life Features
  - [Starship](https://starship.rs) terminal prompt enabled by default
  - [Input Leap](https://github.com/input-leap/input-leap) built in
  - [Solaar](https://github.com/pwr-Solaar/Solaar) - included for Logitech mouse 
management along with `libratbagd`
  - [rclone](https://rclone.org/) and [restic](https://restic.net/) included
  - `zsh` and `fish` included (optional) 
- Built on top of the the [Universal Blue main image](https://github.com/ublue-os/main)
  - Extra udev rules for game controllers and [other devices](https://github.com/ublue-os/config) included out of the box
  - All multimedia codecs included
  - System designed for automatic staging of updates
    - If you've never used an image-based Linux before just use your computer normally
    - Don't overthink it, just shut your computer off when you're not using it

# Applications

- Mozilla Firefox, Mozilla Thunderbird, Extension Manager, DejaDup, FontDownloader, Flatseal, and the Clapper Media Player.
- Core GNOME Applications installed from Flathub:
  - GNOME Calculator, Calendar, Characters, Connections, Contacts, Evince, Firmware, Logs, Maps, NautilusPreviewer, TextEditor, Weather, baobab, clocks, eog, and font-viewer.

# Installation

Review the [Fedora Silverblue installation instructions](https://docs.fedoraproject.org/en-US/fedora-silverblue/installation/). Some points to consider:

- Use [Ventoy](https://www.ventoy.net/en/index.html) or the [Fedora Media Writer](https://flathub.org/apps/org.fedoraproject.MediaWriter) to create installation media. Other creation methods may not work properly.
- Dual booting off of the same disk is *unsupported*, use a dedicated driver for another operating system and use your BIOS to choose another OS to boot off of.
- We strongly recommend using automated partitioning during installation, there are [known issues](https://docs.fedoraproject.org/en-US/fedora-silverblue/installation/) with manual partition on Atomic systems and is unnecesary to set up unless you are on a multi-disk system. 

[Open an issue]({{ site.repo }}/issues)
