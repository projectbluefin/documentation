---
title: "Bluefin Gaming Mode and Dakota Alpha 5"
slug: dakota-alpha-5
authors: castrojo
tags: [development]
date: 2026-08-02T20:41:00-04:00
---

Guardians ... a new Dakota arrives, likely our last before beta. @ahmedadan brings us an example of the power we can wield with [BuildStream](https://buildstream.build/) and The Final Shape. (Ask him about his COSMIC image!)

The builder is back in business and we now have enough institutional knowledge to make getting a new one and swapping it in easier. Improvements in the tooling in general has helped. And my homelab is doing from-source builds in 8 minutes, that's 4 minutes faster than assembling RPMs. We intend to make it trivial for anyone to deploy these on any modern infra. Buildstream and Kubernetes is a beautiful thing. 

The world has changed! Here's the good stuff.

<iframe
  width="560"
  height="315"
  src="https://www.youtube.com/embed/1LIQdBlKmG8"
  title="Bluefin Gaming Mode (feat. Rafael) / Dakota Alpha 5"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  referrerpolicy="strict-origin-when-cross-origin"
  allowfullscreen
></iframe>

## What it comes with

First let's get the versioning out of the way. Since we're based on [freedesktop-sdk](https://gitlab.com/freedesktop-sdk/freedesktop-sdk) project we'll use their version. In this case, 25.08.11. The 11th release of the August 2025 major update. 26.08 is our next update. Yes, that's next month. :) Bluefin will remain versionless and tested as a whole, you'll just switch aggressiveness with game mode if you want:

- Kernel: 7.0.11
- Game Mode Kernel: 7.1.4-ogc1
- GNOME Shell: 50.3
- freedesktop-sdk: 25.08.11
- bootc: 1.16.6
- systemd: 260.2
- Podman: 5.8.2
- Flatpak: 1.18.0
- :testing GNOME 50 development builds
- :stable Publishing daily if tests pass, moving to every other day for beta, weekly for GA
- :next GNOME 51 rolling builds, currently busted.

We're helping out [GNOME OS](https://os.gnome.org/) by shipping a new zswap configuration, based on their inprogress work upstream. Dakota uses zswap backed by a disk swapfile, rather than zram.

- `zswap.enabled=1` keeps recently swapped pages compressed in RAM, avoiding disk I/O when they are needed again.
- `zswap.compressor=zstd` selects Zstandard: generally a good compression-ratio/CPU-speed balance.
- `zswap.max_pool_percent=20` caps the compressed RAM pool at 20% of installed memory.
- `zswap.shrinker_enabled=1` lets the kernel reclaim zswap memory under pressure by writing colder compressed pages to the backing swapfile.
- `vm.swappiness=100` makes the kernel treat reclaiming anonymous memory to swap as comparable in cost to reclaiming file cache. Since zswap absorbs the initial swap writes in RAM, this aims to preserve filesystem cache without immediately incurring disk latency.

The backing store is `/var/swap/swapfile`, created on demand at `min(RAM / 2, 8 GiB)` when the disk is large enough. Dakota explicitly disables GNOME OS's zram device, so it does not stack zram and zswap; The kernel arguments live in `/usr/lib/bootc/kargs.d/20-zswap.toml`, so bootc applies them on image switches and upgrades.

Feel free to give feedback on the swap stuff, it's an exciting area where we can hope to help out GNOME!

## Open Gaming Collective

As part of our mission to improve the Linux desktop we're offering a "Game Mode" to Bluefin, which will pull in a bunch of stuff. It will be available in a checkbox in the control panel and is basically a lightweight Bazzite-lite built with BuildStream.

Yes, an [OGC gaming kernel](https://github.com/OpenGamingCollective/linux) with aggressive updates but at least upgrades will work, lol. It will slay, so it is also aliased to `dakota:btw`. For the discerning raptor rider.

- The kernel includes gaming-focused patches/features, including sched_ext and ntsync
- Steam and its 32-bit compatibility libraries and controller udev rules, etc all built in - this is basically the Steam flatpak, you'll show up as "Freedesktop" in the Steam Charts
- Gamescope and the Steam Big Picture gamescope session
- GameMode, MangoHud, and vkBasalt for performance management, metrics, and post-processing.
- InputPlumber, SDL controller database, and handheld/controller support. Note that we don't support handhelds but shrug it's all Linux.
- All that extra Vulkan, SDL, audio, X11, USB, and input compatibility libraries for native games and stuff. Shout out to Kyle Gospo for the guidance!
- First-boot Flathub installs for Lutris, Heroic, Bottles, ProtonPlus, Protontricks, and GOverlay.

And I'm sure I missed some.

## How to Get It

There will be a GUI for this soon, in the meantime enjoy!

| Image         | Stream  | Command                                                                 |
| ------------- | ------- | ----------------------------------------------------------------------- |
| Gaming        | Stable  | `sudo bootc switch ghcr.io/projectbluefin/dakota-gaming:stable`         |
| Gaming        | Testing | `sudo bootc switch ghcr.io/projectbluefin/dakota-gaming:testing`        |
| NVIDIA Gaming | Stable  | `sudo bootc switch ghcr.io/projectbluefin/dakota-nvidia-gaming:stable`  |
| NVIDIA Gaming | Testing | `sudo bootc switch ghcr.io/projectbluefin/dakota-nvidia-gaming:testing` |

## ISO Downloads

- [Dakota Alpha 5 ISO](https://projectbluefin.dev/dakota-live-alpha5.iso)
- [Latest Dakota daily snapshot](https://projectbluefin.dev/dakota-live-latest.iso)
