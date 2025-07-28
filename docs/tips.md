---
title: Tips and Tricks
slug: /tips
---

This section contains miscellaneous tips and tricks that may not be core documentation.

## Maintainer Recommended Extensions

Here are some GNOME extensions that the maintainers recommend to round out your experience. Remember to support extension authors by donating to the ones you love! Talk to a maintainer before PRing something here as this is an opinionated list. :)

- [Just Perfection](https://extensions.gnome.org/extension/3843/just-perfection/) - adds a ton of configuration options in one config app. Useful for config junkies!
- [Tiling Shell](https://extensions.gnome.org/extension/7065/tiling-shell/) - our recommended Tiling extension
- [Night Theme Switcher](https://extensions.gnome.org/extension/2236/night-theme-switcher/)
- Quick Settings [Audio Hider](https://extensions.gnome.org/extension/5964/quick-settings-audio-devices-hider/) and [Audio Renamer](https://extensions.gnome.org/extension/6000/quick-settings-audio-devices-renamer/) - Lets you rename your audio devices so they are human readable instead of model numbers, etc. The Hider then lets you remove inputs/outputs you may not be using, it helps to clean up the menu:

![image](https://github.com/user-attachments/assets/e464a88b-1a2d-4fa3-8a6b-e2ebfb0dda53)

- [Wiggle](https://extensions.gnome.org/extension/6784/wiggle/) - Another "I want my system to look like a Mac" extension, but honestly it is quite handy for finding your cursor most of the time

![Wiggle Demonstration](https://extensions.gnome.org/extension-data/screenshots/screenshot_6784_NnfNleK.gif)

- [Control monitor brightness and volume with ddcutil](https://extensions.gnome.org/extension/6325/control-monitor-brightness-and-volume-with-ddcutil/) - Lengthy name, but for sure really useful! I've never known that my external monitors even had those capabilities before I tested it out.

![Ddcutil Demonstration](https://extensions.gnome.org/extension-data/screenshots/screenshot_6325_iQnSUzg.png)

## Bluefin to Go: Using an external drive

You can install Bluefin on an external drive to get a portable Bluefin installation:

![bluefin-drive](https://github.com/user-attachments/assets/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2)

**Don't forget to select full disk encryption during installation!**

Use Cases:

- Great way to try Linux, if you like it, move the drive into your main machine without needing to reinstall.
  - Or if you want to commit, buy a new drive for your PC and then put your existing OS in an external case so you have a backup. Over time you may even put it in a drawer. 😈
- Temporarily repurposing a machine.
- Sharing a PC with a partner and you don't want to argue about Linux.
- Trying out hardware before purchasing.
- "Hot desking" and existing machine in an office.
- Great for the homelab! Put all your favorite tools on there!
- From @mikes-tech-tips: Add a Bluefin DX drive to your docked [Bazzite powered](https://bazzite.gg) handheld. Party in the front, business in the back.

### Windows to Go

You can also do the inverse, use [Rufus](https://rufus.ie) to install Windows onto an external drive in [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go) mode.

Use cases are keeping Windows around for:

- Hardware that may need Windows to update firmware.
- Critical applications that have no equivalent in Linux, but you don't use it that often. Tax software, for example.
- Your relatives are visiting and you don't want to argue about Linux.
- You play Destiny 2.

## Building Your Own Bluefin

Bluefin can be extended via a custom image. Similarly to how we derive from bootc-enabled containers and add our own opinions, users are free to build upon (or strip down) Bluefin however they see fit.  
Use the [image template](https://github.com/ublue-os/image-template) to make your own custom Bluefin image.

> The operating system being used to draft these words is the product of my own artistic and creative expression – built on the work of countless other human beings. And that brings me joy.
>
> - [@ledif](https://blues.win/posts/joy-of-linux-theming/)

Here are the maintainer custom images if you're looking for examples:

- m2Giles, [m2os](https://github.com/m2Giles/m2os)
- bsherman, [bOS](https://github.com/bsherman/bos)
