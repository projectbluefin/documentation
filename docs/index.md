---
title: Welcome to Bluefin
slug: /
pagination_next: downloads
---

# Welcome to Bluefin

For end users a system as reliable as a Chromebook with near-zero maintenance while providing developers with a powerful [cloud-native development mode](/bluefin-dx). Built with next-generation technology, for people who need their machines to get work done.

![Bluefin desktop screenshot](/img/bluefin-hero.webp)

## Is Bluefin for You?

Bluefin is a next-generation Linux desktop that trends toward progressive improvement. We rigorously and aggressively move away from legacy technologies as soon as possible to provide the best possible experience.

:::tip

Some might be so inclined to say that Bluefin would best serve developers or experienced Linux users, but I would argue that it's an equally strong contender for new users because of how reliable it is and how well-configured it comes out of the box.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin is:

- **Flatpak First** - The application model in Bluefin centers on isolated apps that are maintained in Flathub. Applications that do not work well with modern components such as Wayland, Pipewire, Flatpak Portals, etc. may provide a poor experience and are not recommended.
- **Purposely Invisible** - Bluefin is not a distribution. Your relationship is with Flathub, homebrew, and whatever you put in your containers.
- **Optimized for the 96%** - Not the 4% - Bluefin takes a "stronger together" approach towards features. You can always do what you want, but the value comes from sharing best practices. We don't spend much time on edge cases.
- **Proven development model** - Developer experience focused around containers and exposing new Linux users to the [tools used in cloud native](https://www.cncf.io/). See the [Mission Statement](/mission) and [Values](/values) pages for more information.
- **Purposely Focused on Great Hardware** - Bluefin runs best on Linux friendly hardware in order to provide as much of a legacy-free experience for users as possible. Bluefin also wants to support OEMs who sell Linux laptops and desktops, so it strives to run with the best combination of software and hardware. We do not go out of our way to document or workaround things that compromise the user experience, so in some cases another operating system is the correct choice.

If your requirements are outside of this scope, then **Bluefin might not be the best fit for you**. Bluefin may cause discomfort and disembowelment [when held incorrectly](/troubleshooting/#am-i-holding-bluefin-wrong). We recognize that in order to make a better desktop, many parts of the traditional Linux desktop experience will not be coming with us.

## Desktop Experience & Features

Bluefin features a GNOME ([Donate](https://www.gnome.org/donate/)) desktop configured by our community. It is designed to be hands-off and stay out of your way so you can focus on your applications.

System updates are image-based and automatic. Applications are logically separated from the system by using Flatpaks for graphical applications and `brew` for command-line applications.

:::tip

Bluefin is "An interpretation of the Ubuntu spirit built on Fedora technology"—a callback to an era of Ubuntu's history that many open source enthusiasts grew up with, much like the Classic X-Men. We aim to bring that same vibe here; think of us as the reboot. Chill vibes.

:::

- **Ubuntu-like GNOME layout** integrating curated extensions:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - for a familiar dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - for tray-like icons in the top right corner
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integrate your mobile device with your desktop
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donate](https://github.com/sponsors/aunetx)) - for that bling
  - [Search Light](https://github.com/icedman/search-light) - provides search functionality and a macOS Spotlight-like workflow bound to <kbd>Super</kbd>-<kbd>Space</kbd> by default
- **[Developer Mode](/bluefin-dx)** - dedicated developer tooling that transforms Bluefin into a powerful cloud-native workstation
- **[Ptyxis terminal](https://devsuite.app/ptyxis/)** for container-focused workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donate](https://github.com/sponsors/ranfdev)) for container management
- **[Tailscale](https://tailscale.com)** included for VPN along with `wireguard-tools` and systray support
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Donate](https://github.com/sponsors/mjakeman)) included
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** featuring [Flathub](https://flathub.org):
  - Familiar software center UI to install graphical applications
  - Abandoned applications and out-of-date runtimes are unlisted
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donate](https://ko-fi.com/heliguy)) included for Flatpak management
- **Quality of Life Features**:
  - [Starship](https://starship.rs) terminal prompt enabled by default
  - [Solaar](https://github.com/pwr-Solaar/Solaar) for Logitech mice along with `libratbagd`
  - [rclone](https://rclone.org/overview/) and [restic](https://restic.net/) for cloud storage mounts and modern file backups
  - `zsh` and `fish` included as optional shells
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) for laptops with dual GPUs
- **Universal Blue foundation**:
  - Extra udev rules for game controllers and other hardware out of the box
  - All multimedia codecs included
  - Staged automatic updates: use your computer normally and shut it off when you're done

## Distroless Focus

Bluefin specifically ships upstream tools in lieu of custom applications. The idea of a "distribution app store" has proven to be unsustainable for desktop application authors, so Bluefin ships tools like [Bazaar](https://github.com/kolunmi/bazaar) and [Homebrew](https://brew.sh) instead. Workflows remain not only distribution agnostic, but operating system agnostic.

:::info[It's a Cross Platform World]

The workflows in Bluefin are purposely upstream focused -- we believe in a consistent Linux experience for everyone, whether it's WSL on Windows, Podman/Docker on a Mac, or any Linux system. The [cloud native ecosystem](http://cncf.io) has proven that this model works. This allows millions of existing developers to onboard with a workflow that they already know, and allows Linux to compete where it matters the most.

:::

## Next Steps

- **[Downloads](/downloads)** — grab an official Bluefin ISO or torrent
- **[Installation Runbook](/installation)** — hardware planning and setup steps
- **[User Guide](/administration)** — day-to-day administration, updates, and apps
- **[Developer Guide](/bluefin-dx)** — containers, devcontainers, and AI tooling

The [announcement blog post](https://www.ypsidanger.com/announcing-project-bluefin/) also has some extra background information.

## Introductory Videos and Podcasts

Check out our [list of videos and reviews](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) for more information.

:::tip

"Evolution is a process of constant branching and expansion."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
