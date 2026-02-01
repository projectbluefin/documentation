---
slug: automated-reports-changelogs
title: Automated reports and changelogs
authors: [castrojo]
tags: [announcements, reports]
---

![Jurassic January Header](https://github.com/user-attachments/assets/ea52552e-ac01-456a-9577-331e358a7286)

Hi everyone,

It can be difficult to keep track of things if you're not paying attention. I've been working on ways to collate all of the things happening from across the community into a regular monthly report. Here's Jurassic January: https://docs.projectbluefin.io/reports/2026/01

Changelogs are actually pretty weird in bootc land. We usually extract the package version info from the last rechunking step to generate the changelogs - however that doesn't really cover the entire project, just the things in that repository. There's also a new upstream rechunker coming down the pipeline so that means that we'll need to rework how we generate the changelogs (thanks to [@renner0e](https://github.com/renner0e) for investigating this!). The existing changelogs also really only tell you about the things in the image, and not the "whole" of Bluefin. These will always continue to be published on [changelogs.projectbluefin.io](https://changelogs.projectbluefin.io)

This reports aren't a replacement for the changelogs, just as this blog will continue to handle most of the "Why?" we do things -- for us it's a good way to blog about the meta and not the minutea.

We've divided Bluefin into the categories that match the labels throughout the project, so that we can organize things a little bit better. Each section looks like this:

---

## Ecosystem

![area/brew](https://img.shields.io/badge/area%2Fbrew-E8590C?style=flat-square) ![area/bluespeed](https://img.shields.io/badge/area%2Fbluespeed-1D76DB?style=flat-square) ![area/flatpak](https://img.shields.io/badge/area%2Fflatpak-9333EA?style=flat-square)

_Homebrew packages, AI/ML tools (Bluespeed), and Flatpak applications_

---

Additionally each section is divided into two categories. "Planned Work" are things we're purposely working on. These usually need planning and organization and are tracked in [todo.projectbluefin.io](https://todo.projectbluefin.io). 

"Opportunistic Work" are things that people just work on day-to-day and may or may not have a plan attached to them. This is usually the bulk of the work. We also needed a way to track what's going into the production homebrew tap, and in general tell people when something is getting promoted. Here's the first attempt:

---
### Homebrew Package Updates

![production-tap](https://img.shields.io/badge/production--tap-31%20updates-blue?style=flat-square) ![experimental-tap](https://img.shields.io/badge/experimental--tap-44%20updates-orange?style=flat-square)

**75 automated updates** this month via GitHub Actions. Homebrew tap version bumps ensure Bluefin users always have access to the latest stable releases.

#### Quick Summary

| Tap | Updates |
|-----|---------|
| production-tap | 31 |
| experimental-tap | 44 |

---

We also took the opportunity to add stats on the builders so you can check out Bluefin's health "at a glance". And lastly we wanted to highlight the contributors. New contributors ("New Lights"), will have a gold foil usercard to celebrate their first Bluefin contribution:

![New contributor card example](https://github.com/user-attachments/assets/6631991f-24ac-4462-8f95-8ee60999b0e9)

Each month will list every person that contributed to Bluefin for that month, so if you're keen, apply within! This section is incomplete, it does not include discussions and issues, so if you're working in those areas you're not getting a shout out yet, but we'll keep making improvements.

If there's an area of Bluefin that you're finding hard to keep track of leave feedback in this thread!

## [Discussion](https://github.com/ublue-os/bluefin/discussions)
