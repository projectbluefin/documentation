---
layout: page
title: Administrator's Guide
permalink: /administration
---

# Bluefin Administrator's Guide
#### Day to Day Operation

Bluefin is designed to be installed for the life of the hardware without reinstallation. Unlike traditional operating systems the image is always pristine and "clean", making upgrades less problematic. This is possible because the image is built from scratch from the ground up and works before the client PC downloads and applies updates, as opposed to doing per-package upgrades in place. Updates are automatic and silent by default. 

This usually means you can set it up your system once, and then have it remain that way. Then likely you'll never have to come back here. 🙂 

> I want that "defaults lifestyle" --[Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

![image](https://github.com/user-attachments/assets/3f83b3a8-7d8d-492d-bb00-bee259d16592)

## Installing Applications

### Graphical Applications

Use the GNOME Software Center to [install applications from Flathub](https://flathub.org/). System updates and upgrades are not handled by this application, it's scope has been reduced to only install Flatpaks from Flathub. 
The [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) tool is included for management.

![86e06ae4-0aec-46ef-9709-936c3e938f70](https://github.com/user-attachments/assets/65b6cae5-9ed4-4d28-93b4-b6dfe9adf463)

### Command Line Applications

The [brew](https://brew.sh/) application is the package manager used for installing command line applications in Bluefin. 

- [Homebrew Documentation](https://docs.brew.sh/)
- [Homebrew Packages](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

## System Updates

Bluefin is designed to be "hands off". System updates apply weekly, and Flatpaks update twice a day [in the background](https://github.com/ublue-os/config/tree/main/files/usr/lib/systemd). Updates are applied when the system reboots. Therefore, it is recommended to routinely power off your device when it's not being used to ensure kernel updates are being applied. Application updates (like the browser) happen independently of this and don't require a reboot.

Machine firmware updates are provided through the standard Software Center:

![b6706ae4-d519-4508-b350-defce27aa8e4](https://github.com/user-attachments/assets/98256d26-87ff-458f-a5f1-ecfa31a4639c)

### Upgrades and Throttle Settings

Bluefin publishes images based on the current and last stable version of Fedora. This is to give users maximum flexibility by allowing them to rebase to the version they want. You can choose from three rolling tags, or lock to a specific version of Fedora.  

| | `gts` (default) | `stable` or `stable-daily` | `latest` |
|---|---|---|---|
| Fedora Version: | 40 | 41 | 41 | 
| GNOME Version: | 46 | 47 | 47 |
| Target User: | Most users | Enthusiasts | Advanced users | 
| System Updates: | Weekly | Weekly or Daily | Daily | 
| Application Updates: | Twice a Day | Twice a Day | Twice a Day | 
| Kernel: | Gated | Gated | Ungated | 

- `gts`: This is the default image and is always aliased to the previous stable version of Fedora. It targets the majority of users. It is slang for "Grand Touring Support", to signify a faster cadence than an [LTS](https://www.linux.com/news/mark-shuttleworth-ubuntu-long-term-support/) 
- `stable`: This is for enthusiasts who want the latest version of GNOME and Fedora. It is always aliased to the current version of Fedora but follows the Fedora CoreOS release schedule and not the Fedora Silverblue release schedule. `stable-daily` is available for those who want daily builds. 
- `latest`: For users who want the very latest Fedora has to offer, an ungated linux kernel, daily updates, full open throttle 🔥

The major difference between `latest` and `stable` is the kernel cadence and when they do a major upgrade. `latest` will upgrade to the next major Fedora release as soon as it is available and builds daily.

`stable` will upgrade when CoreOS does its userpace upgrade, which is usually a few weeks afterwards, and builds weekly or daily. Users can opt in to an optional `stable-daily` setting is available for daily stable updates, or stick to `stable` for weekly builds. 

> One of Bluefin's strengths is being able to atomically adjust versions. All the tags are built from the same repository and are essentially the same, the version numbers will just be different. `gts` for a work machine and `stable` for your hot rod. Additionally the ability to rebase between release cadences lets users repurpose machines for different use cases without needing to reinstall. 

#### Gated Kernel 

The `gts` and `stable` tags feature a gated kernel. This kernel follows the same version as the [Fedora CoreOS stable stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable), which is a slower cadence than default Fedora Silverblue.

#### Asus and Surface Devices

Asus and Surface devices use their own dedicated images and only follow the `:latest` tag. This is to ensure proper support for those devices. 

### Managing Updates

In Settings->Network set `Metered Connection: has data limits or can incur charges` to pause Bluefin updates: 

![image](https://github.com/user-attachments/assets/e550b5c4-391e-4903-8836-20596f5f3020)

### Enabling Local Layering
**This will become the default mode in Bluefin in Spring 2025**

Local Layering is [adding individual packages](https://coreos.github.io/rpm-ostree/administrator-handbook/#hybrid-imagepackaging-via-package-layering) onto the system. In Spring 2025 Bluefin will come with Local Layering **OFF** by default. It is currently enabled by default. 

Generally speaking this is an anti-pattern in Bluefin as the end goal is to move away from the package based model entirely, however sometimes you just need something. Toggling this back to `true` is just the user's acknowledgement that this will entail manual maintenance as a reminder and that the experience isn't as nice. 

> For some users this minimal amount of maintainance is still much smaller than what they are used to and they glady make that tradeoff. Well played. 

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

| Probably Fine | Don't Do It | 
|---|---|
| VPN Client | Steam |
| Third party software | Developer Tooling | 

Local layering does significantly increase update time, but by default all Bluefin systems update in the background anyway and the result will mostly be invisible. Problems will generally occur if you are using a third party repository that doesn't align with what's happening in the Fedora archive at the time. Your mileage may vary. 

### Switching between streams

> Note that the `stable` and `latest` streams update more aggresively and may introduce new changes from Fedora (including regressions), take the user's Linux expertise into account when changing the update cadence.

Use the `ujust rebase-helper` command to select rebase and select a specific stream: 

![image](https://github.com/user-attachments/assets/5ac60808-1e15-4c80-9592-e41fd2b52917)


Or select `date` and choose an older image. 

![image](https://github.com/user-attachments/assets/567061da-036d-4779-873e-154a5a833e67)


#### Switching between tags manually

Here are the manual commands with rpm-ostree, we recommend becoming familiar with them if you find yourself rebasing often. Before changing a stream it is recommended to remove any locally layered packages: 

```bash
rpm-ostree reset
```

Then run a status:

```bash
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

The `ghcr.io/ublue-os/bluefin:gts` is the important part, with `bluefin` being the image name, and the `:gts` being the image tag. That is the image you are currently on. Look for `:gts`, `:stable`, `:latest`, or in certain cases the version like `:39` or `:40`. Use the `bootc switch` command to move to a newer or older version:

#### Manual Rebase Examples

In this example we're rebasing to `:stable`, which is the latest stable release of Fedora (currently 40). The `--enforce-container-sigpolicy` is important to ensure you're checking the signature of the produced image:  

```bash
sudo bootc switch ghcr.io/ublue-os/bluefin:stable --enforce-container-sigpolicy
```
To always be on the `:gts` (default) release:

```bash
sudo bootc switch ghcr.io/ublue-os/bluefin:gts --enforce-container-sigpolicy
```
Explicit version tags of the Fedora release are available for users who wish to handle their upgrade cycle manually:

```bash
sudo bootc switch ghcr.io/ublue-os/bluefin:40 --enforce-container-sigpolicy
```

Additionally rebasing to a specific date tag is encouraged if you need to "pin" to a specific day or version:

```bash
sudo bootc switch ghcr.io/ublue-os/bluefin:stable-20241027 --enforce-container-sigpolicy
```

If you use an nvidia machine, remember that the `-nvidia` is important! (This is why it's important to note the image name when you ran that previous status command:

```bash
sudo bootc switch ghcr.io/ublue-os/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Use the `skopeo inspect` command to query information from an image:

```bash
skopeo inspect docker://ghcr.io/ublue-os/bluefin
```

This will show all the available tags and useful metadata like image and kernel versions. 

Check the [Fedora Silverblue User Guide](https://docs.fedoraproject.org/en-US/fedora-silverblue/) for more information.

## Overwriting System Defaults

Most Bluefin and Aurora system defaults are shipped on the base image along with Fedora configuration in `/usr/etc`. Most of these can be overridden by placing a file in `/etc`. 

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

![image](https://github.com/user-attachments/assets/c5ad1637-95c9-4692-8b25-e8ca6248e575)

This is useful if you decide you do not want to use some of the ones bundled with Bluefin. 

![extensions](https://github.com/user-attachments/assets/2ea316d3-bb71-461c-95dd-f119600d1568)

>**Note**: If your session crashes, then all of your extensions will be disabled.

## Remote Management

### Note

> This feature is incomplete and needs contributors to make it a reality

Bluefin and Aurora include Cockpit for machine management. We're hoping to include more out-of-the-box management templates, please [check this issue](https://github.com/ublue-os/bluefin/issues/271) if you're interested in volunteering.

## Terminal Configuration

### Changing the default terminal shell

> Note that the Bluefin team lacks expertise in both fish and zsh, contributions to help us reach feature parity would be welcome and appreciated!

Bluefin ships [Ptyxis](https://devsuite.app/ptyxis/) as the default terminal. It shows up as `Terminal` in the menu. It is **strongly recommended** that you [change your shell via the terminal emulator instead of system-wide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). Click on the Terminal settings and edit your profile:

![image](https://github.com/user-attachments/assets/2c122205-dbd8-41e6-8b7b-4f536c3b69e9)

Then select "Use Custom Command" and then add the shell you want to use. `/usr/bin/fish` and `/usr/bin/zsh` are both included on the image: 

![image](https://github.com/user-attachments/assets/8eb039db-7ec1-4847-b3d7-496d69fe9538)

### Adjusting the transparency

Ptyxis has a transparency option that you can toggle: `ujust ptyxis-transparency 0.95`. It accepts values between 0 and 1.0 to set the level of transparency. 

See the [bluefin-cli](https://docs.projectbluefin.io/bluefin-dx#bluefin-cli) section for more terminal goodies. 

## Verification

These images are signed with sigstore's [cosign](https://docs.sigstore.dev/cosign/overview/). You can verify the signature by downloading the `cosign.pub` key from [this repo](https://github.com/ublue-os/bluefin) and running the following command:

```bash
cosign verify --key cosign.pub ghcr.io/ublue-os/bluefin
```

