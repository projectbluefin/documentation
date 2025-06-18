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

Bluefin LTS features backported components like a modern Linux kernel. It features less churn and maintenance over the course of its lifecycle. This image is built differently from Bluefin and Bluefin GTS, and is documented here seperately.

::: 

Bluefin LTS is composed of:

- Mostly the same packages of Bluefin and Bluefin GTS, but built with CentOS Stream 10 and EPEL
- The same features since they share the same source RPMs, just built on CentOS
- Updated Linux kernel from the CentOS
- Backported GNOME desktop
- ARM (aarch64) based images
- The Nvidia version of Bluefin LTS is branded as [Bluefin GDX](/gdx) and designed for AI and other GPU heavy workflows and includes CUDA
  
![Pasted image](https://github.com/user-attachments/assets/3972ac0f-d37e-4e89-ae91-ff1eb76eabeb)

### Rationale

The classic definition of "LTS" or "Enterprise Linux" was to ship older, known good working versions of software. And for a long time it felt like your options were old and working, or new and shiny but may break. But in order to be a good desktop, you have to have good hardware support, and that means newer kernels, etc. Bluefin LTS is more about how regressions are handled more than a strict definition of "things must be old." In our world the applications are always up to date, so the "pace" of the base image isn't as important. 

CentOS has efforts to bring a modern enterprise Linux desktop experience to fruition, Bluefin LTS is just a hello world example of what's possible. In a technical sense: CentOS + EPEL + Hyperscale Kernel + GNOME Backports + Bluefin's RPMs built on top. The _interesting part_ is that since it's delivered via bootc, the end user gets it as a finished product. In the old days this would be Ubuntu LTS + backports + PPAs, etc. and that is the world we're moving away from. 

:::warning

While our payload is less churny than Fedora, note that this is still a new image, this project is still in beta.

:::

### Blockers

- Secure Boot

### Next Up 

- ZFS support

### Status

- There are instances when something from Bluefin is not implemented in Bluefin LTS. Please [file an issue](https://github.com/ublue-os/bluefin-lts/issues) and tag it with `parity` and the team will investigate. They'll never _exactly_ but we can get the important ones done
- We haven't settled on a kernel
- Appimages are hard unsupported (those fuse packages aren't even in CentOS)
- Local Layering is disabled by default

Due to it's nature Bluefin LTS is stable _in practice_, the reason it is tagged as Beta is that we want to let it cook for a while. After a few major upgrades and the community feels like it's been enough then we'll be done. Exciting times ahead!

## Installation

:::danger

Do NOT rebase to this image from an existing Bluefin, Aurora, Bazzite, or Fedora system. This warning is in red for a reason. 

:::

### Installation 

Check the [downloads page](./downloads.md) to download the correct ISO. 

The only Bluefin LTS available with Nvidia drivers is [Bluefin GDX](/gdx). If you select Nvidia on the website it will download this ISO. Read this documentation first since it applies to Bluefin GDX. 

:::warning

The ISO uses Fedora to install Bluefin LTS, this is confusing because it will say Fedora but install a CentOS based image. We're working on fixing the branding to hide this from you because that's just bonkers.

:::

**Do not rebase to this from an existing Fedora image, ain't no one testing that.**

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

### Images

- [Repository](https://github.com/ublue-os/bluefin-lts)

The following images and tags are available:

- `bluefin:lts` - base LTS experience using the CentOS [Hyperscale SIG](https://sigs.centos.org/hyperscale/) kernel - currently 6.13.8
- `bluefin-gdx:lts` - includes Nvidia drivers and associated CUDA tooling. This is the only image with Nvidia drivers. See [Bluefin GDX](/gdx)
- `bluefin:lts-testing` - adds GNOME 48 as a backport
- `bluefin-gdx:lts-testing` - adds GNOME 48 as a backport


All images offer Bluefin's [Developer Mode](/bluefin-dx).
  
#### Other features

- Rebasing: We will explicitly not support rebasing from the Fedora based images and ensure the rebase helper keeps users protected.
- Releases: Builds publish weekly on Tuesdays, the images will update as often as the team is developing and will settle down into weeklies as the project matures

#### Schedule

This is very aspirational and totally not up to us, but we'll be able to at least gather data at these events: 

- General Availability: Summer 2025

## Building Locally 

To build locally and then spit out a VM: 

```bash
git clone https://github.com/ublue-os/bluefin-lts
cd bluefin-lts
just build
just build-qcow2 ghcr.io/ublue-os/bluefin:lts # if you want to build an ISO just change qcow2 to iso instead
```

The [qcow2](https://qemu-project.gitlab.io/qemu/system/images.html) file will be written to the `output/` directory. Default username and password are `centos`/`centos`

#### Hibernation Enabled by Default

Hibernation is on by default in a suspend-then-hibernate configuration. Here is the [exact config](https://github.com/ublue-os/bluefin-lts/blob/c0c8e2166cb5d0c4dd511ab3f677450c2cf8de0c/build_scripts/40-services.sh#L6). The device will suspend then go into hibernation after two hours. See the [systemd-sleep.conf](https://www.freedesktop.org/software/systemd/man/latest/systemd-sleep.conf.html) documentation.

Note that secureboot and hibernation are mutually exclusive. We do not yet offer secureboot enabled images of Bluefin LTS, if you need that functionality now we recommend the normal Bluefin and Bluefin GTS images.  

## Supporting Bluefin LTS

The team appreciates your support!

- <a class="github-button" href="https://github.com/sponsors/tulilirockz" data-color-scheme="no-preference: light; light: light; dark: dark;" data-icon="octicon-heart" data-size="large" aria-label="Sponsor tulilirockz">Sponsor</a> [Tulip Blossom](https://github.com/tulilirockz)- Lead Raptor Wrangler
