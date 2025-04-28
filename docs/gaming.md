---
title: Gaming
slug: /gaming
---

Bluefin offers gaming tools [from Flathub](https://flathub.org/) to provide a gaming experience.

:::info[Is this any good for gamers?]

Most of the gaming experience depends on: An updated Linux kernel, updated MESA libraries, and updated firmware and other hardware enablement. Nvidia users need those drivers as well. All Universal Blue images deliver these critical components on a regular basis and are suitable for gaming. When those components are in place the performance in gaming tends to not differ much between other images and Linux distributions. It's all Linux. 

:::

Note that this experience is for general use case gaming and doesn't cover Virtual Reality headsets and other deep gaming customization.[Consider using Bazzite](https://bazzite.gg) instead. It features a more aggressive kernel update cadence than Bluefin for people who want to live on the leading edge.

## Installation

Run `ujust install-gaming-flatpaks`. 

There is no need to reboot. This will install the following software:

## Software Included

```
app/com.valvesoftware.Steam/x86_64/stable
app/com.heroicgameslauncher.hgl/x86_64/stable
app/net.lutris.Lutris/x86_64/stable 
app/com.vysp3r.ProtonPlus/x86_64/stable 
app/com.dec05eba.gpu_screen_recorder/x86_64/stable 
app/com.github.Matoking.protontricks/x86_64/stable 
runtime/org.freedesktop.Platform.VulkanLayer.gamescope/x86_64/24.08 
runtime/org.freedesktop.Platform.VulkanLayer.gamescope/x86_64/23.08 
runtime/org.freedesktop.Platform.VulkanLayer.OBSVkCapture/x86_64/24.08 
runtime/com.obsproject.Studio.Plugin.OBSVkCapture/x86_64/stable 
runtime/org.freedesktop.Platform.VulkanLayer.MangoHud/x86_64/24.08
runtime/org.freedesktop.Platform.VulkanLayer.MangoHud/x86_64/23.08 
runtime/com.valvesoftware.Steam.Utility.steamtinkerlaunch/x86_64/stable
```

:::warning[This list is awful!]

Translating this to something users can understand with a quick description of each included package would really help us out! Contributions welcome!

:::
