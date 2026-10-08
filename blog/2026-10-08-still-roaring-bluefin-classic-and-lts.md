---
title: "Still Roaring: Bluefin Classic and LTS"
slug: still-roaring-bluefin-classic-and-lts
authors: [juanresendiz813]
tags: [classic, lts, announcements]
---

I want to start this by clearing the air: the Bluefin you know and love is going nowhere! It's still here, just with a new look and a few new raptor wranglers at the helm. Let me start by introducing myself. I'm Juan Resendiz, I'm from Florida and I do nerd stuff over at Concept To Cloud during the day. I heard Jorge's call and he had me sold at dinosaurs. Linux was the cherry on top.

<!-- truncate -->

<!-- IMAGE TODO: dino eating me, caption "first day on the Bluefin Discord" (goes in static/img/blog/) -->

When I decided to step up I had no idea what I was getting myself into. Heck, I still don't! But what I do know is I believe in Jorge's vision for operating systems, and my mission is to continue the hard work he and the team before me started. Now I'm not saying they've gone anywhere: they've been awesome with the transition and I can honestly say I feel very comfortable already thanks to the mentorship and guidance of everyone involved.

But now to why we are all here. The original and classic Bluefin you all know is now Bluefin Classic. And Bluefin LTS is still LTS... it isn't going anywhere either. For those who are just here to know if it will continue to get supported and don't really care for the tech talk, rest assured: your friends, parents and grandparents will still be good to go. For the rest of my tech folks, read on.

## What's changing

Bluefin Classic will still be under Universal Blue. We're also testing building Classic straight from Fedora, and F45 test images are building and passing the same tests as today's stable. F45 is on track for October. You do not have to do anything except for the normal updates as they come. You are good to go and still supported. We are going nowhere.

LTS, the honest part. It had a rough summer, which is why `:lts` hasn't updated since July. Builds are green again on x86 and ARM, the boot hang is fixed, and Project Bluefin LTS ships daily. Getting `:lts` updated is next. But it will be getting a bit of a bigger change. It's moving its home to Project Bluefin, but you don't need to do anything today. Also: we're working on DX for LTS so nobody gets left behind, and we'll post before anyone moves.

## The plan for LTS

We're not leaving anyone behind. Here's how this goes:

1. Keep both LTS lines healthy
2. Make the move to Project Bluefin boring and tested
3. Move folks over
4. Only then retire the old one

If the move isn't ready, it doesn't happen. Simple as that.

## What you need to do

Nothing! Seriously. Whether you're on Classic or LTS, keep updating like you always have. If anything ever changes for you, you'll hear about it here first.

## Thank you

None of this is a one person job. Huge thanks to Jorge for the ZFS fix and for keeping the merges moving, murphym18 for jumping into reviews, testing images on his own machine and building a tool that makes testing every Classic image way less painful, James (hanthor) for the ARM fix and for getting us the access we needed, Robin for the LTS reviews and merges, bsherman for keeping the CentOS builds around so the move has room to breathe, and Danathar and Kyle Rankin for the testsuite reviews. You all made a new guy feel right at home.

## Where to find us

Got questions, found a bug, or just want to say hi? Come find us in #dev-classic on the Project Bluefin Discord, or drop a comment on the Classic and LTS discussion on GitHub. I'll be around.

Classic and LTS are still roaring, and we plan on keeping it that way. 🦖
