---
title: February Infrastructure Update
slug: february-infrastructure-update
authors: castrojo
tags: [announcements]
---

Hey ya’ll, we’re about to head into conference season so I thought I’d do a quick rollup for you before the team starts on F42 work.

Most of these things are infrastructure and project related and won’t have a visible impact on your desktop or OS. Don’t worry we have other exciting things for that coming down the pipeline! For you Aurora fans we’re just going to leave a teaser for you:

[![Under construction](https://global.discourse-cdn.com/free1/uploads/univeral_blue/optimized/2X/1/18122dcea8f16f89c0807771288e6b93698cf055_2_517x320.jpeg)

And have a look at Bluefin’s new March wallpaper, coming next week!

[![Bluefin](https://global.discourse-cdn.com/free1/uploads/univeral_blue/optimized/2X/6/6e4b5cf70a58deb74c0e2a57d0419c686865ed54_2_517x291.jpeg)

<!-- truncate -->

## Repo Consolidation

These updates brought to you by Tulip, P5, M2, and bsherman.

### Config → Packages

We’ve been doing a poor job historically of reviewing across so many repositories, so we did some consolidation. The [ublue-os/config](https://github.com/ublue-os/config) repo has been consolidated here:

- [GitHub - ublue-os/packages: Spec files for packages published in ublue COPR repos](https://github.com/ublue-os/packages)

This repo contains a few things. First off, many parts of Aurora and Bluefin have been centralized into common services, and have been included here. Bazzite is in progress. This means service units, udev rules, desktop settings, motd, spec files, and their corresponding packages will all live here. This also means that we have more eyeballs on everything instead of it being spread out across repos.

The package building is automated via the [Universal Blue COPR](https://copr.fedorainfracloud.org/coprs/ublue-os/packages/packages/). This is useful for those of you making custom images, you can grab any of those RPMs and and more selectively pick and choose the parts of Universal Blue that you want. This also makes it much easier to remove something, `dnf5 remove ublue-brew` in your `Containerfile` would remove brew cleanly, etc.

We’ve [pruned some issues](https://github.com/ublue-os/packages/issues) and merged a few that came over from config. If you have a udev rule you’d like to see included, this is the place to do it. Also for those of you looking for a place to start, check out the [help wanted issues](https://github.com/ublue-os/packages/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22help%20wanted%22).

### kernel-cache → akmods → main

The [ublue-os/kernel-cache](https://github.com/ublue-os/kernel-cache) repo has been merged into [ublue-os/akmods](https://github.com/ublue-os/akmods), This is to more tighly couple the kernel versions with the akmods.

Note that akmods will be merging into `ublue-os/main`. For those of you who have been following along for a long time, yes, we’re moving back to a monorepo. The circle of life continues.

### HWE base images building again

A reminder that the [ublue-os/hwe](https://github.com/ublue-os/hwe) repository is being retired, check the readme for the existing deprecation notice. The main repo will be publishiung the nvidia images moving forward. These were broken for a bit but are now green thanks to M2.

Note that none of our products use this repo so this mostly affects people making images off of these. We will make an announcement when main is building the nvidia images. Ideally we’ll publish to the same URLs so hopefully we can make that a clean transition.

## Future Work

Here’s the [tracking issue](https://github.com/ublue-os/main/issues/691) for the merger, which we’re still working on. Then after that we’ll be ready for F42!

### Events

We have lots of places to visit, find us here, if you’re attending feel free to reach out:

- [Meet the team at SCaLE 22x - 30 million pulls and counting!](https://universal-blue.discourse.group/t/meet-the-team-at-scale-22x-30-million-pulls-and-counting/6635)
- [KubeCon + CloudNativeCon](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe)
- [Linux App Summit](https://linuxappsummit.org/)
