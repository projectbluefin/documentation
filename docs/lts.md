---
title: Introduction to Bluefin LTS
slug: /lts
---

# Bluefin LTS (Beta)
*Achillobator giganticus*

![achillosmall](https://github.com/user-attachments/assets/b6945e80-34e4-44bb-8518-91ad31fed56d)


Larger, more lethal [Bluefin](https://projectbluefin.io). `bluefin:lts` is built on CentOS 10.

## Purpose

Bluefin LTS is a workstation designed for people who prefer Long Term Support. 
This species of raptor is for users who prefer a slower release cadence, about a three-to-five year lifespan on a single release.

:::info[Redefining the LTS]

Bluefin LTS features backported components like a modern Linux kernel from the CentOS [Hyperscale SIG](https://sigs.centos.org/hyperscale/). It features less churn and maintenance over the course of its lifecycle. This image is built differently from Bluefin and Bluefin GTS, and is documented here seperately.

::: 

Bluefin LTS is composed of:

- Mostly the same packages of Bluefin and Bluefin GTS, but built with CentOS Stream 10 and EPEL
- The same features since they share the same source RPMs, just built on CentOS
- Updated Linux kernel from the CentOS [Hyperscale SIG](https://sigs.centos.org/hyperscale/) - currently 6.13.8.
- ARM (aarch64) based images

In the future we will investigate bringing newer versions of the GNOME desktop to Bluefin LTS as appropriate.

![Pasted image](https://github.com/user-attachments/assets/3972ac0f-d37e-4e89-ae91-ff1eb76eabeb)


:::warning

While our payload is less churny than Fedora, note that this is still a new image, this project is still in beta.

:::

### Blockers

- bootc-image-builder flatpak support
- Secure Boot

### Next Up 

- ZFS support

### Images

- [Repository](https://github.com/ublue-os/bluefin-lts)

The following images and tags are available:

- `bluefin:lts` - base LTS experience using the CentOS [Hyperscale SIG](https://sigs.centos.org/hyperscale/) kernel - currently 6.13.8
- `bluefin-gdx:lts` - includes Nvidia drivers and associated CUDA tooling. This is the only image with Nvidia drivers. See [Bluefin GDX](/gdx)

All images offer Bluefin's [Developer Mode](/bluefin-dx).
  
#### Hibernation Enabled by Default

Hibernation is on by default in a suspend-then-hibernate configuration. Here is the [exact config](https://github.com/ublue-os/bluefin-lts/blob/c0c8e2166cb5d0c4dd511ab3f677450c2cf8de0c/build_scripts/40-services.sh#L6). The device will suspend then go into hibernation after two hours. See the [systemd-sleep.conf](https://www.freedesktop.org/software/systemd/man/latest/systemd-sleep.conf.html) documentation.

Note that secureboot and hibernation are mutually exclusive. We do not yet offer secureboot enabled images of Bluefin LTS, if you need that functionality now we recommend the normal Bluefin and Bluefin GTS images.  

#### Other features

- Rebasing: We will explicitly not support rebasing from the Fedora based images and ensure the rebase helper keeps users protected.
- Releases: Builds publish weekly on Tuesdays, the images will update as often as the team is developing and will settle down into weeklies as the project matures
- Filesystem: We will keep the filesystems the default

#### Schedule

This is very aspirational and totally not up to us, but we'll be able to at least gather data at these events: 

- General Availability: May 2025

## Installation and Caveats

:::danger

Do NOT rebase to this image from an existing Bluefin, Aurora, Bazzite, or Fedora system. This warning is in red for a reason. 

:::

### 1. Snag the ISO

Check the [downloads page](./downloads.md) to download the correct ISO.

### 2. On first boot, install flatpaks: `ujust install-system-flatpaks`
  
This is a working around until Flatpaks can be put on the ISO: [Incoming anaconda PR](https://github.com/rhinstaller/anaconda/pull/6056) for the flatpaks, also:

- **Do not rebase to this from an existing Fedora image, ain't no one testing that.** Also the filesystems are going to be different, etc. We recommend a VM for now
- No akmods or other hwe has been added

## ARM Support

### Using it in a VM on an Apple Silicon Mac

[UTM](https://github.com/utmapp/UTM/) can boot these images if suitably configured:

*   File → New, then select Virtualize
*   Select Linux, then enable "Use Apple Virtualization" (The QEMU virtualization backend can also work, but this works better on Apple Silicon.)
*   Browse for the Bluefin LTS ISO.
*   It should default to 4GB of RAM; this is a good minimum value.
*   On the Summary screen, it is not necessary to check the "Open VM Settings" box; while you may wish to adjust the configuration of the VM before first boot, the defaults are sensible.

:::info[MacOS setups wanted]

If there are other ways to set this up on MacOS please considering sending a pull request!

:::

## Building Locally 

To build locally and then spit out a VM: 

```bash
git clone https://github.com/ublue-os/bluefin-lts
cd bluefin-lts
just build
just build-qcow2 ghcr.io/ublue-os/bluefin:lts # if you want to build an ISO just change qcow2 to iso instead
```

The [qcow2](https://qemu-project.gitlab.io/qemu/system/images.html) file will be written to the `output/` directory. Default username and password are `centos`/`centos`

## Supporting Bluefin LTS

The team appreciates your support!

- <a class="github-button" href="https://github.com/sponsors/tulilirockz" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-heart" data-size="large" aria-label="Sponsor tulilirockz">Sponsor</a> [Tulip Blossom](https://github.com/tulilirockz)- Lead Raptor Wrangler
