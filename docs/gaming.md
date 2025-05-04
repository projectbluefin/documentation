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

### Steam

Steam is a software distribution service with an online store, automated installation, automatic updates, achievements, SteamCloud synchronized savegame and screenshot functionality, and many social features. If you want to play any Windows game, go to Steam -> Settings -> Compatibility -> Enable SteamPlay for all other titles. Compatibility for games varies, for more information consult [ProtonDB](https://www.protondb.com/)

*Note: To add a game library on another drive, first you need to grant the app access to it:*

`flatpak override --user --filesystem=/path/to/your/Steam/Library com.valvesoftware.Steam`

### Heroic Games Launcher

Heroic is an Open Source Games Launcher that supports running Epic Games Store, GOG, and Prime Gaming games. 

### Lutris

Lutris can be thought of as a Swiss-army knife for gaming on Linux. It uses existing emulators, engine re-implementations and compatibility layers, it gives you a central interface to launch all your games. Check out [Lutris's Websites](https://lutris.net/) to check out many of the games it supports.

### ProtonPlus

ProtonPlus is a tool to configure Proton (the compatibility layer to enable Windows game). It supports editing Proton in Steam, Heroic Games Launcher, and Bottles

###  GPU Screen recorder

GPU Screen recorder is a screen recorder that has minimal impact on system performance by recording a monitor using the GPU only, similar to shadowplay on windows. This is the fastest screen recording tool for Linux. This screen recorder works on X11 and Wayland on AMD, Intel and NVIDIA. 

### Gamescope 

Gamescope is a microcompositor made by Valve that allows you to spoof the resolution of your screen. This can be useful in exotic display configurations like ultrawide or multi-monitor setups that involve rotation.

*Note: This is a runtime, not an app and must be ran from the commandline with:*

`flatpak run runtime/org.freedesktop.Platform.VulkanLayer.gamescope /path/to/your/executable`

### OBS VkCapture

This is an [OBS Studios](https://obsproject.com/) plugin that allows you to directly capture Vulkan and OpenGL windows. You can use it by adding Game Capture in OBS and then adding `obs-gamecapture %command%` as a launch command for games you want to record (For example: In Steam).

### Mangohud

A Vulkan and OpenGL overlay for monitoring FPS, temperatures, CPU/GPU load and more. To enable it, add `mangohud %command%` to your launch option or alternatively add `MANGOHUD=1` to your shell profile (Vulkan only)

*Note: You need to add the following command so that Steam games can access Mangohud:*

`flatpak override --user --env=MANGOHUD=1 com.valvesoftware.Steam`

### Steam Tinker Launch

Steam Tinker Launch is a versatile Linux wrapper tool for use with the Steam client which allows for easy graphical configuration of game tools, such as GameScope, MangoHud, modding tools and a bunch more. It supports both games using Proton and native Linux games. Check out the [feature list](https://github.com/sonic2kk/steamtinkerlaunch/wiki#features) to see supported features. 

### Raw list of Flatpaks

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

