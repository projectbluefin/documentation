---
title: "Easier Homebrew Installation for Custom Images"
slug: easier-homebrew-installation-for-custom-images
authors: castrojo
tags: [homebrew, development]
---

import GitHubProfileCard from "@site/src/components/GitHubProfileCard";

We've created a new repository to make it much easier to add Homebrew to your custom bootc images. [@ublue-os/brew](https://github.com/ublue-os/brew) repository provides a pre-packaged OCI container image that bundles everything you need to add Homebrew to your custom image-based systems. This is an evolution of a long journey to integrate homebrew better onto our Linux systems. Instead of manually setting up Homebrew, configuring services, and managing shell integrations, you can now include everything with a single line in your Containerfile.

```dockerfile
COPY --from=ghcr.io/ublue-os/brew:latest /system_files /
```

On first boot, the `brew-setup.service` automatically extracts Homebrew to `/var/home/linuxbrew/.linuxbrew`, sets up proper permissions, and makes it ready to use. The image also includes timers for automatic updates and upgrades, keeping your Homebrew installation current.

This removes a bunch of the manual stuff you had to do in your template to get the full thing, now it's much easier and reliable for everyone. Once we're done the container will rebuild after a Homebrew release, keeping us up to date and safe!

Check out the repository at [github.com/ublue-os/brew](https://github.com/ublue-os/brew) for more information and examples.

## Thanks! 

This work and testing brought to you by:

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
    gap: "1.5rem",
    marginBottom: "2rem",
  }}
>
  <GitHubProfileCard
    username="tulilirockz"
    title="Large Maniraptoran Specialist and co-maintainer"
    sponsorUrl="https://github.com/sponsors/tulilirockz"
  />
  <GitHubProfileCard username="renner0e" />
</div>

## [Discussions](https://github.com/ublue-os/bluefin/discussions/3860)
