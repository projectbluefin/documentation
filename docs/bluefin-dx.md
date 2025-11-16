---
slug: /bluefin-dx
---

# Developer Mode

The Bluefin Developer Experience (`bluefin-dx`) is a dedicated developer image with bundled tools. Unlike traditional Linux systems, the operating system and developer environment are explicitly and purposely separated. This means that tooling is not installed on the host, and is instead containerized, in a virtual machine, or scoped to the user's home directory. It is designed to meet the following use cases:

:::info[Stronger Together]

There are [15.6 million cloud native developers](https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/) in the world. Our workflow is based on the development lessons learned from these techniques

:::

Bluefin endevours to ship:

- The world's most powerful [cloud native developer environment](https://landscape.cncf.io/)
- Full virtualization support centered around QEMU/KVM, as well as support for Docker and Incus
- [Bluefin GDX](/gdx) variant specifically designed for AI and Machine Learning

## The Cloud Native Development Approach

Bluefin goes "all in" on cloud native development and is used differently than a traditional distribution such as Ubuntu:

- Development is done in [devcontainers](https://containers.dev/)
- Command line applications are installed using [homebrew](https://brew.sh)
- Preconfigured ad-hoc containers for Ubuntu, Fedora, and Wolfi are included. Use whichever distribution you want.

This differs from traditional distributions by making the development process operating system agnostic. There is no equivalent to `apt install php` on Bluefin; development is done with `podman` or `docker` directly via an IDE.

We also believe in easy access to other thriving ecosystems like Python via `uv`. We throw in the towel on "one Linux system package manager to rule them all" because these ecosystems are giants themselves. Critics will say we ship too many package managers, we say we don't ship package managers, we ship _ecosystems that users want_. And these modern package managers are designed for a world running on containers because that's actually true. And we want it on our desktops out of the box.

:::tip[Why cloud native?]

We picked the cloud native pattern because local development in containers translates to deployment of containers on modern infrastructure.

:::

![image](https://github.com/user-attachments/assets/51415b6c-b7fe-45e9-af74-c01694b26fbe)

The pattern in `bluefin-dx` (and `aurora-dx`) centers around [devcontainers](https://containers.dev). Since devcontainers live in the project's git repository, they can be deployed on any operating system: Linux, macOS, or Windows (via WSL). This facilitates "distributed by default" development and avoids Linux users being "the odd one out" when working with teammates on other operating systems.

Each project includes a declarative environment intended to start the user with a "best practice" cloud-native workflow out of the box. The [Ultimate Guide to Dev Containers](https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers) has a good write-up on the advantages of using devcontainers. This means that the development environment is kept in version control instead of coupled to the host.

Homebrew can also be used to install development tools. However, it is recommended to avoid that and declare the project's dependencies in version control. It's so convenient sometimes, [it's okay](https://www.youtube.com/shorts/lKwavoyaaFA).

You can always use whatever you want. You do not need to use everything in here in order to be productive -- at the end of the day it's your computer and this is a set of defaults.

# Enabling Developer Mode

Turning on developer mode is a two-step process:

## Step 1: Turn it on

`ujust devmode` to enable or disable the dx mode, then reboot:

![image](https://github.com/user-attachments/assets/76df5201-da02-42d0-bec9-fad259df9b0d)

## Step 2: Add yourself to the right groups

**Bluefin LTS users**: You can skip this step and just reboot.

For other Bluefins:

`ujust dx-group` - to add your user account to the right groups. Then reboot. This step only needs to be done once.

Like all Universal Blue images, switching is atomic, allowing for clean switching between modes depending on the use case.

# Features

## Visual Studio Code with Docker

[Visual Studio Code](https://code.visualstudio.com/) is included in the image as the default IDE. It comes with the [devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) already installed. It's the recommended developer experience, so start here if you're new to containerized development!

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers) - you can skip most of the installation instructions and go directly to [the tutorial](https://code.visualstudio.com/docs/devcontainers/tutorial#_install-the-extension)
- [Dev Containers Specification](https://containers.dev/)
- [Beginner's Series to: Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) - great introductory tutorial from the [VS Code YouTube channel](https://www.youtube.com/@code/videos)

The most current [Docker Engine](https://docs.docker.com/engine/) is included by default and is set up to be the default container runtime for vscode. Using [docker compose](https://danielquinn.org/blog/developing-with-docker/) is also a great way to get started in container development and is an option if devcontainers don't fit your style.

## DevPod

DevPod is an open source tool used to create reproducible developer environments. Each developer environment runs in a separate container and is specified through a `devcontainer.json` file. It's like Codespaces but is open-source, client-only, and unopinionated: it works with any IDE and lets you use any cloud, Kubernetes, or even local `docker` environment.

- [DevPod Website](https://devpod.sh/)
- [DevPod Documentation](https://devpod.sh/docs/what-is-devpod)
- [DevPod Quickstart VS Code](https://devpod.sh/docs/getting-started/quickstart-vscode)
- [Loft.sh](https://www.loft.sh/)

Check out this talk from [Rich Burroughs](https://timeline.richburroughs.dev/):

<iframe width="560" height="315" src="https://www.youtube.com/embed/jSVWiecTeo0?si=5qtlkPFtOnAAq8aD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Podman and Podman Desktop

![Podman Desktop](https://github.com/user-attachments/assets/69f64ed1-7fcc-4040-9a3d-12b71308da1b)

[Podman Desktop](https://podman-desktop.io/) is included to provide container management. Check out the Podman Desktop [documentation](https://podman-desktop.io/docs/intro) for more information. All the upstream `podman` tools are included. This is the default system container runtime and is the recommended developer configuration that Fedora ships with.

Though Bluefin defaults to docker and vscode for development, all of the Fedora upstream tools are included for those who prefer that experience.

## Built-in Performance Tooling

[Sysprof](https://www.sysprof.com/) is included as a systemwide performance profiler. As well as [Brendan Gregg's](https://www.brendangregg.com/) recommended CLI tools:

- `bcc`, `bpftrace`, `iproute2`, `nicstat`, `numactl`, `sysprof`, `sysstat`, `tiptop`, `trace-cmd`, and `util-linux`

Thanks to Ubuntu and Canonical for the [detailed specification](https://discourse.ubuntu.com/t/spec-include-performance-tooling-in-ubuntu/43134) and rationale. The project hopes that the inclusion of performance tools will [lead to better upstream software](https://blogs.gnome.org/chergert/2024/09/25/messaging-needs/).

## Quality of Life Improvements

- A collection of well-curated monospace fonts
- [Just](https://github.com/casey/just) task runner for automation tasks
- `fish` and `zsh` available as optional shells

### Pet Containers

Pet containers are available as interactive terminals via [distrobox](https://distrobox.it/). Manage these via the included [DistroShelf](https://github.com/ranfdev/DistroShelf) application, available via the logomenu in the top left corner of your desktop under "Containers":

![image](https://github.com/user-attachments/assets/bdab71b0-c04a-4562-a73d-396d4b907060)

Use DistroShelf's interface to create your own pet containers from whichever distribution is on the list:

![image](https://github.com/user-attachments/assets/2daf276d-2aed-47b9-9792-923d674ef226)

For CLI warriors you can manage your containers with the Terminal's built-in container support:

![image](https://github.com/user-attachments/assets/2a4dc4b5-f1a8-4781-80a4-92ea4dfeeb97)

The included [Terminal](https://gitlab.gnome.org/chergert/ptyxis) includes a host terminal so that you can quickly switch between containers and the host.

- The default terminal is [Ptyxis](https://gitlab.gnome.org/chergert/ptyxis), which includes built in integration of distrobox containers. It is aliased as "Terminal" in the menu. It is mapped to <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>Enter</kbd> by default for quick launch
- [Podman Desktop](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) - Containers and Kubernetes for application developers
- [Pods](https://flathub.org/apps/com.github.marhkb.Pods) is also a great way to manage your containers graphically

# Other Tooling

## JetBrains

`ujust jetbrains-toolbox` will fetch and install the [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app) application, which will manage the installation of the JetBrains set of tools. This application will handle installation, removal, and upgrade of the JetBrains products, and is handled completely in your home directory, independent of the operating system image. We do not recommend using the JetBrains flatpaks.

- Check the [JetBrains documentation](https://www.jetbrains.com/help/idea/podman.html) for integrating those tools with the podman runtime.
- Check out how to [setup JetBrains with devcontainers](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html)
- [Uninstallation instructions](https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270-How-to-uninstall-Toolbox-App-)

The JetBrains blog also has more information on JetBrains Dev Containers support:

- [Using Dev Containers in JetBrains IDEs – Part 1](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/)

DevPod also has support for JetBrains:

- [DevPod Quickstart JetBrains](https://devpod.sh/docs/getting-started/quickstart-jetbrains)

## Neovim

`brew install neovim devcontainer` then follow these directions for a devcontainer setup:

- [Running Neovim with Devcontainers](https://cadu.dev/running-neovim-on-devcontainers/)
- [DevPod Quickstart for Neovim](https://devpod.sh/docs/getting-started/quickstart-vim)

## Virtualization and Container Runtimes

- [virt-manager](https://virt-manager.org/) and associated tooling (KVM, qemu)
- [Incus](https://linuxcontainers.org/incus/) provides system containers (Not available in Bluefin LTS)

## Local Application Development

[GNOME Builder](https://developer.gnome.org/documentation/introduction/builder.html) is the recommended application stack for making application.

## Kubernetes

`ujust bluefin-k8s` will install a common set of tools used by Kubernetes administrators. Or install these individually:

| Name                                                | Description                                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [cdk8s](https://formulae.brew.sh/formula/cdk8s)     | Defines Kubernetes applications and reusable abstractions using familiar programming languages.                  |
| [k0sctl](https://formulae.brew.sh/formula/k0sctl)   | A command-line tool for bootstrapping and managing k0s Kubernetes clusters.                                      |
| [k3sup](https://formulae.brew.sh/formula/k3sup)     | A light-weight utility to install k3s on any local or remote VM.                                                 |
| [kind](https://formulae.brew.sh/formula/kind)       | A tool for running local Kubernetes clusters using Docker container “nodes”.                                     |
| [dagger](https://formulae.brew.sh/formula/dagger)   | A portable devkit for CI/CD pipelines.                                                                           |
| [grype](https://formulae.brew.sh/formula/grype)     | A vulnerability scanner for container images and filesystems.                                                    |
| [helm](https://formulae.brew.sh/formula/helm)       | The package manager for Kubernetes.                                                                              |
| [kubectl](https://formulae.brew.sh/formula/kubectl) | The Kubernetes command-line tool, allows you to run commands against Kubernetes clusters.                        |
| [k9s](https://formulae.brew.sh/formula/k9s)         | Provides a terminal UI to interact with your Kubernetes clusters.                                                |
| [kubectx](https://formulae.brew.sh/formula/kubectx) | A tool to switch between contexts (clusters) on kubectl faster.                                                  |
| [pack](https://formulae.brew.sh/formula/pack)       | A CLI tool to build apps using Cloud Native Buildpacks.                                                          |
| [syft](https://formulae.brew.sh/formula/syft)       | A CLI tool and library for generating a Software Bill of Materials (SBOM) from container images and filesystems. |

## Fonts

`ujust bluefin-fonts` will install the following collection of well-curated Mono fonts. Or install these individually. Check the [homebrew website](https://formulae.brew.sh/cask-font/) to add more fonts, or use the included [Embellish](https://flathub.org/en/apps/io.github.getnf.embellish) tool.

| Name                                                                                      |
| ----------------------------------------------------------------------------------------- |
| [CaskaydiaMono Nerd Font](https://formulae.brew.sh/cask/font-caskaydia-mono-nerd-font)    |
| [Droid Sans Mono Nerd Font](https://formulae.brew.sh/cask/font-droid-sans-mono-nerd-font) |
| [Go Mono Nerd Font](https://formulae.brew.sh/cask/font-go-mono-nerd-font)                 |
| [IBM Plex Mono Nerd Font](https://formulae.brew.sh/cask/font-ibm-plex-mono-nerd-font)     |
| [Sauce Code Pro Nerd Font](https://formulae.brew.sh/cask/font-sauce-code-pro-nerd-font)   |
| [Source Code Pro](https://formulae.brew.sh/cask/font-source-code-pro)                     |
| [Ubuntu Nerd Font](https://formulae.brew.sh/cask/font-ubuntu-nerd-font)                   |
| [FiraCode Nerd Font](https://formulae.brew.sh/cask/font-fira-code-nerd-font)              |
