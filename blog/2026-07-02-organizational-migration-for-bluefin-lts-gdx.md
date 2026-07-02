---
title: "Organizational Migration for Bluefin LTS/GDX"
authors: [castrojo]
tags: [announcements]
date: 2026-07-02T09:00:00-04:00
---

Hello guardians,

We're starting the transition away from ublue-os/bluefin and bluefin-lts to projectbluefin. This is part of the move to [factory.projectbluefin.io](https://factory.projectbluefin.io). I'll have more details over the next few days. It's our fifth birthday on July 21st so in a way we're kinda relaunching Bluefin. I hope to post updates between now and then so that we can party after.

> **tldr:** GNOME 50, newer kernel support, cleaner OCI layers, NVIDIA as a proper separate image, no more `-dx`/`-gdx` images, all userspace baby! You don't do anything but hang out.

LTS and GDX users, this one's for you, the rest of you will come later. GDX's builds have been struggling so you're going first. Thanks to those who tested; we found real issues that have helped the project.

## Upgrade Instructions

- There are none, this will happen automatically.
- If your Linux Lizard Brain starts to want to jump out of your skull [please follow the manual directions](https://gld.mcphail.uk/posts/how-to-perform-a-major-version-upgrade-on-bluefin/) to upgrade

## `ublue-os/bluefin-lts` → `projectbluefin/bluefin-lts`

The biggest change is image consolidation, DX/GDX images have been merged:

- "Bluefin DX" will be moving off of images and into userspace with `ujust devmode`, if you're missing anything please file an issue.
- "Bluefin GDX" will also be moving to userspace with "ujust aimode", but this doesn't exist yet.
- aarch/amd64 all across the board, even ARM/Nvidia hell yeah! (It's Ampere time!)

We're also adding hooks for the IDEs/tools in Bazaar to highlight some of these. So instead of images these will just be modes you can add on. One of the reasons we were struggling with GDX is the GitHub runners didn't have enough space/resources for something so large.

CUDA can now just be consumed [via containers](https://catalog.ngc.nvidia.com/orgs/nvidia/-/containers/cuda/-?_lr=1) - the `ujust aimode` will look just like the developer mode but we'll have options for pytorch, etc. If you're on an AMD machine you might have seen the preview in `bctl`

![ugly](https://github.com/user-attachments/assets/80c2ed15-1968-4f4f-b939-15982a0360d8)

Wow that's ugly! Now you see why we hid it, but you get the idea, start thinking of bundles. `bctl` is short for bluefin control but probably won't expose it, centralized `just` is just too good.

## OCI Things

These images [use chunka](https://github.com/coreos/chunkah) to create smaller layers, and LTS was already svelte. This brings us in full upstream alignment with `bootc`.

- Signing: We moved from keys to Keyless OIDC (Fulcio/Rekor), ensuring [that my shame will live on in the past](https://www.youtube.com/watch?v=4yVj_c9oJd0). This is nice for custom image builders too, no more pub key in your root and pasting in github secrets to get going. Savage.
- SBOM: Each image has full SBOMs etc, I'm still working on these, but both of these steps are modelled after proper usage according to upstream. The docs, website, and `ujust changelog` will source from these if they aren't already.

The end state is any version of anything that you see on the website should be what's on the latest image and not manually updated.

## Kernels

No one was using vanilla Bluefin LTS (who wants to use 6.12 lol) so we've consolidated everything onto Fedora's kernels

## Other

- GNOME is now 50 across the board
- `:testing` branches will land all code, if you're a nerd hop onto these
- These images are a huge improvement, especially with our testing suite (more info later), however you will for sure find cosmetic issues since we tend to ignore those until the end lol.
- Please use `ujust report`, even for minor issues!

## Migration Schedule

| Legacy Image                  | Auto-Migrated? | Target                                     | Status                 |
| ----------------------------- | -------------- | ------------------------------------------ | ---------------------- |
| `ublue-os/bluefin-gdx:lts`    | Yes, automatic | `projectbluefin/bluefin-lts-nvidia:stable` | Canary rolling out now |
| `ublue-os/bluefin:lts`        | Soon           | `projectbluefin/bluefin-lts:stable`        | After canary validates |
| `ublue-os/bluefin:lts-hwe`    | Soon           | `projectbluefin/bluefin-lts:stable`        | After canary validates |
| `ublue-os/bluefin-dx:lts`     | Soon           | `projectbluefin/bluefin-lts:stable`        | After canary validates |
| `ublue-os/bluefin-dx:lts-hwe` | Soon           | `projectbluefin/bluefin-lts:stable`        | After canary validates |

Feel free to ask questions!

---

### Source Discussion

[GitHub Discussion #4802](https://github.com/ublue-os/bluefin/discussions/4802)
