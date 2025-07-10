---
title: Administrator's Guide
slug: /administration
---

#### Day to Day Operation

Bluefin is designed to be installed for the life of the hardware without reinstallation. Unlike traditional operating systems the image is always pristine and "clean", making upgrades less problematic. Updates are automatic and silent by default.

This usually means you can set it up your system once, and then have it remain that way. Then likely you'll never have to come back here. 🙂

> I want that "defaults lifestyle".
>
> -[Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

![Bluefin Desktop Environment Illustration](https://github.com/user-attachments/assets/3f83b3a8-7d8d-492d-bb00-bee259d16592)

## Installing Applications

Use [Bazaar](https://github.com/kolunmi/bazaar) to [install applications from Flathub](https://flathub.org/). System updates and upgrades are not handled by this application, it's scope has been reduced to only install Flatpaks from Flathub. Two flatpak management tools are included:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) provides application management.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal) is also included for permission management.

![The Bazaar Software Center - App Illustration](https://github.com/user-attachments/assets/925afa45-f04d-4e3f-8fb7-3d26342c0151)

## System Updates

Bluefin is designed to be "hands off". The system checks for updates every six(6) hours. This includes system updates, flatpaks, pet containers, and homebrew. 

- Most images are published weekly, but the team may push a new update at any given time.
 
Updates are applied when the system reboots. Therefore, it is recommended to routinely power off your device when it's not being used to ensure kernel updates are being applied. Application updates (like the browser) happen independently of this and don't require a reboot.

Machine firmware updates are provided through the Firmware application

![Firmware](https://github.com/user-attachments/assets/0c3f2dce-1220-48d9-9a13-a1842a6a3bf3)

### Managing Updates

In Settings → Network → A network setting, set `Metered Connection: has data limits or can incur charges` to pause Bluefin updates:

![Settings → Network → A network setting - `Metered Connection: has data limits or can incur charges` Highlight](https://github.com/user-attachments/assets/97dfd5ff-d126-4fff-b439-18df391a1c49)

## Streams and Throttle Settings

Bluefin offers images based on the current and last stable version of Fedora, as well as a CentOS based image. This is to provide users with flexibility as to how aggresive they want their updates. These are referred to as "streams". 

### Bluefin 
`stable`: This is for enthusiasts who want the latest version of GNOME and Fedora. It is always aliased to the current version of Fedora but follows the Fedora CoreOS release schedule and not the Fedora Silverblue release schedule. This means that kernel upgrades come about 2 weeks after they land in Fedora, which can be useful for avoiding kernel regressions since the Bluefin team can pin to a specific kernel in those circumstances. We call this "gating" the kernel. `stable-daily` is available for those who want daily builds.

### Bluefin GTS
`gts`: This is the default image and is always aliased to the previous stable version of Fedora. It targets the majority of users. It is slang for "Grand Touring Support", to signify a faster cadence than an [LTS](https://www.linux.com/news/mark-shuttleworth-ubuntu-long-term-support/). It also features a gated kernel. 

#### Latest (For Testers)
`latest`: For users who want the very latest Fedora has to offer, an ungated linux kernel, daily updates, full open throttle. 🔥 This stream is purposely left unbranded and is not meant for general purpose use.

:::info[It's all just Bluefin]

Bluefin's components are shared across all images, don't think of it as a seperate "Edition" or "Spin". Bluefin strives to be the same across all the images, we feel that the aggressiveness of updates can be just "be a setting". Ideally you use "Bluefin" and don't need to care about your update stream. 

`lts` for a work machine and `stable` for your hot rod.

:::

You can choose from three rolling tags, or lock to a specific version of Fedora. Check the [release notes](https://github.com/ublue-os/bluefin/releases) for specific version information:


|                      | `gts` (default) | `stable` or `stable-daily` | `latest`       |
| -------------------- | --------------- | -------------------------- | -------------- |
| Fedora Version:      | 41              | 42                         | 42             |
| GNOME Version:       | 47              | 48                         | 48             |
| Target User:         | Most users      | Enthusiasts                | Advanced users and testers |
| System Updates:      | Weekly          | Weekly or Daily            | Daily          |
| Application Updates: | Twice a Day     | Twice a Day                | Twice a Day    |
| Kernel:              | Gated           | Gated                      | Ungated        |

**Note:** [Bluefin LTS](/lts) and [GDX](/gdx) not shown here, refer to their respective documentation for more details.

The major difference between `latest` and `stable` is the kernel cadence and when they do a major upgrade. `latest` will upgrade to the next major Fedora release as soon as it is available and builds daily. `stable` will upgrade when CoreOS does its userspace upgrade, which is usually a few weeks afterwards, and builds weekly or daily. Users can choose the `stable-daily` image for daily stable updates, or stick to `stable` for weekly builds.

#### Gated Kernel

The `gts` and `stable` tags feature a gated kernel. This kernel follows the same version as the [Fedora CoreOS stable stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable), which is a slower cadence than default Fedora Silverblue. The Universal Blue team may temporarily pin to a specific kernel in order to avoid regressions that may affect users.

Adding and editing kernel boot arguments is currently handled by `rpm-ostree`, check the [upstream documentation](https://docs.fedoraproject.org/en-US/fedora-coreos/kernel-args/#_modifying_kernel_arguments_on_existing_systems) for more information.

### Switching between Streams

> Note that the `stable` and `latest` streams update more aggresively and may introduce new changes from Fedora (including regressions), take the user's Linux expertise into account when changing the update cadence.

Use the `ujust rebase-helper` command to select rebase and select a specific stream:

![`ujust rebase-helper` - channel](https://github.com/user-attachments/assets/5ac60808-1e15-4c80-9592-e41fd2b52917)

Or select `date` and choose an older image.

![`ujust rebase-helper` - date](https://github.com/user-attachments/assets/567061da-036d-4779-873e-154a5a833e67)

#### Switching between tags manually

Here are the manual commands with rpm-ostree, we recommend becoming familiar with them if you find yourself rebasing often. Before changing a stream it is recommended to remove any locally layered packages:

```sh
rpm-ostree reset
```

Then run a status:

```sh
sudo bootc status
```

and look for the image you are on, it should look something like this:

```
Current staged image: ghcr.io/ublue-os/bluefin:gts
    Image version: 40.20241101.0 (2024-11-02 05:46:53.714 UTC)
    Image digest: sha256:cb57c75f7d700773ed6f54e4ba5550235a647fc9251e69345b1113cfd81dc884
Current booted image: ghcr.io/ublue-os/bluefin:gts
    Image version: 40.20241030.0 (2024-10-31 05:47:14.513 UTC)
    Image digest: sha256:5536b3511f38a57c7f71fd499b616671ef67043f155313f714f8c92a0f8d1e7c
Current rollback state is native ostree
```

The `ghcr.io/ublue-os/bluefin:gts` is the important part, with `bluefin` being the image name, and the `:gts` being the image tag. That is the image you are currently on. Look for `:gts`, `:stable`, `:latest`, or in certain cases the version like `:40` or `:41`.

> Pro Tip: Bluefin's [release notes](https://github.com/ublue-os/bluefin/releases) contain the stream switching instructions at the bottom of each release. This is useful if you're trying to nail down a regression in a specific package version.

Use the `bootc switch` command to move to a newer or older version:

#### Manual Rebase Examples

<details>

<summary>In this example we're rebasing to `:stable`, which is the latest stable release of Fedora (currently 41). The `--enforce-container-sigpolicy` is important to ensure you're checking the signature of the produced image:</summary>

```sh
sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy
```

To always be on the `:gts` (default) release:

```sh
sudo bootc switch ghcr.io/ublue-os/bluefin:gts --enforce-container-sigpolicy
```

Explicit version tags of the Fedora release are available for users who wish to handle their upgrade cycle manually:

```sh
sudo bootc switch ghcr.io/ublue-os/bluefin:40 --enforce-container-sigpolicy
```

Additionally rebasing to a specific date tag is encouraged if you need to "pin" to a specific day or version:

```sh
sudo bootc switch ghcr.io/ublue-os/bluefin:stable-20241027 --enforce-container-sigpolicy
```

If you use an nvidia machine, remember that the `-nvidia` is important! (This is why it's important to note the image name when you ran that previous status command:

```sh
sudo bootc switch ghcr.io/ublue-os/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Use the `skopeo inspect` command to query information from an image:

```sh
skopeo inspect docker://ghcr.io/ublue-os/bluefin
```

</details>

This will show all the available tags and useful metadata like image and kernel versions.

Check the [Fedora Silverblue User Guide](https://docs.fedoraproject.org/en-US/fedora-silverblue/) for more information.

## Virtual Private Networks (VPN)

[Tailscale](https://tailscale.com) is included by default to provide VPN services for both desktop and development use cases. [Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Using Tailscale with Mullvad](https://tailscale.com/kb/1258/mullvad-exit-nodes) - provides the best out of the box experience
- [Using Tailscale with Docker](https://tailscale.com/kb/1282/docker) - for development
- `ujust toggle-tailscale` will remove the built in desktop integration if you prefer to use something else
- Tailscale's [YouTube channel](https://www.youtube.com/@Tailscale) has lots of great tips and tricks
- Good VPN providers provide Wireguard configurations that can be imported directly into the Network Manager, check their documentation for more information

There are also VPN providers on Flathub which will offer a good experience: 

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn)
- [ProtonVPN client](https://flathub.org/apps/com.protonvpn.www) - available on FlatHub
  
Other VPN providers may provide a poor packaging experience and are not recommended.


## Enabling Local Layering

**Local Layering will be disabled by default in Spring 2025**

Local Layering is [adding individual packages](https://coreos.github.io/rpm-ostree/administrator-handbook/#hybrid-imagepackaging-via-package-layering) onto the system. In Spring 2025 Bluefin will come with Local Layering **OFF** by default. It is currently enabled by default.

Generally speaking this is an anti-pattern in Bluefin as the end goal is to move away from the package based model entirely, however sometimes you just need something. Toggling this back to `true` is just the user's acknowledgement that this will entail manual maintenance as a reminder and that the experience isn't as nice.

:::info

For some users this minimal amount of maintainance is still much smaller than what they are used to and they glady make that tradeoff. Well played.

:::

You can toggle this setting in `/etc/rpm-ostreed.conf`:

```
LockLayering=false
```

From the manpage:

>     LockLayering=
>       Controls whether any mutation of the base OSTree commit is supported (for
>       example, package overlays or overrides, initramfs overlays or regeneration).
>       Defaults to false.

`rpm-ostree reset` and a reboot will always bring the system back to pure image mode, making temporary compromises to get work done is perfectly fine.

| Probably Fine        | Don't Do It       |
| -------------------- | ----------------- |
| VPN Client           | Steam             |
| Third party software | Developer Tooling |

Local layering does significantly increase update time, but by default all Bluefin systems update in the background anyway and the result will mostly be invisible. Problems will generally occur if you are using a third party repository that doesn't align with what's happening in the Fedora archive at the time. Your mileage may vary.

## Overwriting System Defaults

Bluefin system defaults are shipped on the base image along with Fedora configuration in `/usr/etc`. Most of these can be overridden by placing a file in `/etc`.

For example, the Distrobox configuration is in `/usr/etc/distrobox/distrobox.ini`. Your customization options will be placed in `/etc/distrobox/distrobox.ini`. This is useful for situations where you need a copy of the original file for reference.

Check the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) for more information on configuration options, in particular `~/.local` and `~/.config`.

## Community Aliases and Workarounds

[just](https://just.systems) is used as a task runner on Bluefin. These are commonly community convenience aliases, or more complex scripts that help automate some tasks or initial setup. This is aliased as `ujust`, so that you can use `just` itself for your other projects.

### Handy Aliases

- `ujust --choose` - Shows every command and the script that is being executed when that command is chosen. Useful for browsing the available commands
- `ujust -n $command` - The `-n` will run a command in dry-run mode, this is useful for inspecting the commands being run
- `ujust update` - Manually update the system, flatpaks, and brew formulas
- `ujust bios` - Reboot the PC and enter the BIOS/UEFI. Useful for running dual boot systems from independent disks
- `ujust device-info` - Sends the status, flatpak list, and system info to the CentOS pastebin, and returns the URL to the terminal. This makes it easy for the end user to paste the URL with their info so others can help them debug
- `ujust changelogs` - Show the changelogs for each package since the last update

> Pro tip, keep your own tasks and aliases in `~/.Justfile`, and they are also handy to put in the root of your project files to automate common tasks, check out this example from [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads).

Note that generally speaking the project tries to keep the system Justfiles finely scoped, most of these workarounds and not full-fledged commands. They may get removed or changed depending on the problem they were initially meant to solve.

## Managing Extensions

Bluefin uses the [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) by Matthew Jakeman to manage the desktop extensions. The application is included by default. You can access it via the [Logo Menu](https://github.com/Aryan20/Logomenu) (thanks Aryan Kaushik!)

![GNOME Extension Menu Option (opens Extension Manager)](https://github.com/user-attachments/assets/c5ad1637-95c9-4692-8b25-e8ca6248e575)

This is useful if you decide you do not want to use some of the ones bundled with Bluefin.

![Extension Manager - System Extensions Highlight](https://github.com/user-attachments/assets/1d9756ce-fc1a-49da-a42e-89e275b80c91)

:::note

In the unlikely event that your session crashes, then all of your extensions will be disabled. In the rare case when this happens you may need to turn them all back on in the extensions manager.

:::

## Remote Management

:::note[Help Wanted]

This feature is incomplete and needs contributors to make it a reality

:::

Bluefin and Aurora include Cockpit for machine management. We're hoping to include more out-of-the-box management templates, please [check this issue](https://github.com/ublue-os/bluefin/issues/271) if you're interested in volunteering.

## Verification

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/overview/). You can verify the signature by downloading the `cosign.pub` key from [this repo](https://github.com/ublue-os/bluefin) and running the following command:

```sh
cosign verify --key cosign.pub ghcr.io/ublue-os/bluefin
```
