---
title: Command Line
slug: /command-line
---

Bluefin is designed to be used by normal people, but the command line is our _**passion**_. Therefore we invest in the command line experience, knowing that most people will never see it. Slay out.

## Installing Applications

[brew](https://brew.sh/) (Also known as Homebrew) is the package manager used for installing command line applications.

- [Homebrew Documentation](https://docs.brew.sh/)
- [Homebrew Packages](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

Note that the cask functionality in homebrew is macOS specific and non functional in Bluefin, Flatpak is used instead. Other package management tools like [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/), and [mise](https://github.com/jdx/mise) are available and work perfectly fine when installed via homebrew. Package managers inside of package managers ... hey look it was like that when we got here, this one isn't our fault! They do work great though, and some users may prefer those tools, so you have the option to forge your own path.

:::info[Don't cross the streams]

Generally speaking, if you need a tool or utility, use homebrew. If you need a library and dependencies for development work, use a container. This keeps everything nice and clean.

:::

### Message of the Day and `fastfetch`

The project prefers to have functional bling that is slick but it must also serve a purpose. New terminals (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) display a message of the day with some basic information:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

The `bluefin-dx:beta` line is the name of the OS image, and is a good way to remind yourself if you're on a pinned image as well as a quick reference to common commands. You can toggle it on and off with `ujust toggle-user-motd`. Note that the Tip rotates regularly in order to spread useful tips to the community.

We love to flex our machines and software. Run `fastfetch`:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

This screen will show you hardware information, as well as your username, machine name, and kernel version. Each Bluefin image has a "Forged On" date, commemorating the initial installation of the machine.

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## Terminal Configuration

### Changing the default terminal shell

Bluefin uses [bash](https://www.gnu.org/software/bash/) by default but also ships with [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) and [zsh](https://www.zsh.org/) on the image for convenience.

:::note[Help Wanted]

The Bluefin team lacks expertise in both fish and zsh, contributions to help us reach feature parity would be welcome and appreciated!

:::

Bluefin ships [Ptyxis](https://devsuite.app/ptyxis/) as the default terminal. It shows up as `Terminal` in the menu. It is **strongly recommended** that you [change your shell via the terminal emulator instead of system-wide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). First install the shell you want with `brew install zsh` or `brew install fish`. Click on the Terminal settings and edit your profile:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

Then select "Use Custom Command" and then add the shell you want to use: 

- zsh - `/home/linuxbrew/.linuxbrew/bin/zsh` 
- fish - `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## Fonts

Homebrew is also used for installing fonts, browse [this page](https://formulae.brew.sh/cask-font/) and install your favorite fonts. They will be copied into `~/.local/share/fonts`

- Microsoft Fonts:

If you need to install Microsoft fonts in order to ensure compatibility with some documents, most of them are in Homebrew.

Be aware that some of these fonts are copyrighted by Microsoft.
Microsoft UK confirmed you are allowed to have them, provided that you own a copy of either:

- Microsoft PowerPoint Viewer (free, retired)
- May include PowerPoint Mobile (free)
- Microsoft Office (Any version, Windows or Mac)

Calibri, Cambria, Candara, Consolas, Constantia and Corbel are included in font-microsoft-office, the others must be installed individually. You can install all of them at once by running the following command in a terminal:

```
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```



