---
layout: page
title: Bluefin on Framework Laptops
permalink: framework
---

## Bluefin are community supported options for Framework laptops

![image|111x53](upload://iMqy3uWqPaOalTxqdBhF1kT78ZL.png)

Fedora is an officially supported option for the Framework, and since [Universal Blue](https://universal-blue.org/) images are an atomic extension of that, it means that we can start with a solid base. About a year ago I purchased a Framework 13:

![image|453x500](upload://x63HPYMEM7qVQ69ZPJsrnE0aAyK.jpeg)


Bluefin and it's sister images [Aurora](https://getaurora.dev), and [Bazzite](https://bazzite.gg) are community supported options on Framework hardware.

- [frame.work/linux](https://frame.work/linux)

The core team and many contributors use Bluefin on the Framework 13(Intel/AMD) and Framework 16 models.

## Features

-    Patched Switcheroo (FW16 only)
     -  Applications will automatically use the dGPU. This is defined by their .desktop file, so applications like Steam & Lutris will do this automatically. No more need to add DRI_PRIME.
- [Power Profile Switcher](https://github.com/eliapasquali/power-profile-switcher). By default power save is used when on battery and balanced when connected to power.
- Fractional scaling enabled out of the box
- Fingerprint service installed and enabled out of the box
- VRR supported on the Framework 16 (Bazzite only)
- Steam Deck MicroSD cards are automounted and loaded into Steam when used with the Framework MicroSD module
   - With the Framework MicroSD card module, MicroSD cards can be shared with Steam Deck, Ally, Legion GO, and other handheld gaming hardware running Steam OS or Bazzite. 
- `ujust setup-luks-tpm-unlock` to enable TPM unlock for LUKS
  -  Users can now get the full benefit of LUKS encryption while only needing to unlock with a fingerprint.
- `ujust check-idle-power-draw` to check idle power draw with powerstat
- Automatic karg application for Frameworks with Intel hardware to support keyboard shortcuts
- Framework logo is automatically applied to the Logo menu shell extension in GNOME when running on Framework hardware
   - Immediately obvious to the end user they're getting specialized support for their hardware.

### Future Work

- XWayland Fractional Scaling in GNOME
  - Tested draft MR, current state is buggy but we're hoping it matures quickly and we'll try to ship it sooner than GNOME merges it.


## Support Expectations

We have a [framework tag](https://github.com/ublue-os/bluefin/issues?q=is%3Aissue+is%3Aopen+label%3Aframework) in github if you want to report issues. Please remember that these are community supported, so we do the best we can, and we're looking pretty good right now and it'll only get better. Aurora is "Bluefin with KDE" and should work fine as well, it's just not as well documented/tested, so if you want to dive in and help that'd be appreciated!

- We'll do our best, but are always looking for help
- We may mark things as out of scope for us based on what we provide. Some things are better handled in Fedora directly
- We will pull in things as appropriate from other sources. In the past we did things like pull in AMD's patches to the gnome ppd, and may include things based on feedback from the Framework team, and engineers at AMD and Intel. 

And also a reminder that our images are defined in bash, if you find an issue and know how to linux, it's much easier when we do it together. Enjoy!

## Final Thoughts

This past year I've taken my FW13 on the road, two KubeCons, OSS Summit, Container Days in Hamburg, and RH Summit. This is the best Linux setup I've ever had, an OS installed for the life of the hardware, with every linux package at your fingertips. Zero maintenance. Let us know how you like it! 

Also thanks to Matt Hartley for starting this journey with us, and a big shout out to Mario Limonciello @ AMD, whose dedication in the Framework forum has been an inspiration to get this out the door!

## Wallpapers

We haven't put these on the image yet but we'll get them on there eventually, in the meantime here are the dark/light ones:

![framework_dark|690x388](upload://rEtxW2FnvaGIhAnwXAzELyb6AwY.webp)
![framework|690x388](upload://bDFWryOyQ3oZ7G4tsql9nDWcXUh.webp)