---
title: Installing Bluefin on a T2 Mac
author: Chris Lauretano
slug: /t2-mac
---

This is an addendum to the [Bluefin installation runbook](/introduction.md) for T2 Macs, supporting the project's goal of sustainability by enabling Bluefin installation on the final generation of Intel Macs (2018-2020). Apple ends support for them after 2024.

Please read the original [Bluefin installation runbook](/introduction.md) as the contents of it are not reproduced here. Section Headings match up where possible.

## Day 0 - Planning

With the specialized hardware needs of your T2 Mac, and Apple's mostly non-support of anything other than MacOS on their hardware, some major caveats exist for using Bluefin. Consider your personal use case, these may not be an issue on a Mac Mini or a docked laptop, but may be frustrating in a highly mobile scenario.

### All Users

- Is your hardware Linux friendly?
  - No! Not even the keyboard and trackpad on a MacBook Pro works with the mainline linux kernels. One of the least friendly, most proprietary x86 laptops. But it works. Since Bluefin switched to fsync kernel, the patches needed are already present.
  - sleep/suspend broke in a recent Apple firmware update (late 2023) and remains broken.
- Is your wireless card supported by Linux?
  - Of course not, Apple used Broadcom. The firmware can't be installed directly by the end user, requiring rebasing to a personal or community custom image of Bluefin that includes the firmware files in the image. In the future, this can be packaged as a custom image like Surface/Asus.

## Day 1 - Deployment and Configuration

### Deployment

