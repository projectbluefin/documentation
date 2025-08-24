---
title: Joining LFX Insights
authors: [castrojo]
---

A nice milestone for us today! [Bluefin](https://insights.linuxfoundation.org/project/ublue-os-bluefin), [Aurora](https://insights.linuxfoundation.org/project/ublue-os-aurora), [Bazzite](https://insights.linuxfoundation.org/project/ublue-os-bazzite), and [Cayo](https://insights.linuxfoundation.org/project/cayo) are now listed in [LFX Insights](https://insights.linuxfoundation.org/).

This is a Linux Foundation effort to measure something near and dear to our hearts: **contributor metrics**. I work with many tools at the CNCF. You will find tools we depend on, like [bootc](https://insights.linuxfoundation.org/project/bootc) and [Podman](https://insights.linuxfoundation.org/project/containers-podman). This lets us measure contributor health not just for ourselves, but to see how we're doing when compared to other projects. No more guessing, now we can look.

Let's see how we're doing ...

[![LFX Health Score](https://insights.linuxfoundation.org/api/badge/health-score?project=ublue-os-bluefin)](https://insights.linuxfoundation.org/project/ublue-os-bluefin)

## Fancy Charts

![Whew](https://github.com/user-attachments/assets/4c05d343-76d6-4c9a-8b74-83fb0cf634e8)

Whew! Ok, that's always good. Let's drill right to the red parts because that's the interesting part.

![Oh no!](https://github.com/user-attachments/assets/59ee8fad-5f61-455c-a09a-f855eee2aa75)

Here's where we need to use our brains. Charts by themselves can be misleading. Our names are missing (caching issue, probably), but it's clear that I am doing a ton of work! Too much!

![yikes](https://github.com/user-attachments/assets/72475511-a341-42c0-9f13-3d9f9f7f4698)

What this doesn't show you is that 95% of the work I do on Bluefin is telling a bot it's ok to do something. My takeaway here is "we need to automate more things" because in an ideal world, it's the bots and automation humming away quietly. But ... the chart is also not lying, we are top-heavy for sure, no doubt. We also ensure we measure things outside of code:

![hi john](https://github.com/user-attachments/assets/db34c7bd-5441-4da5-b70b-c14dfb67f725)

If all you do is file an issue or start a discussion, then I do owe you a thanks; we couldn't do it without you.

## Here come the new raptors ...

We've been getting new pull requests in for folks - our way to improve is to continue to work on getting people contributing. LFX Insights is [open source](https://github.com/linuxfoundation/insights) and contains some of the largest projects in the world. The fact that we can be involved with this is awesome, and you can [submit OSS projects](https://github.com/linuxfoundation/insights/discussions)! Stick everything in there, and let's see who is working on improving. 😄

This is just coming live for us, if you're a chart nerd, then feel free to dive into LFX and get started, the team is responsive and moving fast. And if you're like me, you'll find yourself fixing up your dashboard. Make yourself look spectacular! You'll be seeing these charts featured more on the website, etc. Enjoy!

### [Discussion](https://github.com/ublue-os/bluefin/discussions/2960)

<script src="https://giscus.app/client.js"
        data-repo="ublue-os/bluefin"
        data-repo-id="R_kgDOJHEu4g"
        data-category="Discussions"
        data-category-id="DIC_kwDOJHEu4s4CtFFL"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="catppuccin_mocha"
        data-lang="en"
        crossorigin="anonymous"
        async>
</script>
