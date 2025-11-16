---
title: Frequently Asked Questions
slug: /FAQ
---

The [general FAQ](https://projectbluefin.io/#scene-faq) on the website covers some of the most common questions. This section containers more specific questions:

## Am I holding Bluefin wrong?

![Don't hold Bluefin wrong](https://github.com/user-attachments/assets/6d03851b-5d42-4235-9e1c-3dde7c455946)

You can always do what you want, but Bluefin is designed with a certain workflow in mind. Here are some guidelines from the raptor experts:

- Containerize your developer environments rather than commingle them with the OS. You can define them per project in a `devcontainers.json` file managed by Git. This keeps them independent of host OS configuration. Bluefin is designed for a cross-platform world.
- Stick to Flatpaks and homebrew. The ideal is to leave the core OS image unchanged. Layering packages creates a maintenance burden that may be unnecessary to take on.
- Follow the XDG standards for overriding core OS files. The `/etc`, `/var`, `/usr/local`, and `/opt` directories are writable, and many applications will look here for overrides of the read-only files shipped with the OS image in `/usr`. Add to this your home directory, which contains the `~/.local` and `~/.config` subdirectories, which often allow per-user overrides of system defaults. When you’re [using your UNIX system correctly](https://www.youtube.com/watch?v=JOeY07qKU9c), the read-only part is invisible!
- Isolate the old-school jank in a container. Mangling packages on your host is for those throwback [paleosaurs](https://en.wikipedia.org/wiki/Palaeosaurus) among us; you know the type.
- Don’t overthink rebooting. Just turn off your PC when you’re not using it, and let the OS updates happen automatically, as they will.
- Bluefin performs best on Linux friendly hardware. Check hardware compatibility before making the commitment.
- Sometimes it helps to take time to [learn the language](https://www.youtube.com/watch?v=aVVURiaVgG8).
- Keep Bluefin’s ecosystem healthy by donating to application developers.

:::tip

I have Become Legend.

-- [Dominus Ghaul](https://www.youtube.com/watch?v=Og-2axO4Bi0)

:::

## So who is this for?

Bluefin **strongly** believes that new users to Linux should be introduced via a modern desktop. The market has already rejected the prior generation Linux clients, while modern implementations like ChromeOS and Android continute to be the most successful. It is clear that this is a generational shift. We are purposely here to help existing users bury the past and move on to something more useful than wrestling with their operating system.

:::warning[JARGON WARNING]

This next section goes into the why in more detail than most people need. You don't need to know any of this to use your computer, we provide this information for more advanced users to understand the design decisions in Bluefin. **95% of folks will be fine using their browser and the occasional Flatpak**, it is designed to be a general purpose OS to fit most people's needs without care about this stuff.

:::

### Rationale

One of the co-creators of Bluefin, using his experience from helping launch [askubuntu.com](https://askubuntu.com/users/235/jorge-castro), uses this as the reason for starting Bluefin in the first place:

![image](https://github.com/user-attachments/assets/6165e0e3-b60b-4bd1-82a8-b2fdd0595933)

Why spend decades documenting workarounds when you can just remove the problem entirely! Check out [Jorge Castro's blog](https://www.ypsidanger.com/) for years of back story on our quest to improve the desktop.

### But old docs are still valuable!

![image](https://imgs.xkcd.com/comics/wisdom_of_the_ancients.png)

Are they though? Bluefin believes in automating as much as possible, better to fix the problem than have to document it. Document the new stuff, which, if we are doing our job right is mostly upstream documentation anyway.

These days Linux is more generalized than ever before, it's one of the reasons Bluefin believes the old model of Linux distribution doesn't work on client-focused Linux desktops. Bluefin is here to help get that outdated stuff and put it in a museum. Where it rightfully belongs, an entire epoch of evolution of desktops. This is like moving from the Jurassic to the Cretaceous. An important but vital part of history, but it's time to upgrade to a new model.

Bluefin users continually use the Arch wiki for everything anyway, like everyone else. Bluefin chooses to consume it differently. The docs are purposely mostly pointers to documentation of the things that Bluefin ships. And then documentation that should take only 15 minutes to consume. This is why we are passionate about the whole "Not a distribution" thing. The goal is to become as invisible as possible. Arch wiki, Flatpak docs, brew docs, distrobox docs, and whatever container stack you use, including, all the traditional package managers in a container. This is your next mission. Congratulations, you've completed the Linux starter dungeon!

### My friends make fun of me because they think this is a fad or a toy like a Chromebook, what do I tell them?

They probably make fun of terms like "cloud native" too! Universal Blue images like Bluefin are designed by infrastructure experts who have decades of combined Linux experience. Bluefin is purposely funneling the expertise of world-leading experts in Linux, open source, and the things that the modern world _depends on_. By catering to this audience we know we can help make _fundamental improvements_ to the Linux desktop by bringing in experts who can help with the pipeline.

## What about codecs?

Everything you need is included.

## What's the deal with homebrew?

See [Homebrew is Great on Linux](https://www.ypsidanger.com/homebrew-is-great-on-linux/)

## Why so many images, this is confusing! How are users going to cope with the complexity!

Bazzite, Bluefin, and Aurora all came in at different times, the result of organic growth. **Don't overthink it**, the operating system's role is to boot and talk to the hardware, everything else is written by someone else. The people seeking out Linux will figure it out and generally speaking the ones stuck admining a PC for a loved one might as well make it straightforward for themselves. Chillops is the best ops. This ties into the next question:

## What's with all the Ubuntu influence?

Three of the co-creators of Bluefin worked on Ubuntu at Canonical. Ubuntu had tried [convergence](https://wiki.ubuntu.com/Convergence) in the past and though maligned by many, was the clear and obvious way to do it in hindsight. There are many things Canonical got right with Ubuntu conceptually, but the execution wasn't quite there, and we can fix that now.

With Aurora, Bluefin, Bazzite, and uCore you can have a work related image, one for your handheld, one for your gaming desktop, one for your HTPC, and one for your homelab. Throw [Jellyfin](https://jellyfin.org/) on your server, and clients on each machine for a great unified media experience.

One "OS" tailored for each use case.

## What's with all the dinosaurs?

Check out [this interview](https://youtu.be/XpKFcLqbd-A?si=URBJa_IzxU18UObY&t=2451) for a summary of the dinosaurs!

## Can I get the dinosaurs for KDE?

- Check out [plasma-bluefin-wallpaper](https://github.com/grandpares/plasma-bluefin-wallpaper) if you're on a Plasma system.

## Starship is not for me, how do I disable it?

You can remove or comment the line below in `/etc/bashrc` to restore the default prompt.

```bash
eval "$(starship init bash)"
```

![image](https://github.com/user-attachments/assets/013a75f5-0417-4287-9071-be58c8c38ffd)

## How do I modify the Linux kernel's boot arguments?

See this section of the [upstream documentation](https://docs.fedoraproject.org/en-US/fedora-coreos/kernel-args/#_modifying_kernel_arguments_on_existing_systems).

## I cannot switch keyboard layouts via shortcut

This is because GNOME's default switching key conflicts with Search Light. This can be fixed via **Settings**.

1. Open **Settings** and navigate to **Keyboard**
2. Scroll down to **Keyboard Shortcuts** then click on **View and Customize Shortcuts**
3. After opening up the shortcuts menu, click on **Typing**
4. Set the **Switch to next input source** to be the key combination you want

_Note: If you want to use the GNOME's default of `Super+Space`, you'll have to either disable Search Light or change their shortcut in **Extension Manager**_

## I use a keyboard layout that is not listed in the settings. How can I use it?

Your layout may be already included with Fedora, but you need to list extended keyboard layouts (example for the [EurKEY](https://eurkey.steffen.bruentjen.eu/start.html) layout):

1. Open **Gnome Tweaks**.
2. Navigate to **Keyboard**.
3. Toggle the **Show Extended Input Sources** to **On**.
4. Log out of your session and back again to commit the changes.
5. Open the **Settings** app.
6. Open the **Keyboard** category.
7. Add a new input source with **+**.
8. Click the three vertical dots button for **More...**
9. You can use the search box to type in "EurKEY".
10. There are only two to pick from, "English (United States)" and "Spanish (United States)". Pick one, probably "English (United States)" is what you want.
11. You get another sub-selection and can now pick "EurKEY (US)"

## How do I set up an Input Method Editor (IME)?

1. Install [Fcitx5](https://flathub.org/en/apps/org.fcitx.Fcitx5):
 ```bash
 flatpak install org.fcitx.Fcitx5
 ```
2. Install the [kimpanel](https://extensions.gnome.org/extension/261/kimpanel/) Gnome extension (required on Gnome/Wayland).
3. Install the Flatpak Add-on for the language you want to use.
   - For example, for Chinese:
 ```bash
 flatpak install org.fcitx.Fcitx5.Addon.ChineseAddons
 ```
4. In Fcitx5 settings, add the input method you want to use.
   - For example, for Chinese: Add 'Pinyin' to the list under Current Input Method.

Use `Ctrl+Space` to change the input method. Optionally, add Fcitx5 to list of start up apps in [Ignition](https://flathub.org/apps/io.github.flattool.Ignition).

For additional information, see [Fcitx wiki](https://fcitx-im.org/wiki/Using_Fcitx_5_on_Wayland#GNOME).

## How do I install Microsoft fonts?

Follow [these instructions](https://github.com/colindean/homebrew-fonts-nonfree) to install them via homebrew. (Skip the homebrew installation instructions). 

## How do I perform major version upgrades?

We recommend following these [highly detailed instructions](https://gld.mcphail.uk/posts/how-to-perform-a-major-version-upgrade-on-bluefin/).

## Should I trust you?

This is all hosted, built, signed, and pushed on GitHub. As far as if I'm a trustable fellow, here's my [bio](https://www.ypsidanger.com/about/). If you've made it this far, then welcome to the future! :smile:
