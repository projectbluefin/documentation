---
title: "Bluefin LTS: Reinventing the Steel" 
slug: bluefin-lts-ga
authors: castrojo
---

_Achillobator giganticus_

![achillosmall](https://github.com/user-attachments/assets/b6945e80-34e4-44bb-8518-91ad31fed56d)

After nine months of development Bluefin LTS and Bluefin GDX are now Generally Available(GA). The reign of Achillobator has begun. Find the download links [on the website](https://projectbluefin.io), or snag them below.

# What is Bluefin LTS (Long Term Support)? 

Bluefin LTS is a workstation designed for people who prefer Long Term Support but desire a modern desktop. This species of raptor is for users who prefer a slower release cadence, about a three-to-five year lifespan on a single release. Like other Bluefins it features first-class support for Flathub via [Bazaar](https://github.com/kolunmi/bazaar), Homebrew, ZFS, and all the [other goodies](https://docs.projectbluefin.io/introduction). 

![Pasted image](https://github.com/user-attachments/assets/52fc8986-c244-4ed6-bcc2-20f4b2de1843)

Bluefin LTS is composed of:

- Mostly the same packages of Bluefin and Bluefin GTS, but built with CentOS Stream 10 and EPEL for extra packages.
  - The same features since they share the same source RPMs, just built on CentOS
- A backported GNOME 48 desktop
- ARM (aarch64) based images

Bluefin LTS also offers a hardware enablement branch (`bluefin:lts-hwe`) with:

- Updated Linux kernel, currently 6.15.9.
- Toggle between branches with `ujust rebase-helper`.
- Dedicated HWE ISOs for newer kit like the Framework 12 and Framework Desktop.  


## Rationale

Bluefin LTS ships with Linux 6.12.0, which is the kernel for the lifetime of release. An optional `hwe` branch with new kernels is available, offering the same modern kernel you'll find in Bluefin and Bluefin GTS. Both vanilla and HWE ISOs are available, and you can always choose to switch back and forth after installation. 

I have been dogfooding Bluefin LTS for most of this year on my Framework 13 and my Framework Desktop. This is the most "work focused" image and is suitable for "set it and forget it" style desktops. We are **proud** of this one!

Here's how I pitched the idea earlier this year:

<iframe width="560" height="315" src="https://www.youtube.com/embed/mLrGJjXO94w?si=zbK262VrLN3vpYJo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


### A modern GNOME Desktop

Bluefin LTS provides a backported GNOME desktop so that you are not left behind. This is an important thing for us. James has been diligenlty working on GNOME backports with the upstream CentOS community, and we feel bringing modern GNOME desktops to an LTS makes sense. I may be old but I'm not dead!

A very special thanks to [Jordan Petridis](https://blogs.gnome.org/alatiera/) from GNOME for technical advice and review.

### New Installation

Installation is via a [live session](https://github.com/ublue-os/titanoboa) with the new [Anaconda webui](https://communityblog.fedoraproject.org/anaconda-webui-progress-update-and-roadmap/). This installer is miles better than the ones we used to ship, thanks to the Anaconda team. 

Secure boot and all those goodies are available: 

![live session](https://github.com/user-attachments/assets/20d54c0e-cd05-4047-871e-ab1965483902)
![live session installation](https://github.com/user-attachments/assets/370fba9b-7c20-4ad3-8ec7-4efd0330e5fb)

### Update Cadence

Updates will come as often as we need them for now and will settle into weekly releases on Tuesdays. Follow updates on [changelogs.projectbluefin.io](https://changelogs.projectbluefin.io). 

### Errata

There are a few lingering issues that will take more time:

- [hwe doesn't have secure boot](https://github.com/ublue-os/bluefin-lts/issues/678) - we hope to revisit later this fall
- [Bazaar curated config is missing](https://github.com/ublue-os/bluefin-lts/issues/680) - the curated section isn't available yet
- [gnome-user-share is missing](https://github.com/ublue-os/bluefin-lts/issues/626) - we recommend using [rclone mount](https://rclone.org/commands/rclone_mount/) instead

# What is Bluefin GDX? 

Bluefin GDX is designed to be an AI Workstation by providng Nvidia drivers and [CUDA](https://developer.nvidia.com/cuda-toolkit) in one image. It combines [Bluefin LTS](/lts) with the [Bluefin Developer Experience](/bluefin-dx). There's no cool expansion of GDX: GPU Developer Experience I guess. Maybe someday we'll call it Bluefin CUDA Edition. (Jensen call me!)

The reason we brand it differently is that it is designed for AI and Machine Learning professionals. Instead of a multitude of Nvidia images like Bluefin we will concentrate on this one image to focus on one thing: this is our platform for open source AI. Improvements made in GDX will make it's way into Bluefin's developer mode. GDX gives us a place to rev fast with some new friends:

:::info[Teamwork ...]

We are happy to announce that we've formed a community partnership with the [Red Hat Enterprise Linux Command Line Assistant](https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux-10/lightspeed) team. We are collaborating on upstream and open source AI and ML tools to provide system-wide inference and an enhanced experience for Bluefin LTS and GDX users.

:::

This will be the lab that will keep Bluefin on the leading edge of open source AI. Here's Mo Duffy on Destination Linux to give you an idea of what we're thinking about. 

<iframe width="560" height="315" src="https://www.youtube.com/embed/EJZkJi8qF-M?si=gNvKLPo3z9khFjME&amp;start=3094" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Features

- [Nvidia CUDA](https://developer.nvidia.com/cuda-toolkit) and [VSCode integrations](https://developer.nvidia.com/nsight-visual-studio-code-edition) and full secureboot support out of the box. There are many parts of the CUDA ecosystem that need to be included, but the raw core is there and ready to be expanded upon. 
- [Ramalama](https://github.com/containers/ramalama) for local management and serving of AI models
- [uv](https://github.com/astral-sh/uv) for Python package management
- ... and more! Check the [AI and Machine Learning](/ai) section for more!
- We are looking for AI/ML enthusiasts with strong opinions who want to be involved! Inquire within!

![Bluefin GDX at KubeCon + CloudNativeCon EU](https://github.com/user-attachments/assets/2c2f9d50-a704-49cb-9b0b-f139014a8bc0)

You can find Bluefin GDX on the conference circuit! 

# What this all means

Bluefin LTS will end up being way more sustainable than Bluefin and Bluefin GTS from a developer perspective. It's more of an initial setup and then we don't touch it as often. We have had periods in beta development where we didn't need to touch it for weeks. If you look [changelogs.projectbluefin.io](https://changelogs.projectbluefin.io) you'll soon notice the pattern, mostly minor version bumps. Nice. 

It's also much more advantageous for us to derive off of a base image that ends up being a commercial product -- there is no doubt that CentOS and Red Hat have their weight behind these base images, whereas we are unable to get that level of commitment from Fedora. And as [Steven Rosenberg pointed out](https://zola.passthejoe.net/blog/hello-aeon/), Fedora isn't really improving in this area, and with `bootc`'s composefs work coming along nicely we now have multiple base images to choose from. It will be an interesting year! 

## What does this mean for Bluefin GTS?

As it turns out, Bluefin LTS HWE is in the exact same ecological niche as GTS. They will end up being competitors. There's no death knell or anything like that, once development moves on it doesn't cost us much to keep it running. And we do love our pets. Check out the awesome brand new image by Delphic Melody and ahmedadan: 

![image chooser](https://github.com/user-attachments/assets/118d6702-8001-4215-9d8f-6fab78f4860c)

As you can see, it's getting a bit crowded. We'll see how people react to LTS, and I expect we'd hide the GTS option from the website but continue to offer it. 

With bootc we can deliver a desktop experience with the latest GNOME, and a new kernel -- but on a solid base with less regressions. The previous generation of thinking kept CentOS in a very locked set of use cases. The old boring ones. Now with bootc + containers + flathub + homebrew, we feel that this less churny base makes for a compelling desktop. We'll see how they compete!

## Less bitey Bluefin and Bluefin GTS

Since Bluefin LTS is "bootc natural" and not a transplant, it comes with less compromises out of the box. Bluefin LTS doesn't support local layering at all and AppImages don't work either. (Told ya'll those things were not gonna make it lol.) Bluefin LTS also does not support older machines with v2 CPU instructions. 

This also lets us be less strict in Bluefin. We've decided to leave local layering enabled by default in Bluefin and Bluefin GTS. There are users who use that ecosystem, so no worries there. Savages. The Fedora based images will continue to serve these use cases. James also has his own [tunaOS](https://github.com/tuna-os/tunaOS), which offers a wide variety of Bluefin-derived variants, including an AlmaLinux based sister to Bluefin LTS. That covers just about everybody - The `bootc` community around CentOS is quite diverse, and offers a variety of options. 

The [downloads](/downloads) page is looking pretty good these days but I am very interested to see what you decide since we do measure everything, so feel free to peruse that list. :smile: 

<iframe width="560" height="315" src="https://www.youtube.com/embed/kFPqsK9lNPc?si=pzHZpOJviCMrzPvU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Merch

Now let's get on to the good stuff. [store.projectbluefin.io](https://store.projectbluefin.io) will take you to the new Bluefin store, which has a ton of awesome items!

We celebrate this release with this T-shirt, the "Reign of Achillobator", signifying Bluefin LTS's role in this ecosystem as a top predator, along with some other goodies:

![Reign of Achillobator](https://github.com/user-attachments/assets/0eed0cad-741a-4a0a-b70e-f31c18de5aad)
![Rawr!](https://github.com/user-attachments/assets/de297710-c611-4c58-ab22-633f0c5431c8)

And of course we've got stuff for the kids, and some other weird things! Currently this store is US only for now. 

![kids](https://github.com/user-attachments/assets/7893d480-fdf0-4e99-b025-5f51b9fd81bb)
![soap!](https://github.com/user-attachments/assets/006d05a5-52fc-45fe-8881-c478d5b35650)
![backpack](https://github.com/user-attachments/assets/11abeba0-0616-4957-bf82-618b45a989e1)

Proceeds from the store items will go towards paying for more paleoartwork. I think this is a fair deal, Bluefin would have never gotten this far without the work of these fine artists. Having a way for the community to sponsor the artwork in return for the awesome comfort of an _Achillobator giganticus_ hoodie? Peak Linux.

### Special Thanks

Bluefin is brought to you by [Tulip Blossom](https://github.com/sponsors/tulilirockz) and [James Reilly](https://github.com/sponsors/hanthor). The team grew this cycle with some fantastic new folks helping out to finish Bluefin LTS:

[Yulian Kuncheff (Daegalus)](https://yulian.kuncheff.com) hopped in to help with the GitHub actions and the `lts-hwe` branch. [Ahmed Adan](https://github.com/ahmedadan) and [M. Gopal (Delphic Melody)](https://linksta.cc/@delphic-melody) round out the new team with fantastic work on the artwork, website, documentation, and testing. 

Special thanks to Carl George, Laura Santamaria, Shaun McCance, and the entire bootc team for their (continuing) support of this project! The game has started. The clue is: `Gardener`

### The Road Ahead

And lastly, there is some missing functionality compared to the Fedora build as there are some creature comforts that are missing. We call these `parity` bugs, so if find them, file them. There are some things that won't be coming with; CentOS Stream's focus is on long term support, so we may choose to drop a feature if it's not straightforward to bring to Bluefin LTS. 

Imagine choosing between LTS, GTS, and stable with just a slider on an update page in a control panel. They should feel and act the same as each other. I'm pretty much there with my personal machines, sometimes I have to check which machine is which because it doesn't really matter. I feel the pain on the infrastructure side instead. :smile:

### Shred to Achillobator

Two new soundtracks accompany this release, enjoy!

- [Bluefin and Achillobator](https://music.youtube.com/playlist?list=PLhiPP9M5fgWEZbkq6ZhaHA4b4UqLwZNxt&si=lkAcTlHzaf1Wl5VO)
- [Bluefin and The Children of Jensen](https://music.youtube.com/playlist?list=PLhiPP9M5fgWH4do22wEvgnoMUQLVYRIxt&si=_KqYuGf3xs_ePaxU)


# Downloads

:::warning

Remember you cannot rebase between CentOS and Fedora Bluefins, ain't no one testing that. Beware. Also this is the new installer -- you'll love it. 

:::


### Bluefin LTS

The long term support experience.

📖 **[Read the documentation](/lts)** to learn about features and differences. Choose HWE for Framework Computers or if you just want newer kernels. 

| Version            | GPU  | Download                                                                                 | Checksum                                                                         |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Bluefin LTS | AMD/Intel     | [📥 bluefin-lts-x86_64.iso](https://download.projectbluefin.io/bluefin-lts-x86_64.iso)   | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-x86_64.iso-CHECKSUM)  |
| Bluefin LTS | ARM (aarch64) | [📥 bluefin-lts-aarch64.iso](https://download.projectbluefin.io/bluefin-lts-aarch64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-aarch64.iso-CHECKSUM) |
| Bluefin LTS HWE  | AMD/Intel     | [📥 bluefin-lts-hwe-x86_64.iso](https://download.projectbluefin.io/bluefin-lts-hwe-x86_64.iso)   | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-hwe-x86_64.iso-CHECKSUM)  |
| Bluefin LTS HWE  | ARM (aarch64) | [📥 bluefin-lts-hwe-aarch64.iso](https://download.projectbluefin.io/bluefin-lts-hwe-aarch64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-hwe-aarch64.iso-CHECKSUM) |



### Bluefin GDX

The AI workstation with Nvidia and CUDA.

📖 **[Read the documentation](/gdx)** to learn about features and differences.

| Version            | GPU  | Download                                                                                         | Checksum                                                                             |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Bluefin GDX | AMD/Intel + Nvidia        | [📥 bluefin-gdx-x86_64.iso](https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso)       | [🔐 Verify](https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso-CHECKSUM)  |
| Bluefin GDX | ARM (aarch64) + Nvidia | [📥 bluefin-gdx-lts-aarch64.iso](https://download.projectbluefin.io/bluefin-gdx-lts-aarch64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-gdx-lts-aarch64.iso-CHECKSUM) |

### [Discussion](https://github.com/ublue-os/bluefin/discussions/3232)

