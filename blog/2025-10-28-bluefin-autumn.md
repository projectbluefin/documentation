---
title: "Bluefin Autumn 2025: We visit the Bazaar"
slug: 2025-10-28-bluefin-autumn
authors: castrojo
tags: [announcements]
---

![banner](https://github.com/user-attachments/assets/1b7b7f22-7212-4086-ac00-1d7c534fb9a3)

Guardians, today Bluefin GTS switched its base from Fedora 41 to Fedora 42. The gathering of raptors has begun. In a few weeks Bluefin (aka `bluefin:stable`) releases and we will start the cycle all over again.

:::note[Release Soundtrack]

[Bluefin and the Bazaar of Destiny](https://music.youtube.com/playlist?list=PLhiPP9M5fgWFOhFgduxhleNTmfVSj9JmO&si=GSYmrNFJQ--KGS-a)

:::

Looking for Fedora 43? That's here too in `bluefin:latest`, and will roll out to `bluefin:stable` users in 2 weeks. It's tough to write two of these, so we'll likely just move to spring/autumn announcements and whenever major things land. When `bluefin:stable` upgrades I will post it as an addenum in the discussion thread for this post.

## Introduction

As it ends up F43 will be coming to `bluefin:stable` while we're in Atlanta, GA, for [KubeCon + CloudNativeCon](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/), come say hello! As a [`bootc`](https://bootc-dev.github.io/) reference architecture we tend to align with the release cadence of other projects. This usually means that I'm on the road when there's a Bluefin release happening, so we do status reports like this depending on where we are in the world at the time, and to ensure transparency. It's also our chance to gather with attendees and get feedback on how we can make Bluefin better and gather feedback. 

You'll receive this update during your next update window, or you can run an update manually by clicking on this icon:

![update](https://github.com/user-attachments/assets/0bda2d1e-792d-4f91-b958-c2d52f8aec21)

Here's the major release information:

  * [GNOME 48 release notes](https://release.gnome.org/48/)
  * [Fedora 42 release notes](https://docs.fedoraproject.org/en-US/fedora/f42/release-notes/)
  * Bluefin changelog

## What is Bluefin?​

Bluefin is an operating system for your computer. It is designed to be installed on a device upgrade for the life of the hardware – we accomplish this by sharing the maintenance and care of our systems together as a community. It is designed to be as “zero touch” as possible by providing a curated GNOME experience.

Bluefin GTS (aka `bluefin:gts`) is our standard release, designed to be one cycle behind the most current Fedora release. This one's been in the oven for about six months and is ready for to go. In a few weeks the `bluefin:stable` branch will move on to Fedora 43. If you're brand new you can use the website to [pick the right image](https://projectbluefin.io/#scene-picker) or select from the grid below:

| Version     | GPU       | Download                                                                                                       | Checksum                                                                                    |
| ----------- | --------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bluefin GTS | AMD/Intel | [📥 bluefin-gts-x86_64.iso](https://download.projectbluefin.io/bluefin-gts-x86_64.iso)                         | [🔐 Verify](https://download.projectbluefin.io/bluefin-gts-x86_64.iso-CHECKSUM)             |
| Bluefin GTS | Nvidia    | [📥 bluefin-nvidia-open-gts-x86_64.iso](https://download.projectbluefin.io/bluefin-nvidia-open-gts-x86_64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-nvidia-open-gts-x86_64.iso-CHECKSUM) |

## Welcome to Bluefin

![theclueiscollapse](https://github.com/user-attachments/assets/e78c149d-eddc-40bf-8103-8f3b13364142)

This unidentified Dromeasaur is by [Dr. Natalia Jagielska](https://natalia-jagielska.weebly.com/), a world renowned expert [paleontologist](https://www.nationalgeographic.com/science/article/stunning-scottish-pterosaur-is-biggest-fossil-of-its-kind) and [paleoartist](https://natalia-jagielska.weebly.com/art.html)! We reached out to work with her on bringing her artwork and style to Bluefin, and she said yes! This rendition will be revealed in November, or you can just manually pick it in the wallpaper chooser. 

I am so stoked about this, an actual scientist! We're retconning that this is just Bluefin enjoying a nice day at the lake. We have **two** more wallpapers from her coming soon. I have come to really appreciate the world of flying reptiles. They are [terrifying](https://en.wikipedia.org/wiki/Pterosaur#/media/File:Size_disparity_of_late_Maastrichtian_pterosaurs_and_birds.svg).

Natalia's artwork was vectorized and remastered by [Delphic Melody](https://ko-fi.com/melodyofdelphi), please consider donating so that the collaboration can continue! 

## Major Changes​

There are a few major changes from a Bluefin perspective that we've been looking forward to:

### Installation Experience​

- The Anaconda web-ui installer is now the default installer, dramatically improving the experience.

### Introducing Bazaar

[Bazaar](https://github.com/kolunmi/bazaar) makes its debut in Bluefin GTS! All Bluefins are now just using the Bazaar flatpak. You're in for a treat:

![bazaar1](https://github.com/user-attachments/assets/3cd53813-d8d4-4728-8379-70c08c0365a1)
![bazaar2](https://github.com/user-attachments/assets/1dec1e08-7b32-49df-b14b-5d393bbd0992)

It's been super awesome seeing Bazaar move from a random project we found on r/gnome to what is effectively now the premier app store experience for FlatHub and Linux. You can help out tremendously by [sponsoring the author](https://github.com/sponsors/kolunmi). 

This is also a major milestone for Bluefin since we've effectively done our part for the GNOME and FlatHub ecosystems and can now consider application installation a solved problem, we can introduce new things into Bluefin as a flatpak to begin with and move us away from distribution specific formats. 

I am finding more applications now than I ever have. It's also a milestone for all Linuxes since flatpak's upcoming release gives us the flexibility to do this in a proper way with full lifecycle management. We can now be more flexible with the applications we can ship mid-cycle by plopping a file in `/etc/preinstall.d`. Those of you making custom images will really take advantage of this! 

Shoutout to Sebastian Wick for this work in Flatpak and working on the next release of this cool tech!

:::tip[What makes us different?]

We're committed to a future where authors deliver their applications how they see fit. This should be decoupled from the operating system. 

:::

### Homebrew

Speaking of packages, we've been doing more work engaging with Homebrew developers, check out this interview I did with Workbrew talking about our hopes and dreams:

<iframe width="560" height="315" src="https://www.youtube.com/embed/-LVnq_xXCnk?si=lHHtGkZjYBC1pKJ1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


Let us know if you're interested in working on Homebrew for Linux, we have opened a [homebrew tap] so that we can interate on bringing cool new things to you. A huge shoutout goes to [Yulian Kuncheff](https://ko-fi.com/yulian) and [Ahmed Adan](https://github.com/sponsors/ahmedadan) for spearheading this effort, please consider donating! 

### Fonts

The fonts have been a disaster for a long time, we're finally ripping the bandaid off and removing a bunch of fonts from the image. For you command line nerds you can install any of the [fonts listed in Homebrew](https://formulae.brew.sh/cask-font/) or use a tool like Embellish to install more fonts.

If you're in developer mode you can bring the monospace fonts back with `ujust bluefin-fonts`. 

### Tailscale

We've dropped the GNOME Quick Settings extension for tailscale in favor of the upstream system tray implementation. For more information, [check the docs](https://docs.projectbluefin.io/administration/#virtual-private-networks-vpn), this requires manual set up. 

- [Linux systray application](https://tailscale.com/kb/1597/linux-systray) - these docs will get your tailscale icon going in your tray. 

The tailscale experience is still not where it needs to be, but now that Tailscale has started work on an official system tray implementation we expect this to solidify over the next few upstream releases.

### `ujust` commands returning

After a hiatus we've finally refactored the Homebrew management in Bluefin. We're adding back some convenience commands: 

   - AI & Machine Learning Tools: run `ujust bluefin-ai` to install them.
     - Learn more in the [AI and Machine Learning documentation](https://docs.projectbluefin.io/ai).
   - Kubernetes Tools: Run `ujust bluefin-k8s` to install them.
     - For a full list of the tools, check out the [Kubernetes documentation](https://docs.projectbluefin.io/bluefin-dx#kubernetes).
   - Developer Fonts: Run `ujust bluefin-fonts` to install them. 
     - See the full list of fonts in the [Fonts documentation](https://docs.projectbluefin.io/bluefin-dx#fonts).

### Removal Notices​

Extinction is a natural part of life. After a deprecation cycle the following images are now removed:

  - **Nvidia Closed Images**: Due to Nvidia's software support changes we can no longer support the older closed modules for Nvidia cards. Not many people are using these, either migrate to the `nvidia-open` images or move to a stock image to use the built in kernel drivers.
  - **Bluefin HWE Images**: Not many people were using these, they have also been removed. 

### Repository Changes

As usual most of the changes we do in GitHub to deliver Bluefin and not so much in the image itself. Major parts of the Bluefin repository have been cleaned up to align with the improvements and lessons learned from building Bluefin LTS earlier in the year. This has been the bulk of the work in the past few weeks. 

Bluefin has significantly been simplified, now would be a great time to contribute as we've brought the repository up to the state of more modern `bootc` projects like Bluefin LTS.

- `bluefin:gts` and `bluefin:stable` will be publishing on Tuesdays from now on instead of Saturdays. Publishing on Saturday nights is an artifact of pre-automation "reserved time" for testing before a weekly release. This matches the same release schedule as Bluefin LTS.

![banner2](https://github.com/user-attachments/assets/5fae0e10-a0d4-4d6f-a106-d835654445b4)

## More Information​

Bluefin is a deinonychus, and may snap at you occasionally. Four year olds can get feisty of so there might be issues that you discover that we haven't seen before. Filing issues is always appreciated.

  * [Bluefin Documentation](https://docs.projectbluefin.io/)
  * [Universal Blue](https://universal-blue.org/)

We also accept donations to sponsor the infrastructure and artwork.

## Helping FlatHub

Sometimes starting in open source can be a real barrier if you don't know where to start. Don't have the skills to do cloud native things yet? Here's a good way to help out FlatHub. Flatpaks rely on what we call "runtimes" to ensure that the application has the dependencies it needs to run. Do a `flatpak list` to check them out:

![flatpaklist](https://github.com/user-attachments/assets/61a51c5d-b16b-4798-9f5c-d46aef3c32d3)

[Flatpak Tracker](https://github.com/ublue-os/flatpak-tracker) is a site we made that will check all of the applications we ship in Bluefin and see which runtimes need to be updated. We label them by image, here's the [the list of applications that need to be updated](https://github.com/ublue-os/flatpak-tracker/issues?q=is%3Aissue%20state%3Aopen%20label%3Abluefin-bazaar).  

![flatpak tracker](https://github.com/user-attachments/assets/c7051430-cff0-44e2-8706-30b0110a8dee)

This is important work because we want applications to be updated to the latest runtimes for security reasons. As it turns out, many of these applications have OPEN PULL REQUESTS already with people updating the runtime, you just need to find the app, run the updated version by following the instructions, and then report back to the Flatpak maintainer that the new app is working great (or broken!). Since GNOME 49 just released, there's plenty to do, so feel free to dive in and get started!


-----

## Is that it?​

Nothing makes ops people happier than uneventful things.

Today is really like any other, we just updated a few tags, you always have the option to go to any version we support at any time. Wether you like the chill vibe of `bluefin:gts` , the refined aggresiveness of `bluefin:stable` , the raptor abides.

Here's the current lay of the land:

| | `gts` (default) | `stable` or `stable-daily` | `latest` |
| --- | --- | --- | --- |
| **Fedora Version:** | 42 | 42 | 43 |
| **GNOME Version:** | 48 | 48 | 49 |
| **Target User:** | Most users | Enthusiasts | Advanced users and testers |
| **System Updates:** | Weekly | Weekly or Daily | Daily |
| **Application Updates:** | Twice a Day | Twice a Day | Twice a Day |
| **Kernel:** | Gated | Gated | Ungated |

NOTE: The `stable` and `stable-daily` branches will move to F43 over the following few weeks. 

## Desktop DevOps folks wanted!​

Bluefin is an active predator and is constantly hungry. You can help keep Bluefin healthy by becoming a contributor! We are an open source project and accept contributions:

  * [Help Wanted issues](https://github.com/ublue-os/main/issues%3Fq%3Dis%253Aissue%2Bis%253Aopen%2Blabel%253A%2522help%2Bwanted%2522)
  * [Contributing Guide](https://docs.projectbluefin.io/contributing/)

As a cloud native project we are always looking for contributors with skills in Podman, Docker, CI/CD, GitHub Actions, and good ole bash.

## Bring on the Charts!
Let's take a look at our contributor health, and celebrate the amazing folks who have come together to bring you Bluefin! We use [LFX Insights](https://insights.linuxfoundation.org/) to measure our project health. First note that my results here are skewed, since I am either usually just merging or telling a bot it's ok to do something. This also does not include the rest of Universal Blue. Yes, Aurora people basically maintain both, haha. 

![lfx1](https://github.com/user-attachments/assets/4ada7112-705b-4358-ab75-cc0f7182201d)

This next one surprised me, I was expecting 20 or 30ish at best. Nice work ya'll! 

![active contributors](https://github.com/user-attachments/assets/e6e786dc-03bc-4cc8-882a-dd59ddb63dd0)

Haha yep, I can't hide from the data though, free me from this! 

![jorge](https://github.com/user-attachments/assets/616ae642-6e80-4c90-9951-3c233c95f3fa)

Feel free to [browse around](https://insights.linuxfoundation.org/project/ublue-os-bluefin/repository/ublue-os-bluefin) and learn cool things about Bluefin's creators.


[lfx charts]

### What's Next?​

After KubeCon we head into the holidays, where things will slow down significantly. We've been in the lab with mad doctor Timothée Ravier and have been cooking up something. We expect that this will change the course of Bluefin for the better, forever. We can't wait to show you, until then, enjoy!
