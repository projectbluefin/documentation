---
title: "Still Roaring: Bluefin Classic and LTS"
slug: still-roaring-bluefin-classic-and-lts
authors: [juanresendiz813]
tags: [classic, lts, announcements]
image: /img/blog/2026-10-22-still-roaring/first-day-dino.png
---

I want to start this by clearing the air: the Bluefin you know and love is going nowhere! It's still here, just with a new look and a few new raptor wranglers at the helm. Let me start by introducing myself. I'm Juan Resendiz, I'm from Florida and I do nerd stuff over at Concept To Cloud during the day. I heard Jorge's call and he had me sold at dinosaurs. Linux was the cherry on top.

<!-- truncate -->

<figure style={{textAlign: "center"}}>
  <img src="/img/blog/2026-10-22-still-roaring/first-day-dino.png" alt="A dinosaur statue looking like it's about to eat Juan" width="280" style={{display: "block", margin: "0 auto"}} />
  <figcaption>first day on the Bluefin Discord</figcaption>
</figure>

When I decided to step up I had no idea what I was getting myself into. Heck, I still don't! But what I do know is I believe in Jorge's vision for operating systems, and my mission is to continue the hard work he and the team before me started. Now I'm not saying they've gone anywhere: they've been awesome with the transition and I can honestly say I feel very comfortable already thanks to the mentorship and guidance of everyone involved.

But now to why we are all here. The original and classic Bluefin you all know is now Bluefin Classic. And Bluefin LTS is still LTS... it isn't going anywhere either. For those who are just here to know if it will continue to get supported and don't really care for the tech talk, rest assured: your friends, parents and grandparents will still be good to go. For the rest of my tech folks, read on.

## What's changing

Bluefin Classic will still be under Universal Blue. The only thing that will be changing is we will pull directly from Fedora now. We are currently testing with the F44 and F45 beta versions of the swap. F45 is on track for October. You do not have to do anything except for the normal updates as they come. You are good to go and still supported. We are going nowhere.

So what does "pull directly from Fedora" actually mean? Today Classic is built on top of a Universal Blue base image, which sits on top of Fedora Silverblue. With the new setup Classic builds straight on Fedora's own Silverblue image instead. One less layer in the middle, and updates come right from Fedora. Same Bluefin on top, same apps, same `ujust`, same everything you're used to.

We're also testing more than ever. Classic now passes the Project Bluefin testsuite's common checks, so every image gets booted and poked at, not just built. And the weekly updates keep rolling like always: `stable` still lands every Tuesday (this week's brought kernel 7.2). Oh, and Classic got its own look too: a shiny new Bluefin Classic wordmark from the awesome Delphic Melody.

LTS, the honest part. It had a rough summer, which is why `:lts` hasn't updated since July. Builds are green again on x86 and ARM, the boot hang is fixed, and Project Bluefin LTS ships daily. Getting `:lts` updated is next. But it will be getting a bit of a bigger change. It's moving its home to Project Bluefin, but you don't need to do anything today. Also: we're working on DX for LTS so nobody gets left behind, and we'll post before anyone moves.

If the move isn't ready, it doesn't happen. Simple as that.

## What you need to do

Nothing! Seriously. Whether you're on Classic or LTS, keep updating like you always have. If anything ever changes for you, you'll hear about it here first.

## What about Dakota and Utah?

I've seen this one a lot, so let's clear it up. Dakota is its own thing, built a totally different way, and moving to it means a fresh install. Utah is the new one built on Fedora Hummingbird. Neither one is replacing Classic. If you're happy on Classic, stay on Classic. As Jorge put it: "you would just stay on what you have."

For the curious though: I've been testing switching from Classic to Utah in VMs, from both F44 and F45. It boots, your files and SSH keys come along for the ride, and you can roll right back to Classic if you change your mind. When that's ready for everyone it'll be an opt-in `ujust` command. Nobody gets moved without asking.

## How you can help

Run Classic or LTS? You're already helping! If something breaks, tell us: open an issue on GitHub or drop it in #dev-classic. Want to go further? Test the images and PRs. murphym18's builder and the testsuite make that a lot less painful than it used to be.

## Thank you

None of this is a one person job. Huge thanks to Jorge for the ZFS fix and for keeping the merges moving, murphym18 for jumping into reviews, testing images on his own machine and building a tool that makes testing every Classic image way less painful, James (hanthor) for the ARM fix and for getting us the access we needed, Robin for the LTS reviews and merges, bsherman for keeping the CentOS builds around so the move has room to breathe, and Danathar and Kyle Rankin for the testsuite reviews. You all made a new guy feel right at home.

<figure style={{textAlign: "center"}}>
  <img src="/img/blog/2026-10-22-still-roaring/dino-facepaint.png" alt="Benjamin with green T-rex face paint" width="280" style={{display: "block", margin: "0 auto"}} />
  <figcaption>My son Benjamin is all in on Bluefin as well</figcaption>
</figure>

Also a big shout out to Delphic Melody for the Classic and LTS wordmarks, and to JF and inffy for jumping in to answer questions and point us in the right direction.

## Where to find us

Got questions, found a bug, or just want to say hi? Come find us in #dev-classic on the Project Bluefin Discord, or drop a comment on the Classic and LTS discussion on GitHub. I'll be around.

Here's the discussion: [Handing off ublue-os/bluefin and bluefin-lts to the next generation](https://github.com/ublue-os/bluefin/discussions/4951). And keep an eye out, the November wallpaper fix is on its way.

Classic and LTS are still roaring, and we plan on keeping it that way. 🦖
