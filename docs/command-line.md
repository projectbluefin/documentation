---
title: Command Line 
slug: /command-line
---

Bluefin is designed to be used by normal people, but the command line is our passion. Therefore we invest in our command line experience, knowing that most people will never see it. Slay out.

## Command Line Applications 

The [brew](https://brew.sh/) application is the package manager used for installing command line applications in Bluefin.

- [Homebrew Documentation](https://docs.brew.sh/)
- [Homebrew Packages](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

Note that the cask functionality in homebrew is MacOS specific and non functional in Bluefin, flatpak is used instead.

:::info[Forging your own path]

Other package management tools like [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/), and [mise](https://github.com/jdx/mise) are available and work perfectly fine with homebrew.  

:::

## Terminal Configuration

### Changing the default terminal shell

:::note[Help Wanted]

The Bluefin team lacks expertise in both fish and zsh, contributions to help us reach feature parity would be welcome and appreciated!

:::

Bluefin ships [Ptyxis](https://devsuite.app/ptyxis/) as the default terminal. It shows up as `Terminal` in the menu. It is **strongly recommended** that you [change your shell via the terminal emulator instead of system-wide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). Click on the Terminal settings and edit your profile:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](https://github.com/user-attachments/assets/2c122205-dbd8-41e6-8b7b-4f536c3b69e9)

Then select "Use Custom Command" and then add the shell you want to use. `/usr/bin/fish` and `/usr/bin/zsh` are both included on the image:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](https://github.com/user-attachments/assets/8eb039db-7ec1-4847-b3d7-496d69fe9538)

## Fonts

Homebrew is also used for installing fonts, browse [this page](https://formulae.brew.sh/cask-font/) and install your favorite fonts. They will be copied into `~/.local/share/fonts`

- Microsoft Fonts: Follow [these instructions](https://github.com/colindean/homebrew-fonts-nonfree) to install Office fonts if you need them. You can skip the homebrew installation instructions since it is installed already.
