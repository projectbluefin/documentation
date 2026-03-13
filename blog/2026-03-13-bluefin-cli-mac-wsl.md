---
slug: bluefin-cli-mac-wsl
title: "bluefin-cli: Now on Mac and Windows"
authors: [castrojo]
tags: [announcements, homebrew]
---

The command line is our passion. And now you don't need to run Bluefin to get in on it.

We've been quietly building `bluefin-cli` — the opt-in terminal experience that ships with Bluefin — into something that runs anywhere. Today it's available as an early alpha on macOS, any Linux distribution, and Windows via WSL or PowerShell.

## What is `bluefin-cli`?

On Bluefin, `ujust bluefin-cli` turns on a curated set of modern command line tools: `eza`, `bat`, `zoxide`, `atuin`, `starship`, `ripgrep`, `fd`, `ugrep`, `tealdeer`, and more. The philosophy is simple — a greenfield terminal experience using the best tools available today, with the ability to toggle it off and return to your known-good kit at any time.

That same experience is now available cross-platform.

## Installation

Install via Homebrew:

```bash
brew install ublue-os/tap/bluefin-cli
```

This works on:

- **macOS** — Intel and Apple Silicon
- **Linux** — any distribution with Homebrew
- **Windows** — WSL2 or PowerShell

On Windows with PowerShell, enable shell integration after installing:

```powershell
bluefin-cli shell powershell on
```

On bash, zsh, or fish:

```bash
bluefin-cli shell bash on
# or
bluefin-cli shell zsh on
# or
bluefin-cli shell fish on
```

## What you get

Once enabled, `bluefin-cli` brings the same tooling to your terminal regardless of OS:

- **`eza`** — modern replacement for `ls`
- **`bat`** — `cat` with syntax highlighting and git integration
- **`zoxide`** — smarter `cd` that learns your habits
- **`atuin`** — shell history sync across machines
- **`starship`** — fast, cross-shell prompt
- **`uutils-coreutils`** — Rust rewrite of the GNU coreutils
- **`ripgrep`**, **`fd`**, **`ugrep`** — faster search tools
- **`tealdeer`** — fast `tldr` for quick command references

You can also grab Bluefin artwork and wallpaper collections, browse and install curated Brewfiles via the TUI, and run `bluefin-cli motd show` to get the same Message of the Day that greets Bluefin users at every new terminal.

## This is an early alpha

The cross-platform release is early. Things will be rough in places. [Open issues with feedback](https://github.com/hanthor/bluefin-cli/issues/new) — that's how this gets better.

The full source is at [hanthor/bluefin-cli](https://github.com/hanthor/bluefin-cli). Contributions welcome.

---

If you're already running Bluefin, nothing changes — `ujust bluefin-cli` still works the same way. This is for everyone else who wants in.
