---
title: Bluefin LTS
slug: /lts
---

# Bluefin LTS (Alpha)
*Achillobator giganticus*

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/13d42ded3cf54250a71ad05aca7d5961)](https://app.codacy.com/gh/ublue-os/bluefin-lts/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![Build Image](https://github.com/ublue-os/bluefin-lts/actions/workflows/build-image.yml/badge.svg)](https://github.com/ublue-os/bluefin-lts/actions/workflows/build-image.yml)

Larger, more lethal [Bluefin](https://projectbluefin.io). `bluefin:lts` is built on CentOS Stream10.

![image](https://github.com/user-attachments/assets/2e160934-44e6-4aee-b2b8-accb3bcf0a41)

# Purpose and Status

Bluefin but based on CentOS Stream 10, for people who prefer long lived Long Term Support. 

![image](https://github.com/user-attachments/assets/48985776-7a94-4138-bf00-d2df7824047d)


#### Blockers

- bootc-image-builder flatpak support
- Secure Boot

#### Next Up 

- Nvidia drivers via their official repo
  - We will add them as soon as it's available, but this lets us ship to non-Nvidia machines asap. 
- Proper DX mode image
- ZFS support 

#### Out of Scope

Diverse akmod support unless someone signs up for it. 

#### Tags and Features

Available with the following tags: 

`bluefin:lts` - stock everything
`bluefin:lts-hwe` - (Doesn't exist yet) - Ships latest LTS kernel, this has a yearly cadence. That way you can start on `lts-hwe `from install and then a year later get the update. This is to ensure `bluefin:lts` stays relevant on newer hardware, especially towards the back half of its life. 

Rebasing: We will explicitly not support rebasing from the Fedora based images and ensure the rebase helper keeps users protected.

Releases: Eventually publish weekly, no daily tags. Though we will push often at first. 

Filesystem: We will keep the filesystems the default as per:

> bketelsen: grandpa wants lts


#### Schedule

This is very aspirational and totally not up to us, but we'll be able to at least gather data at these events: 

- Beta: Early March at [Southern California Linux Expo](https://www.socallinuxexpo.org/scale/22x)
- General Availability: May 2025

### Installation and Caveats

1. Snag the ISO: [download.projectbluefin.io/achillobator.iso](https://download.projectbluefin.io/achillobator.iso)
2. On first boot, install flatpaks: `ujust install-system-flatpaks`
3. Automatic updates aren't working, you need to: `sudo bootc upgrade` by hand for now.
  
[Incoming anaconda PR](https://github.com/rhinstaller/anaconda/pull/6056) for the flatpaks, also:

- Do not rebase to this from an existing Fedora image, ain't no one testing that. Also the filesystems are going to be different, etc. We recommend a VM for now
- Some packages are missing until they get added to the EPEL10 repos.
  - Developer tools are included, -dx split will come later
  - No nvidia builds until Nvidia publishes EL10 drivers
- No akmods or other hwe has been added

## Building

To build locally and then spit out a VM: 

```
just build
just build-iso ghcr.io/ublue-os/bluefin-lts:latest
```

qcow2 file is written to the `output/` directory. Username and password are `centos`/`centos`

Long lived and boring, we expect even less maintenance than Fedora-based Bluefin

## Other Examples

- [HeliumOS](https://codeberg.org/HeliumOS) - Offering a KDE desktop on CentOS Stream/Almalinux
- Valentin Rothberg - [fedora-bootc-workstation](https://github.com/vrothberg/fedora-bootc-workstation/tree/main)
