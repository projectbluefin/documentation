---
layout: page
title: Introduction to Bluefin
permalink: introduction
---

![image](https://github.com/user-attachments/assets/21208dd6-9ce5-41ba-9c21-d2bb97f7c1e8)

# Features

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command line applications.

- Ubuntu-like GNOME layout.
  - Integrates the following GNOME Extensions by default:
    - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - for a more Unity-like dock
    - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - for tray-like icons in the top right corner
    - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - Integrate your mobile device with your desktop    
    - [Blur my Shell](https://github.com/aunetx/blur-my-shell) - for that bling
    - [Tailscale GNOME QS](https://extensions.gnome.org/extension/6139/tailscale-qs/) for [tailscale integration](https://universal-blue.discourse.group/t/tailscale-vpn/290)
    - [Search Light](https://github.com/icedman/search-light) - for search and a MacOS Spotlight workflow. Bound to <kbd>Super</kbd>-<kbd>Space</kbd> by default
- [Developer Mode](bluefin-dx) - Dedicated developer mode that transforms Bluefin into a powerful cloud native developer workstation.
- [Ptyxis terminal](https://devsuite.app/ptyxis/) for container-focused workflows
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
  - `zsh` and `fish` included ([Instructions](administration#changing-the-default-terminal-shell)) 
- Built on top of the the [Universal Blue main image](https://github.com/ublue-os/main) - resulting in easy sharing of benefits: 
  - Extra udev rules for game controllers and [other devices](https://github.com/ublue-os/config) included out of the box
  - All multimedia codecs included
  - Many improvements from [Bazzite](https://bazzite.gg): GNOME Triple Buffering, Switcheroo support 
  - System designed for automatic staging of updates
    - If you've never used an image-based Linux before just use your computer normally
    - Don't overthink it, just shut your computer off when you're not using it

# Applications

- Mozilla Firefox, Mozilla Thunderbird, Extension Manager, DejaDup, FontDownloader, Flatseal, and the Clapper Media Player.
- Core GNOME Applications installed from Flathub:
  - GNOME Calculator, Calendar, Characters, Connections, Contacts, Evince, Firmware, Logs, Maps, NautilusPreviewer, TextEditor, Weather, baobab, clocks, eog, and font-viewer.

# Installation Requirements

Review the [Fedora Silverblue installation instructions](https://docs.fedoraproject.org/en-US/fedora-silverblue/installation/). Some points to consider:

- Use [Ventoy](https://www.ventoy.net/en/index.html) or the [Fedora Media Writer](https://flathub.org/apps/org.fedoraproject.MediaWriter) to create installation media. Other creation methods may not work properly.
- Dual booting off of the same disk is **unsupported**, use a dedicated drive for another operating system and use your BIOS to choose another OS to boot off of. (This is how you should probably always do it anyway)
- We **strongly recommend** using automated partitioning during installation, there are [known issues](https://docs.fedoraproject.org/en-US/fedora-silverblue/installation/) with manual partition on Atomic systems and is unnecessary to set up unless you are on a multi-disk system. 
- A stock Bluefin installation is 11GB. Bluefin with developer mode enabled (`bluefin-dx`) is 19GB.   

In order to set yourself up to success it's useful to plan out your Bluefin installation into three distinct phases, mirroring the systems operations lifecycle. 

# Installation Runbook

Here is a short [runbook](https://www.pagerduty.com/resources/learn/what-is-a-runbook/) for the Bluefin installation process. 

## Day 0 - Planning
Most pain points can be addressed directly by planning ahead of time.

### All Users
  - Is your hardware Linux friendly?
    - Does the hardware require an out of tree kernel module? This may lead to long term maintenance issues. 
    - Is your wireless card supported by Linux?
      - Poorly supported cards include Broadcom
  - Are the applications you depend on well supported on Flathub? 
  - Does your VPN provider provide a wireguard configuration to import into Network Manager?
  - Dedicated disk ready to go?
    - Bluefin does not support dual booting from the same disk
    - Bluefin does not support rebasing from a pre-existing installation of Fedora
  - Do you understand the limitations of having an Nvidia GPU? 
  - Read this documentation in its entirety, and also:
    - [Homebrew](https://docs.brew.sh/) documentation
    - [Flathub](https://docs.flathub.org/) documentation
    - [rpm-ostree](https://coreos.github.io/rpm-ostree/) documentation
    - [bootc](https://containers.github.io/bootc/) documentation - this is a future tool that is currently included but not being used for important tasks, it will replace rpm-ostree in the Fall of 2024

### Developers
 - Do you know [how to use containers](https://docker-curriculum.com/#introduction) for development? 
 - Do you know how to manage [systemd service units](https://systemd.io/) for both the system and user accounts?

## Day 1 - Deployment and Configuration

### Deployment
- Download the right ISO from [the website](https://projectbluefin.io/#scene-picker)
- Install the operating system
    * Use the entire disk with automatic partitioning
    * (Optional): [Set up Secure Boot](introduction.md#secure-boot)
    * (Optional): `ujust switch-channel` to move to `:stable` or `:latest` 

### Configuration
The rest of these steps are user specific configuration and something that we tend to leave up to you. Automating this step is a good place to use tools like [chezmoi](https://www.chezmoi.io/) for dotfile configuration and syncing. Since the user space is all in your home directory, just about any tool you use to automate this step should work as you expect. Ideally, configuration that you might have done at the system level in the past is configured at your user level now, leading to a clean seperation between user configuration and the system image. 

- Software Installation
    * Use GNOME Software to install Flatpaks
        + (Optional): Use Flatseal to manage Flatpak permissions if appropriate
    * (Optional): Install Command line applications via `brew`
- Post-installation Configuration
    * Select/Change default applications as you see fit
    * (Optional) Import your [wireguard configuration via `wg-quick`](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) or use the VPN configuration in the network manager GUI
- (Optional) Developer Configuration
    * `ujust devmode` and follow the directions
    * Start VSCode and configure your settings and extensions
 
## Day 2 - Operations and Maintenance

Bluefin strives to make maintenance as easy as possible, however many of the automated tasks can be run manually. 

- Run a System Upgrade via the menu option or `ujust update` to observe an update and reboot
  - `ujust changelogs` will show incoming changes and updates coming from Fedora
- Subscribe to the [announcements tag](https://universal-blue.discourse.group/tag/announcements) on the Universal Blue forums
- Use the [Warehouse application](https://github.com/flattool/warehouse) to manage Flatpak lifecycle:
    * Pin to an old version or rollback
    * Easily remove applications at once
- `ujust clean-system` to clean up old containers and unused flatpak runtimes

And one more piece of advice: The more you invest into day 0, the smoother your day 1 will be, which results in an even smoother day 2. After that, it's all bragging rights. The `fastfetch` command will be there to remind you of your milestone: 

![image](https://github.com/user-attachments/assets/e1b77128-6aaf-4a95-a9fc-cb1409a176fc)


# Secure Boot

Secure Boot is supported by default providing an additional layer of security. After the first installation, you will be prompted to enroll the secure boot key in the BIOS.

Enter the password `universalblue` when prompted to enroll our key.

If this step is not completed during the initial setup, you can manually enroll the key by running the following command in the terminal:

    ujust enroll-secure-boot-key

Secure boot is supported with our custom key. The pub key can be found in the root of the akmods repository [here](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der). If you'd like to enroll this key prior to installation or rebase, download the key and run the following:

```bash
sudo mokutil --timeout -1
sudo mokutil --import public_key.der
```

[Move on to system administration](administration)