1. Start by downloading the standard Laptop image of [Project Bluefin](https://projectbluefin.io/).

:::note[Dual-boot support]

Anaconda, the installation software Bluefin uses doesn't support a dualboot for OCI deployments, so install on a Mac you don't need MacOS on or to a USB/Thunderbolt SSD.

:::

#### Create a Bluefin USB

Using dd, [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/), or similar.

#### Install Bluefin

:::note[This is madness]

An External keyboard and mouse are required to install Bluefin on T2 at this time, and on-boot to unlock an encrypted disk (until a command is run later).

:::

1. With your Mac off, connect an external keyboard and mouse, and insert your Bluefin USB 
2. Hold the option (alt on a Windows keyboard) key and power on your Mac.
3. At the boot menu, select "EFI Boot" (it'll have a USB icon). Click Continue.
4. At the Fedora installer boot screen, select to test your media or not before the install.
5. When the installer starts, select the language you'd like to use to get to the main menu.
6. At the main installer menu, select Installation Destination to choose your installation disk. Use automatic partitioning. If using an external drive, make sure your internal drive isn't also selected (with a checkbox) as this could cause the MacOS EFI bootloader on your internal drive to be modified.
   > Note that if you use encryption, you'll need an external keyboard every boot until you run a post-install command.
7. With all the prerequisites set, proceed to install. Not a lot of detailed progress is shown here but if you are comfortable switching to other TTYs and use tmux ([Donate](https://github.com/sponsors/tmux)) there's lots of logging happening. The install doesn't take very long (faster than getting a blank Mac to internet recovery mode).
8. Click Finish Installation and then reboot into your new Bluefin install!

### Configuration (Required) for T2

:::note

Please note that wifi/bluetooth firmware cannot be layered in via a package. On traditional systems the firmware can be [extracted from a MacOS install (T2Linux Wiki)](https://wiki.t2linux.org/guides/wifi-bluetooth/#on-linux), but on Bluefin these files have to be brought in as a containerfile layer or script in a custom image.

:::

:::note

Please also note that suspend/sleep doesn't work in most cases, if a Mac has firmware version v13.5 or newer. There are various workarounds.

:::

Here, you have a choice to make. If you need wifi/bluetooth firmware, you'll need to rebase to a custom or community T2-specific Bluefin image. If not, you can layer several packages to get same experience as the T2-specific images. See the table below for a breakdown and the steps below that.

|                                | T2-Specific Bluefin Image | Layered Packages         | Bluefin                                      |
| ------------------------------ | ------------------------- | ------------------------ | -------------------------------------------- |
| T2-Patched Kernel              | **yes, fsync**            | if base image uses fsync | **yes, fsync on latest, fsync-ba on stable** |
| Internal Keyboard and Trackpad | **yes**                   | **yes**                  | **yes**                                      |
| Touchbar                       | **yes**                   | possible                 | no                                           |
| T2 Audio                       | **yes**                   | possible via copr        | no                                           |
| Fan control                    | **yes**                   | possible                 | no                                           |
| Hybrid Graphics                | **configurable**          | possible                 | no                                           |
| Wifi / Bluetooth Firmware      | possible                  | _no_                     | _no_                                         |
| Deep Sleep                     | _no_                      | _no_                     | _no_                                         |

For more detailed information on overall Linux hardware support on T2 Macs (such as that the Touch ID doesn't work), check the [T2Linux Wiki](https://wiki.t2linux.org).

#### Rebasing to a T2-Specific Bluefin Image

You can create a custom image of Bluefin to include the needed broadcom wifi/bluetooth firmware for your mac. Currently, a community project by a Bluefin fan, [T2-Atomic](https://github.com/lauretano/t2-atomic), exists publishing Bluefin/Aurora images with all of the T2-enablement pieces in place. Feel free to use this as a resource in creating your own custom image.

##### Community Custom Images:

- [T2-Atomic](https://github.com/lauretano/t2-atomic) - images build daily in sync just after the scheduled Bluefin builds. Copy/paste these strings into the rebase commands below where noted):
  - lauretano/t2-atomic-bluefin:latest
  - lauretano/t2-atomic-bluefin-dx:latest
  - lauretano/t2-atomic-aurora:latest
  - lauretano/t2-atomic-aurora-dx:latest

To rebase to these images, similar to rebasing to Bluefin from Silverblue, you need to first rebase to an unsigned image, then again to the signed image.

1. Rebase to the unsigned image, replacing "[repo/bluefin-package:tag]" with the repo and image variant of your choice or creation:

`sudo bootc switch ghcr.io/[repo/bluefin-package:tag]`

2. Reboot `systemctl reboot`

3. Rebase to the signed image, again replacing "[repo/bluefin-package:tag]" with the repo and image variant of your choice:

`sudo bootc switch ghcr.io/[repo/bluefin-package-:tag --enforce-container-sigpolicy`

See the [T2-Atomic](https://github.com/lauretano/t2-atomic) readme for details on other images (Sway, Cosmic, vanilla Silverblue) available.

#### Manual Installation (Layering Packages)

In a terminal, you'll install several packages and enable some daemons needed to run your T2. You'll install t2fanrd rust-tiny-dfr for touchbar management, and t2linux-audio for basic T2 audio support

1. Install SharpenedBlade's T2Linux copr: `sudo curl -o /etc/yum.repos.d/sharpenedblade-t2linux-fedora-40.repo https://copr.fedorainfracloud.org/coprs/sharpenedblade/t2linux/repo/fedora-40/sharpenedblade-t2linux-fedora-40.repo`

2. Install T2-specific packages: `sudo dnf install t2fanrd rust-tiny-dfr t2linux-audio` and reboot when prompted.

3. After a reboot, ensure t2fanrd is running with `systemctl status t2fanrd`. Fan speed curves can be managed by editing `/etc/t2fanrd.conf`. See [T2FanRD](https://github.com/GnomedDev/T2FanRD) for details.

4. Enable T2-appropriate kernel arguments.
   In a terminal, run: `rpm-ostree kargs --append-if-missing=intel_iommu=on --append-if-missing=iommu=pt --append-if-missing=mem_sleep_default=s2idle` and reboot when prompted.

### Day 2-3 Post-Install Refinement for T2

#### Allow internal keyboard during early boot (LUKS encryption unlock)

Enable initramfs regeneration. This will enable dracut to run during upgrades, allowing us to configure the apple-bce module to load during early boot. `rpm-ostree initramfs enable` --Note that initramfs generation adds a fair bit of local CPU time after normal rpm-ostree upgrade processing happens.

- If layering T2 packages, create a config file that loads the apple-bce module: `echo "force_drivers+=\" apple-bce \"" | sudo tee /etc/dracut.conf.d/t2linux-modules.conf`

- If using T2-Atomic, /etc/dracut.conf.d/t2-bce.conf should already be present.

#### Hybrid Graphics

See [Hybrid Graphics at T2Linux Wiki](https://wiki.t2linux.org/guides/hybrid-graphics/). Only the section about enabling the iGPU (creating apple-gmux.conf) is required. The radeon will generally run in "low" power mode when the iGPU is being used, since it mostly isn't used. As of 2024, dGPU power cannot be toggled (the radeon will always be on) but power/heat is reduced just by using the iGPU for most tasks.

If using a T2-Atomic image, edit `/etc/modprobe.d/apple-gmux.conf` and uncomment the "options" line.

#### Tuned DSP Audio

Sound quality on the 16" MacBook pro can be substantially improved using a tuned software DSP created by the Asahi Linux team and brought to T2 Linux. Please read [T2 Apple Audio DSP (@lemmyg on GitHub)](https://github.com/lemmyg/t2-apple-audio-dsp/tree/speakers_161) for details. The .wav files for the MacBookPro16,1 are already included on T2-Atomic images and can be included in your own custom image.

- If layering packages, install dependencies with `sudo dnf install calf libspatialaudio lsp-plugins-lv2 lv2-calf-plugins ladspa-swh-plugins pipewire-module-filter-chain-lv2`
- If using T2-Atomic, these dependencies are already installed. Rename the disabled config file and reboot. `sudo mv /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.confdisabled /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.conf`

#### Disabling Sleep/suspend, Lid switch, etc

To prevent the system from sleeping, we'll configure systemd to ignore the lid switch and to configure the power button to shut down instead of suspend:

##### Manual Install:

1. In a terminal, run:

```
sudo mkdir -p /etc/systemd/login.conf.d
sudo touch /etc/systemd/login.conf.d/t2-lidswitch.conf
```

2. Edit `/etc/systemd/login.conf.d/t2-lidswitch.conf` to have the following contents, which will override the default system-wide config in `/usr/lib/systemd/logind.conf`:

```
[Login]
# we generally want to ignore or poweroff, no suspend since it doesn't work on T2s
HandlePowerKey=ignore
HandlePowerKeyLongPress=poweroff
HandleSuspendKey=ignore
HandleSuspendKeyLongPress=poweroff
HandleHibernateKey=ignore
HandleHibernateKeyLongPress=poweroff
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

##### T2-Atomic:

The file `/etc/systemd/login.conf.d/t2-lidswitch.conf` should exist with the same settings seen above. It disables the lid switch (remember to shut your laptop down!) and sets the power button action to shut down as well.

###

#### Disable T2 USB Ethernet Notification Spam

The T2 Chip presents an internal USB ethernet interface that connects and disconnects. This ethernet interface is not used in Linux at this time, so the modules can be blocked from loading to stop these notifications from clogging your desktop and logs.

##### Manual Install:

Edit the file `/etc/modprobe.d/t2-eth-blocklist.conf` and include the following content:

```
blacklist cdc_ncm
blacklist cdc_mbim
```

##### T2-Atomic:

This file should already be present. If you still receive the notifications you may need to disable the interface on your computer in another way.
