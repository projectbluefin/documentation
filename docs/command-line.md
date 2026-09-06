---
title: Applications & Command Line
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin is designed to be used by normal people, but the command line is our _**passion**_. Therefore we invest in both the graphical desktop experience and the terminal workflow. Slay out.

## Graphical Applications

Bluefin follows a **Flatpak-first** approach for desktop software. Applications run isolated from the host operating system and are sourced from [Flathub](https://flathub.org).

- **[Bazaar](https://github.com/kolunmi/bazaar)** — the default application store. It filters abandoned applications and those depending on obsolete Flatpak runtimes.
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** — manage Flatpak lifecycles, inspect installed runtimes, clean up leftovers, and pin or downgrade versions.
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** — graphical permissions manager for fine-grained Flatpak filesystem, network, and device access control.

## Command Line Applications & Homebrew

[brew](https://brew.sh/) (Homebrew) is the primary package manager for installing command line applications and developer utilities without polluting the base OS image.

- [Homebrew Documentation](https://docs.brew.sh/)
- [Homebrew Packages](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

Note that Homebrew Cask functionality is macOS-specific and non-functional in Bluefin; Flatpak is used for GUI apps instead. Other tools like [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/), and [mise](https://github.com/jdx/mise) work smoothly when installed via Homebrew.

:::info[Don't cross the streams]

Generally speaking, if you need a CLI tool or utility, use Homebrew. If you need a library and dependencies for development work, use a container. This keeps everything pristine and reproducible.

:::

### Message of the Day and `fastfetch`

The project prefers to have functional bling that is slick but also serves a purpose. New terminals (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) display a message of the day with system information:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

The `bluefin-dx:beta` line is the name of the OS image, reminding you if you are on a pinned image, with quick reference to common commands. Toggle it on and off with `ujust toggle-user-motd`.

We love to flex our machines. Run `fastfetch`:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

This screen shows hardware information, username, machine name, and kernel version. Each Bluefin image has a "Forged On" date commemorating the initial installation of the machine:

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## Terminal Configuration

### Changing the Default Terminal Shell

Bluefin uses [bash](https://www.gnu.org/software/bash/) by default but also ships with [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) and [zsh](https://www.zsh.org/) on the image for convenience.

Bluefin ships [Ptyxis](https://devsuite.app/ptyxis/) as the default terminal (named `Terminal` in the app launcher). It is **strongly recommended** that you [change your shell via the terminal emulator instead of system-wide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). First install the shell you want with `brew install zsh` or `brew install fish`. Click on the Terminal settings and edit your profile:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

Select "Use Custom Command" and add your shell:

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## Maintainer Recommended GNOME Extensions

Here are GNOME extensions that the maintainers recommend to round out your desktop experience. Support extension authors by donating to the ones you love!

<div className={styles.extensionsGrid}>

<GnomeExtensions extensionId={5724} />
<GnomeExtensions extensionId={6670} />
<GnomeExtensions extensionId={6325} />
<GnomeExtensions extensionId={8834} />
<GnomeExtensions extensionId={3843} />
<GnomeExtensions extensionId={2236} />
<GnomeExtensions extensionId={5964} />
<GnomeExtensions extensionId={6000} />
<GnomeExtensions extensionId={7065} />

For a Tailscale GUI, we recommend the [official systray application](https://tailscale.com/kb/1597/linux-systray): `tailscale configure systray --enable-startup=systemd` and reboot.

</div>

## Fonts

Homebrew is also used for installing fonts. Browse [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/) and install your favorite fonts into `~/.local/share/fonts`.

### Microsoft Fonts

If you need Microsoft fonts for document compatibility:

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
