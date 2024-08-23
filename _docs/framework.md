---
layout: page
title: Bluefin on Framework Laptops
permalink: framework
---

# Bluefin and Aurora are community supported options for Framework laptops

Fedora is an officially supported option for the [Framework](https://frame.work) laptops. Due to it's cloud native nature, [Universal Blue](https://universal-blue.org/) images inherit the hardware support, which include Bluefin. Universal Blue partners with Framework to provide community support for these laptops by building on Fedora's support and extending it. The co-creators of Bluefin use Framework laptops as their laptops and it is the recommended "perfect setup". 

![83a08fa741add9e31b4762bf601337e4b506db8d](https://github.com/user-attachments/assets/3dd48f0f-f839-47ca-96f3-8e230e11e47e)

Bluefin and it's sister images [Aurora](https://getaurora.dev), and [Bazzite](https://bazzite.gg) are community supported options on Framework hardware.

![e7f719d97dee2083907dda5d06171608f6384bea](https://github.com/user-attachments/assets/3091108c-3228-400c-883d-16d6b734b47d)


- [frame.work/linux](https://frame.work/linux)

The core team and many contributors use Bluefin on the Framework 13(Intel/AMD) and Framework 16 models.

# Features

-    Patched Switcheroo (FW16 only)
     -  Applications will automatically use the dGPU. This is defined by their .desktop file, so applications like Steam & Lutris will do this automatically. No more need to add DRI_PRIME.
- Fractional scaling enabled out of the box
- Fingerprint service installed and enabled out of the box
- VRR supported on the Framework 16 (Bazzite only)
- Steam Deck MicroSD cards are automounted and loaded into Steam when used with the  Framework MicroSD module
   - With the Framework MicroSD card module, MicroSD cards can be shared with Steam Deck, Ally, Legion GO, and other handheld gaming hardware running Steam OS or Bazzite. 
- `ujust setup-luks-tpm-unlock` to enable TPM unlock for LUKS
  -  Users can now get the full benefit of LUKS encryption while only needing to unlock with a fingerprint.
- `ujust check-idle-power-draw` to check idle power draw with powerstat
- Automatic karg application for Frameworks with Intel hardware to support keyboard shortcuts
- Framework logo is automatically applied to the Logo menu shell extension in GNOME when running on Framework hardware
   - Immediately obvious to the end user they're getting specialized support for their hardware.
 
# Installation

- [Framework 13](framework-13)
- [Framework 16](framework-16)

# Support Expectations

There is a [framework tag](https://github.com/ublue-os/bluefin/issues?q=is%3Aissue+is%3Aopen+label%3Aframework) in GitHub if you want to report issues. Please remember that these are community supported:

- We'll do our best, but are always looking for help
- We may mark things as out of scope for us based on what we provide. Some things are better handled in Fedora directly.
- We will pull in things as appropriate from other sources. In the past we did things like pull in AMD's patches to the gnome ppd, and may include things based on feedback from the Framework team, and engineers at AMD and Intel. 

And also a reminder that our images are Containerfiles and bash, if you find an issue and know how to Linux, it's much easier when we do it together. Enjoy!
