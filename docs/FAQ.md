---
title: Frequently Asked Questions
slug: /FAQ
---

The [general FAQ](https://projectbluefin.io/#scene-faq) on the website covers some of the most common questions. This section containers more specific questions:

# What about codecs?

Everything you need is included.

# How is this different from Fedora Silverblue?

Other than the visual differences, and codecs, there are some other key differences between Bluefin and Fedora Silverblue from a usage perspective:

- Bluefin takes a [greenfield approach](https://en.wikipedia.org/wiki/Greenfield_project) to Linux applications by defaulting to Flathub and `brew` by default
- Bluefin doesn't recommend using Toolbx - it instead focuses on [devcontainers](/bluefin-dx.md#the-cloud-native-development-approach) for declarative containerized development.
- Bluefin _tries_ to remove the need for the user to use `rpm-ostree` or `bootc` directly
- Bluefin focuses on automation of OS services and upgrades instead of user interaction

# Who is this for?

We **strongly** believe that new users to Linux should be introduced by via atomic image and not the traditional desktop. It is clear to us that this is a generational shift. We're purposely here to help existing users bury the past and move on to something more useful than wrestling with their operating system.

> **JARGON WARNING**: This next section goes in to the why into more detail than most people need. You don't need to know any of this to use your computer, we provide this information for more advanced users to understand the design decisions in Bluefin. **95% of folks will be fine just using their browser and the occasional Flatpak**, we've designed it to be a general purpose OS to fit most people's needs without care about this stuff.

## Rationale

One of the co-creators of Bluefin, using his experience from helping launch [askubuntu.com](https://askubuntu.com/users/235/jorge-castro), uses this as the reason for starting the project in the first place:

![image](https://github.com/user-attachments/assets/6165e0e3-b60b-4bd1-82a8-b2fdd0595933)

Why spend decades documenting workarounds when you can just remove the problem entirely! Check out [Jorge Castro's blog](https://www.ypsidanger.com/) for years of back story on our quest to improve the desktop.

## But old docs are still valuable!

![image](https://imgs.xkcd.com/comics/wisdom_of_the_ancients.png)

Are they though? We believe in automating as much as possible, better to fix the problem than have to document it. Just document the new stuff, which, if we're doing our job right is mostly upstream documentation anyway.

These days Linux is more generalized than ever before, it's one of the reasons we believe the old model of Linux distribution just doesn't work on client-focused Linux desktops. We're here to help get that out of dated stuff and put it in a museum. Where it rightfully belongs, an entire epoch of evolution of our desktops. This is like moving from the Jurassic to the Cretaceous. An important but vital part of our history, but it's time to upgrade to a new model.

Bluefin users continually use the Arch wiki for just about everything anyway, just like everyone else. We just choose to consume it differently. The docs are purposely mostly pointers to documentation of the things that we ship. And then documentation that should take only 15 minutes to consume. This is why we are passionate about the whole "We are not a distribution" thing. We are trying to become as invisible as possible. Arch wiki, flatpak docs, brew docs, distrobox docs, and whatever container stack you use, including, all the traditional package managers in a container. This is your next mission. Congratulations, you've complete the Linux starter dungeon!

## My friends make fun of me because they think this is a fad or a toy like a chromebook, what do I tell them?

They probably make fun of terms like "cloud native" too! Universal Blue images like Bluefin are designed by infrastructure experts who have decades of combined Linux experience. We are purposely funneling the expertise of world-leading experts in Linux, open source, and the things that the modern world _depend on_. By catering to this audience we know we can help make _fundamental improvements_ to the Linux desktop by bringing in experts who can help with the pipeline.

# What's the deal with homebrew?

See [Homebrew is Great on Linux](https://www.ypsidanger.com/homebrew-is-great-on-linux/)

# Why so many images, this is confusing! How are users going to cope with the complexity!

Bazzite, Bluefin, and Aurora all came in at different times, the result of organic growth. **Don't overthink it, you are using Fedora**. The people seeking out Linux will figure it out and generally speaking we're the ones stuck admining a PC for a loved one, might as well it easy on ourselves. Chillops is the best ops. This ties into the next question:

# What's with all the Ubuntu influence?

Three of the co-creators of Bluefin worked on Ubuntu at Canonical. Ubuntu had tried [convergence](https://wiki.ubuntu.com/Convergence) in the past and though maligned by many, was the clear and obvious way to do it in hindsight. There are many things Canonical got right with Ubuntu conceptually, but the execution just wasn't quite there, and we can fix that now.

With Aurora, Bluefin, Bazzite, and uCore you can have a work related image, one for your handheld, one for your gaming desktop, one for your HTPC, and one for your homelab. Throw [Jellyfin](https://jellyfin.org/) on your server, and clients on each machine for a great unified media experience.

One "OS" tailored for each use case, but still also, just Fedora. We never quite got the phone but GSConnect is good enough. Until someone starts making phosh images. 😈

# Starship is not for me, how do I disable it?

You can remove or comment the line below in `/etc/bashrc` to restore the default prompt.

```bash
eval "$(starship init bash)"
```

# How do I modify the Linux kernel's boot arguments?

See this section of the [upstream documentation](https://docs.fedoraproject.org/en-US/fedora-coreos/kernel-args/#_modifying_kernel_arguments_on_existing_systems).

# I use a keyboard layout that is not listed in the settings. How can I use it?

Your layout may be already included with Fedora, but you need to list extended keyboard layouts (example for the [EurKEY](https://eurkey.steffen.bruentjen.eu/start.html) layout):

1. Open `Gnome Tweaks`.
2. Navigate to `Keyboard`.
3. Toggle the `Show Extended Input Sources` to `On`.
4. Log out of your session and back again to commit the changes.
5. Open the `Settings` app.
6. Open the `Keyboard` category.
7. Add a new input source with `+`.
8. Click the three vertical dots button for "More..."
9. You can use the search box to type in "EurKEY".
10. There are only two to pick from, "English (United States)" and "Spanish (United States)". Pick one, probably "English (United States)" is what you want.
11. You get another sub-selection and can now pick "EurKEY (US)"

# Should I trust you?

This is all hosted, built, signed, and pushed on GitHub. As far as if I'm a trustable fellow, here's my [bio](https://www.ypsidanger.com/about/). If you've made it this far, then welcome to the future! :smile:
