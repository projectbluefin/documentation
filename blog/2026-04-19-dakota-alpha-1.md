---
title: "Bluefin Dakota Alpha 1"
slug: dakota-alpha-1
authors: castrojo
tags: [announcements]
---

Today we celebrate a nice milestone for the project. Thanks to some awesome work by the team we have a mostly daily-driveable Alpha 1. GNOME 50 too!

## What is this?

"Dakotaraptor" is the codename for Bluefin based on GNOME OS. It is designed to deliver software from upstream sources and eschews the traditional Linux distribution model entirely. It's built with [Apache Buildstream](https://buildstream.build) and published as a `bootc` image.

- GNOME 50, Linux 6.19.11, Freedesktop 25.08.9 libraries

GNOME OS itself has moved on to GNOME 51 builds, so we are on a stable branch. I'm pretty sure we're the first ones to consume this thing so keep an eye out for issues. We're still recommending VMs but it's also running fine on bare metal given the following issues. Goal is beta late spring. 

![dakota](https://github.com/user-attachments/assets/4ff5c04e-c22e-4e45-8daa-18ddd5c66f00)

Those of you with keen eyes might notice the new snazzy menu Dylan Taylor landed. It's [Custom Command Menu](https://github.com/StorageB/custom-command-menu) and the upstream author was kind enough to accept our patch to put your hostname right there in your menu for a little bit of bling. We're working on bringing this to other Bluefins so sit tight. Lots of great customization options with this menu, I am enjoying it. You may have also noticed that we're using Ghostty here as the terminal. 

## Gotchas

- LUKS is busted so skip the encryption step on install. 
- Updates are one big layer. We're working on this actively and it's looking good but it will land later.
  - Updates will first come split up into 120 layers but will still be large.
  - At some point this late spring/early summer zstd:chunked support should land in `bootc` and then you'll start receiving delta updates. We'll announce when this is live. 
- Many of the issues are cosmetic and "fit and finish" - you should not be having crashers or anything crazy like that.
- Some parts of the build are old, we have not automated bumping version numbers of components so that's being done manually right now. So if you find an old version of something we'll get to them eventually.
- No Nvidia support. 
- A sort of working ARM build, more to come. 
- Pretty sure docker doesn't work. 

## Thanks!

- Jordan Pietridis, Valentin David, Adrian Vovk, and the rest of the GNOME OS team.
    - Thanks for your patience and guidance!
- Brian Ketelsen and James Reilly for porting the Vanilla OS installer to use bootc: [Tuna installer](https://github.com/tuna-os/tuna-installer). Yes, James' personal image is called Tuna OS lol. On the plus side at least it's not called Titanoboa.
  - This thing is quite cool and shaping up to be a decent generic `bootc` installer. Nice.
- Thanks to all of you on the Discord who have been testing and reporting issues, it helps tremendously! Shout out to JumpyVi!

## Download

- [dakota-live-latest.iso](https://projectbluefin.dev/dakota-live-latest.iso)

### Filing Issues

All issues appreciated! The end goal is for Dakota to "feel" like a regular Bluefin.

- [Dakota Issues](https://github.com/projectbluefin/dakota/issues)
- [ISO Specific Issues](https://github.com/projectbluefin/dakota-iso/issues)
