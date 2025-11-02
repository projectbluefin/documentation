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

### `bluefin-cli`

`ujust bluefin-cli` will install Bluefin's opt-in command line experience using modern tools with great features that make us more efficient. It is designed to be turned on and off.

:::tip[A greenfield terminal experience]

We love our command line tools. This is intended to be a rendition of what a brand new terminal experience would look like with modern tooling. The traditional tooling is always a toggle away. Keep up with the cool kids without sacrificing your "known good" kit.

:::

The following applications are installed when you run `ujust bluefin-cli`:

| Name                                                                  | Description                                                           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [atuin](https://formulae.brew.sh/formula/atuin)                       | Improved shell history for zsh, bash, fish and nushell                |
| [bat](https://formulae.brew.sh/formula/bat)                           | Clone of cat(1) with syntax highlighting and Git integration          |
| [bash-preexec](https://formulae.brew.sh/formula/bash-preexec)         | Bash preexec and precmd functions à la Zsh                            |
| [bbrew](https://formulae.brew.sh/formula/bbrew)                       | TUI for Homebrew package management                                   |
| [chezmoi](https://formulae.brew.sh/formula/chezmoi)                   | Manage your dotfiles across multiple diverse machines, securely       |
| [direnv](https://formulae.brew.sh/formula/direnv)                     | Load/unload environment variables based on $PWD                       |
| [dysk](https://formulae.brew.sh/formula/dysk)                         | Get information on your mounted disks                                 |
| [eza](https://formulae.brew.sh/formula/eza)                           | Modern, maintained replacement for ls                                 |
| [fd](https://formulae.brew.sh/formula/fd)                             | Simple, fast and user-friendly alternative to find                    |
| [gh](https://formulae.brew.sh/formula/gh)                             | GitHub command-line tool                                              |
| [glab](https://formulae.brew.sh/formula/glab)                         | Open-source GitLab command-line tool                                  |
| [rg](https://formulae.brew.sh/formula/ripgrep)                        | Search tool like grep and The Silver Searcher (ripgrep)               |
| [starship](https://formulae.brew.sh/formula/starship)                 | Cross-shell prompt for astronauts                                     |
| [shellcheck](https://formulae.brew.sh/formula/shellcheck)             | Static analysis and lint tool, for (ba)sh scripts                     |
| [stress-ng](https://formulae.brew.sh/formula/stress-ng)               | Stress test a computer system in various selectable ways              |
| [tealdeer](https://formulae.brew.sh/formula/tealdeer)                 | Very fast implementation of tldr in Rust                              |
| [trash-cli](https://formulae.brew.sh/formula/trash-cli)               | Command-line interface to the freedesktop.org trashcan                |
| [television](https://formulae.brew.sh/formula/television)             | General purpose fuzzy finder TUI                                      |
| [uutils-coreutils](https://formulae.brew.sh/formula/uutils-coreutils) | Cross-platform Rust rewrite of the GNU coreutils                      |
| [ugrep](https://formulae.brew.sh/formula/ugrep)                       | Ultra fast grep with query UI, fuzzy search, archive search, and more |
| [yq](https://formulae.brew.sh/formula/yq)                             | Process YAML, JSON, XML, CSV and properties documents from the CLI    |
| [zoxide](https://formulae.brew.sh/formula/zoxide)                     | Shell extension to navigate your filesystem faster                    |

The community may add new tools over time, re-running `ujust bluefin-cli` will pull in the new tools.

:::tip

What greatness have I been missing? Being set in my old, tired ways.

-- Bill Childers (Probably, this quote is made up)

:::

![image](https://github.com/user-attachments/assets/89be8151-5b57-4b71-bbe5-988bef2d6798)

### Bold Brew

[Bold Brew](https://bold-brew.com/) is included as a text based user interface (TUI) to Brew. This application features full package management for homebrew in a nice nerdy interface:

![boldbrew](https://github.com/user-attachments/assets/d07c0455-2514-4b73-bdd5-51eec50b570d)

### Message of the Day and `fastfetch`

The project prefers to have functional bling that is slick but it must also serve a purpose. New terminals (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) display a message of the day with some basic information:

![image](https://github.com/user-attachments/assets/0e0326ef-6640-41a2-bd24-dae1b1647cfd)

The `bluefin-dx:beta` line is the name of the OS image, and is a good way to remind yourself if you're on a pinned image as well as a quick reference to common commands. You can toggle it on and off with `ujust toggle-user-motd`. Note that the Tip rotates regularly in order to spread useful tips to the community.

We love to flex our machines and software. Run `fastfetch`:

![image](https://github.com/user-attachments/assets/f720f9d8-7c3c-4f3c-9112-c627686e0fb1)

This screen will show you hardware information, as well as your username, machine name, and kernel version. Each Bluefin image has a "Forged On" date, commemorating the initial installation of the machine.

![image](https://github.com/user-attachments/assets/99522c15-1209-4fa5-a076-1b6289bdbc76)

:::tip[Of course it does]

Note that the terminal color scheme will automatically match [your desktop accent color](https://release.gnome.org/47/). Restart your terminal after setting the color for the setting to apply.

:::

## Terminal Configuration

### Changing the default terminal shell

Bluefin uses [bash](https://www.gnu.org/software/bash/) by default but also ships with [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) and [zsh](https://www.zsh.org/) on the image for convenience.

:::note[Help Wanted]

The Bluefin team lacks expertise in both fish and zsh, contributions to help us reach feature parity would be welcome and appreciated!

:::

Bluefin ships [Ptyxis](https://devsuite.app/ptyxis/) as the default terminal. It shows up as `Terminal` in the menu. It is **strongly recommended** that you [change your shell via the terminal emulator instead of system-wide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). Click on the Terminal settings and edit your profile:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](https://github.com/user-attachments/assets/2c122205-dbd8-41e6-8b7b-4f536c3b69e9)

Then select "Use Custom Command" and then add the shell you want to use. `/usr/bin/fish` and `/usr/bin/zsh` are both included on the image:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](https://github.com/user-attachments/assets/8eb039db-7ec1-4847-b3d7-496d69fe9538)

### Using `bluefin-cli` with alternate shells

You can enable `bluefin-cli` for `fish` or `zsh` by pre-pending an override to the `$SHELL` variable to the command with:

```
SHELL=fish ujust bluefin-cli
SHELL=zsh ujust bluefin-cli
# Or do it all at once from bash with
ujust bluefin-cli && SHELL=fish ujust bluefin-cli && SHELL=zsh ujust bluefin-cli
```

## Fonts

Homebrew is also used for installing fonts, browse [this page](https://formulae.brew.sh/cask-font/) and install your favorite fonts. They will be copied into `~/.local/share/fonts`

- Microsoft Fonts: 

If you need to install Microsoft fonts in order to ensure compatibility with some documents, most of them are in Homebrew.  

Be aware that some of these fonts are copyrighted by Microsoft.
Microsoft UK confirmed you are allowed to have them, provided that you own a copy of either:

* Microsoft PowerPoint Viewer (free, retired)
* May include PowerPoint Mobile (free)
* Microsoft Office (Any version, Windows or Mac)

Calibri, Cambria, Candara, Consolas, Constantia and Corbel are included in font-microsoft-office, the others must be installed individually.  You can install all of them at once by running the following command in a terminal: 

```
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia` 
```
