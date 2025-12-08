---
title: "Documentation updates!"
slug: driver-versions-and-extensions
authors: castrojo
tags: [announcements]
---

We've added two pages of documentation today:

## Driver Versions Page

Regressions suck. And it also sucks finding out where they happened, especially with the power of `bootc switch` available! What good is a switch if you don't know where to switch _to_! I hate looking this up by hand, so we whipped this up:

The [Driver Versions](/driver-versions) page tracks kernel, NVIDIA driver, and Mesa versions across all Bluefin release channels. This consolidated view makes it straightforward to:

- Troubleshoot driver-specific issues - If a recent update broke something, you can identify exactly which driver version changed
- Switch to specific versions - Each release links directly to the GitHub release notes and includes `bootc switch` commands
- Compare channels - See how stable, GTS, and LTS differ in driver versions at a glance

The page includes direct links to upstream release notes for [NVIDIA drivers](https://www.nvidia.com/en-us/drivers/) and [Mesa](https://docs.mesa3d.org/relnotes.html), so you can dig into the details when needed.

## Improved Extensions Section

The [Tips and Tricks](/tips) page has a new refreshed look with extension thumbnails. We haven't touched these in a while, but the reason I was there was to add [Copyous](https://extensions.gnome.org/extension/8834/copyous/) to our list of recommended extensions. This thing is so good! It puts a strip of clipboard items on the top that you can summon:

![Copyous](https://github.com/user-attachments/assets/dc567bd4-3442-4b3c-a87d-38576740bdca)

Kick the tyres and let us know what you think!

## [Discussions](https://github.com/ublue-os/bluefin/discussions/3791)
