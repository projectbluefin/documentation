---
title: "Flatpak Support in Brewfiles"
slug: flatpak-support-in-brewfiles
authors: castrojo
tags: [announcements, homebrew]
---

Flatpak support in Brewfiles is here! You can now manage your Flatpak applications alongside your Homebrew formulae, casks, and other dependencies in a single `Brewfile`. This is thanks to the amazing work by [Ahmed Adan](https://github.com/ahmedadan) ([Donate](https://github.com/sponsors/ahmedadan)), who worked with upstream to land this feature.

## What's New

Homebrew Bundle now supports Flatpak packages on Linux. This means you can declare your Flatpak applications in your `Brewfile` and have them installed automatically with `brew bundle`.

Note from Jorge: I haven't played with this feature yet but announcing it so we can get feedback right away. 

## Basic Usage

Add Flatpak packages to your `Brewfile` using the `flatpak` directive:

```ruby
# Brewfile
brew "neovim"
flatpak "com.spotify.Client"
flatpak "com.visualstudio.code"
```

Then run:

```bash
brew bundle
```

## Remote Support

Homebrew Bundle supports three tiers of Flatpak remotes:

### Tier 1: Default Remote (Flathub)

For packages from Flathub (the default), just specify the app ID:

```ruby
flatpak "com.spotify.Client"
```

### Tier 2: URL Remote

For packages from other repositories, specify the remote URL:

```ruby
flatpak "org.godotengine.Godot", remote: "https://dl.flathub.org/beta-repo/"
```

### Tier 3: Named Remote with URL

For shared remotes that you want to reuse across multiple packages:

```ruby
flatpak "org.godotengine.Godot", remote: "flathub-beta", url: "https://dl.flathub.org/beta-repo/"
flatpak "io.github.dvlv.boxbuddyrs", remote: "flathub-beta"
```

## Commands

All the standard `brew bundle` commands work with Flatpak:

- **`brew bundle`** - Install Flatpak packages from your Brewfile
- **`brew bundle dump`** - Export your installed Flatpak packages to a Brewfile
- **`brew bundle cleanup`** - Remove Flatpak packages not in your Brewfile
- **`brew bundle check`** - Verify all Flatpak packages are installed
- **`brew bundle list --flatpak`** - List Flatpak packages in your Brewfile

Check out the [brew bundle documentation](https://docs.brew.sh/Brew-Bundle-and-Brewfile) for more information. 

### Dump Options

```bash
# Include Flatpak packages when dumping (default on Linux)
brew bundle dump

# Exclude Flatpak packages
brew bundle dump --no-flatpak

# List only Flatpak packages
brew bundle list --flatpak
```

## Why This Matters for Bluefin

This feature allows Bluefin users to maintain a single `Brewfile` that manages:

- Command-line and GUI applications in one file
- Lightweight gitops between all of your machines
- Paves the wave for better Homebrew/Flatpak integration

Your entire application stack can now be version controlled and reproduced across machines. Woo! We feel that this is a nice complement to [devcontainers](https://containers.dev/), providing even more flexibility to your workflows!
 
## How does it work in practice?

You're going to have to tell me, I am on holiday in the German countryside, but this feature is super exciting and I'm looking forward to hearing your feedback!

Refer to the [Homebrew Bundle documentation](https://docs.brew.sh/Brew-Bundle-and-Brewfile) for more!

## References

- [Pull Request: Add Flatpak support to brew bundle](https://github.com/Homebrew/brew/pull/19518)
- [Issue: Feature Request - Add Flatpak support to Brewfile](https://github.com/Homebrew/brew/issues/18163)

