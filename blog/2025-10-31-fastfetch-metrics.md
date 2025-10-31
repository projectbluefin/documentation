---
title: "Bluefin adds usage metrics to fastfetch"
date: 2025-10-31
authors: [renner0e, castrojo]
---

A new feature has been added to `fastfetch` to display usage metrics. This will give users a better understanding of the project's user base and the popularity of Bazaar.

This change, contributed by [renner0e](https://github.com/renner0e), adds two new metrics to the `fastfetch` output:

- **Murder Chickens**: A weekly count of Bluefin users.
- **Bazaar Installs**: A weekly count of package installations from Bazaar.

This will provide valuable insight into the growth and usage of Bluefin and its features.

The change was implemented in this [pull request](https://github.com/ublue-os/packages/pull/991), with corresponding changes in the [main bluefin repository](https://github.com/ublue-os/bluefin/pull/3548) and the [LTS repository](https://github.com/ublue-os/bluefin-lts/pull/828).

I could not find a screenshot in the pull request, but the change is a simple one-liner that improves the user experience for Homebrew users.
