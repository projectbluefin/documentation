---
layout: page
title: Frequently Asked Questions
permalink: FAQ
---

The [general FAQ](https://projectbluefin.io/#scene-faq) on the website covers some of the most common questions. This section containers more specific questions: 

#  What about codecs?

Everything you need is included.

# How is this different from Fedora Silverblue?

Other than the visual differences, and codecs, there are some other key differences between Bluefin and Fedora Silverblue from a usage perspective:

- Bluefin takes a [greenfield approach](https://en.wikipedia.org/wiki/Greenfield_project) to Linux applications by defaulting to Flathub and `brew` by default
- Bluefin doesn't recommend using Toolbx - it instead focuses on [devcontainers](bluefin-dx#the-cloud-native-development-approach) for declarative containerized development. 
- Bluefin *tries* to remove the need for the user to use `rpm-ostree` or `bootc` directly
- Bluefin focuses on automation of OS services and upgrades instead of user interaction

# How do I get my GNOME back to normal Fedora defaults?

You can turn off the Dash to Dock and appindicator extensions to get a more stock Fedora experience by following [these instructions](administration#managing-extensions).

We set the default dconf keys in `/etc/dconf/db/local`, removing those keys and updating the database will take you back to the fedora default:

```bash
sudo rm -f /etc/dconf/db/local.d/01-ublue
sudo dconf update
```

# Starship is not for me, how do I disable it?

You can remove or comment the line below in `/etc/bashrc` to restore the default prompt.

```bash
eval "$(starship init bash)"
```

# Should I trust you?

This is all hosted, built, signed, and pushed on GitHub. As far as if I'm a trustable fellow, here's my [bio](https://www.ypsidanger.com/about/). If you've made it this far, then welcome to the future! :smile:
