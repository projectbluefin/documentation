---
slug: modernizing-custom-images
title: Modernizing custom images based on Bluefin
authors: [castrojo]
tags: [announcements, finpilot, help wanted]
---

I've been working on a more opinionated Bluefin template here:

https://github.com/projectbluefin/finpilot

Originally I mostly just wanted to add copilot instructions to the [Universal Blue template](https://github.com/ublue-os/image-template). Copilot does an awesome job just automating making a custom image so I kept driving in that direction.

#### If you are making a custom image I want you to try this!

The existing templates mostly let you take Bluefin and modify it. But now with this new OCI layout, we can instead have you assemble your own Bluefin like how [Aurora](https://github.com/ublue-os/aurora), [Bluefin LTS](https://github.com/ublue-os/bluefin-lts), [Bluefin](https://github.com/ublue-os/bluefin), and [dakotaraptor](https://github.com/projectbluefin/distroless) do it. This does a few things:

- Let's you be at least as good as any of those right out of the gate, your custom image is built by the production setup that's well known
- You can instead work on making the image
- All desktop agnostic config is centralized in [@projectbluefin/common](https://github.com/projectbluefin/common) and set up in a way that you can extend it.

![ubuntu-bootc](https://github.com/user-attachments/assets/3bd27bb8-a76a-4e6d-be76-18f0b40c7883)

> Tulip quickly took the Bluefin containers and a [bootcrew ubuntu-bootc](https://github.com/bootc-dev/ubuntu-bootc) image to create an Ubuntu Bluefin.

A [ublue-os/base-main](https://github.com/ublue-os/main) base image + [cosmic](https://github.com/pop-os/cosmic-epoch) would make a COSMIC Bluefin the exact way we would build one. And as a bonus since the config and stuff is centralized any custom image built by consuming the centralized OCI containers has the benefit of shared maintenance.

Anyway if you're already making a custom Bluefin I'd like to encourage you consuming Bluefin this way, adding the few containers is documented in the README so you don't have to move templates or anything like that, you could probably do this in [bluebuild](https://github.com/blue-build/cli) too.

#### [Discussions](https://github.com/ublue-os/bluefin/discussions/3960)
