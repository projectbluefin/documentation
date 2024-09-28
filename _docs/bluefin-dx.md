---
layout: page
permalink: /bluefin-dx
---

# Developer Mode (`bluefin-dx`)

The Bluefin Developer Experience (`bluefin-dx`) is a dedicated developer image with bundled tools. Unlike traditional Linux systems, the operating system and developer environment are explicitly and purposely separated. This means that tooling is not installed on the host, and is instead containerized, in a virtual machine, or scoped to the user's home directory. It is designed to meet the following use cases:

- Endeavors to be the world's most powerful [cloud native developer environment](https://landscape.cncf.io/)
- Full virtualization support centered around KVM and QEMU

# The Cloud Native Development Approach

Bluefin goes "all in" on cloud native development and is used differently than a traditional distribution such as Ubuntu:

- Development is done in [devcontainers](https://containers.dev/)
- Command line applications are installed using [homebrew](https://brew.sh)
- Preconfigured ad-hoc containers for Ubuntu, Fedora, and Wolfi. Use whichever distribution you want. 

> This differs from apt, snap, and dnf where one packaging system handles both the graphical applications AND the command line applications.  This decoupling is what provides greater system reliability, near unlimited choice of software, and "distributed by default" development.  

In short, we picked it because this pattern is how servers are deployed in modern infrastructure. And the developers deploying those systems are already using homebrew and we want to leverage as much of that success as possible for the Linux desktop.

![image](https://github.com/user-attachments/assets/51415b6c-b7fe-45e9-af74-c01694b26fbe)

The pattern in `bluefin-dx` (and `aurora-dx`) is centered around [devcontainers](https://containers.dev).  Since development is not dependent on the operating system image, you can use whatever you want, you do not need to use everything in here in order to be productive -- think of them as prepaved paths that you can choose to use.  

Dev Containers were chosen to facilitate distributed development, each project has a declarative environment that is intended to be start the user with a "best practice" cloud-native workflow out of the box. The [Ultimate Guide to Dev Containers](https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers) has a good write up of the advantages of using devcontainers. This means that the development environment is kept in version control instead of coupled to the host. 

Homebrew can also be used for installation of development tools. 

>**Note**: This is an opinionated developer workflow that [differs from Fedora's use of toolbox](https://docs.fedoraproject.org/en-US/fedora-silverblue/toolbox/).  Toolbox is included for people who prefer the upstream approach. 

# Enabling Developer Mode

You can rebase to the dx image by using the following command:

## Step 1: Turn it on
`ujust devmode` to enable or disable the dx mode, then reboot:

![image](https://github.com/user-attachments/assets/76df5201-da02-42d0-bec9-fad259df9b0d)

## Step 2: Add yourself to the right groups 
`ujust dx-group` - to add your user account to the right groups. Then log out and back in. This step only needs to be done once. 

Like all Universal Blue images, switching is atomic, allowing for clean switching between modes depending on the use case.

# Features

## Visual Studio Code with Docker

[Visual Studio Code](https://code.visualstudio.com/) is included on the image as the default IDE. It comes with the [devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) already installed. It's the recommended developer experience, start here if you're new to containerized development! 

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers) - you can skip most of the installation instructions and go directly to [the tutorial](https://code.visualstudio.com/docs/devcontainers/tutorial#_install-the-extension)
- [Dev Containers Specification](https://containers.dev/) 
- [Beginner's Series to: Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) - great introductory tutorial from the [VS Code YouTube channel](https://www.youtube.com/@code/videos)

<iframe src="https://www.youtube.com/embed/?listType=playlist&list=PLj6YeMhvp2S5MwL7nPmMWk_lTbZsk_AmZ" frameborder="0" allowfullscreen></iframe>

The most current [Docker Engine](https://docs.docker.com/engine/) is included by default and is set up to be the default container runtime for vscode. 

## Devpod

DevPod is an open source tool used to create reproducible developer environments. Each developer environment runs in a separate container and is specified through a devcontainer.json. Codespaces but open-source, client-only and unopinionated: Works with any IDE and lets you use any cloud, kubernetes or just localhost docker. 

- [Devpod Website](https://devpod.sh/)
- [Devpod Documentation](https://devpod.sh/docs/what-is-devpod)
- [Devpod Quickstart VS Code](https://devpod.sh/docs/getting-started/quickstart-vscode)
- [Loft.sh](https://www.loft.sh/)

Check out this talk from [Rich Burroughs](https://timeline.richburroughs.dev/):

<iframe width="560" height="315" src="https://www.youtube.com/embed/jSVWiecTeo0?si=5qtlkPFtOnAAq8aD" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Built in Performance Tooling

[Sysprof](https://www.sysprof.com/) is included as a systemwide performance profiler. As well as [Brendan Gregg's](https://www.brendangregg.com/) recommended CLI tools:

- `bcc`, `bpftrace`, `iproute2`, `nicstat`, `numactl`, `sysprof`, `sysstat`, `tiptop`, `trace-cmd`, and `util-linux`

Thanks to Ubuntu and Canonical for the [detailed specification](https://discourse.ubuntu.com/t/spec-include-performance-tooling-in-ubuntu/43134) and rationale. We hope that the inclusion of performance tools will [lead to better upstream software](https://blogs.gnome.org/chergert/2024/09/25/messaging-needs/).

## Quality of Life Improvements

- [Cockpit](https://cockpit-project.org/) for local and remote management
- A collection of well curated monospace fonts
- [Tailscale](https://universal-blue.discourse.group/docs?topic=290) for VPN
- [Just](https://github.com/casey/just) task runner for post-install automation tasks
- `fish` and `zsh` available as optional shells
  
## Command Line Experience

### `bluefin-cli` 

`ujust bluefin-cli` will install `bluefin-cli`, Bluefin's opt-in command line experience. `bluefin-cli` comes with some fantastic command line tools:
- [atuin](https://github.com/atuinsh/atuin) for shell history
- [direnv](https://direnv.net/) to load and unload environment variables depending on the current directory.
- [eza](https://github.com/eza-community/eza) as a replacement `ls`
- [fd](https://github.com/sharkdp/fd) for `find`
- [fzf](https://github.com/junegunn/fzf) for command line fuzzy finding
- [ripgrep](https://github.com/BurntSushi/ripgrep) for search
- [tealdeer](https://github.com/dbrgn/tealdeer) for `tldr`
- [ugrep](https://github.com/Genivia/ugrep) for grep
- [yq](https://github.com/mikefarah/yq) - for yaml, json, and xml processing
- [zoxide](https://github.com/ajeetdsouza/zoxide) as `cd`

The community may add new tools over time, re-running `ujust bluefin-cli` will pull in the new tools.  

![image](https://github.com/user-attachments/assets/89be8151-5b57-4b71-bbe5-988bef2d6798)


### Pet Containers

Pet containers are available as interactive terminals via [distrobox](https://distrobox.it/). Manage these via the included [BoxBuddy](https://github.com/Dvlv/BoxBuddyRS) application, available via the logomenu in the top left corner of your desktop under "Containers": 

![image](https://github.com/user-attachments/assets/bdab71b0-c04a-4562-a73d-396d4b907060)

Use BoxBuddy's interface to create your own pet containers from whichever distribution is on the list:

![image](https://github.com/user-attachments/assets/79570148-98f9-458f-b46e-2a87cfaa00ed)

For CLI warriors you can manage your containers with Ptyxis's built in container support: 

![image](https://github.com/user-attachments/assets/2a4dc4b5-f1a8-4781-80a4-92ea4dfeeb97)

The included [Terminal](https://gitlab.gnome.org/chergert/ptyxis) includes a host terminal so that you can quickly switch between containers and the host. 

- The default terminal is [Ptyxis](https://gitlab.gnome.org/chergert/ptyxis), which includes built in integration of distrobox containers. It is aliased as "Terminal" in the menu. It is mapped to <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>Enter</kbd> by default for quick launch
- [Podman Desktop](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) - Containers and Kubernetes for application developers
- [Pods](https://flathub.org/apps/com.github.marhkb.Pods) is also a great way to manage your containers graphically

### Ephemeral Containers

Designed for quick usage and "I need a test terminal now!" use cases, Preconfigured **ephemeral** terminal workspaces are available with keyboard shortcuts:

- <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>u</kbd> - Launch an Ubuntu LTS container
- <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>f</kbd> - Launch a Fedora container

Note: The initial setup will take some time depending on network connectivity. These containers are managed via a Podman Quadlet and **will be destroyed and updated regularly**. Declarative configuration is kept in `/etc/distrobox/distrobox.ini`, see [distrobox-assemble](https://github.com/89luca89/distrobox/blob/main/docs/usage/distrobox-assemble.md#examples) for examples.  

You can add packages and call init hooks from this file, ensuring that your distroboxes are built cleanly daily, but can still contain all your customizations and packages. 

![image](https://github.com/user-attachments/assets/265b9a3d-5aad-4516-a6dd-937ea7cbc697)

# Other Tooling

## JetBrains

`ujust jetbrains-toolbox` will fetch and install the [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app) application, which will manage the installation of the JetBrains set of tools. This application will handle installation, removal, and upgrade of the JetBrains products, and is handled completely in your home directory, independent of the operating system image. We do not recommend using the Jetbrains flatpaks. 

- Check the [Jetbrains documentation](https://www.jetbrains.com/help/idea/podman.html) for integrating those tools with the podman runtime. 
- Check out how to [setup Jetbrains with devcontainers](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html)
- [Uninstallation instructions](https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270-How-to-uninstall-Toolbox-App-)

The Jetbrains blog also has more information on Jetbrains Dev Containers support:

- [Using Dev Containers in JetBrains IDEs](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/) – Part 1

Devpod also has support for Jetbrains

- [Devpod Quickstart JetBrains](https://devpod.sh/docs/getting-started/quickstart-jetbrains)

## Neovim

`brew install neovim devcontainer` then follow these directions for a devcontainer setup: 

- [Running Neovim with Devcontainers](https://cadu.dev/running-neovim-on-devcontainers/)
- [Devpod Quickstart for Neovim](https://devpod.sh/docs/getting-started/quickstart-vim)

## Kubernetes and other Cloud Native Tooling

`ujust k8s-dev-tools` to get started: 

- [kind](https://kind.sigs.k8s.io/) - Run a Kubernetes cluster on your machine. Run `kind create cluster` on the host to get started!
  - [kubectl](https://kubernetes.io/docs/reference/kubectl/) - Administer Kubernetes Clusters
  - [k9s](https://k9scli.io/), [kubectx](https://github.com/ahmetb/kubectx), and [helm](https://helm.sh/). If you feel there's a tool that should be included by default, send a PR [to this file](https://github.com/ublue-os/bluefin/blob/main/system_files/shared/usr/share/ublue-os/homebrew/kubernetes.Brewfile). But let's not overdo it. 😄

## AI and Machine Learning

`ujust ollama` to get started.

See also: [AI and Machine Learning](ai)

## Virtualization and Container Runtimes

- [virt-manager](https://virt-manager.org/) and associated tooling (KVM, qemu)
- [Incus](https://linuxcontainers.org/incus/) provides system containers
  - [LXC](https://linuxcontainers.org/) and [LXD](https://ubuntu.com/lxd) are also provided for compatibility reasons 

## Podman Development

All the upstream `podman` tools are included. This is the default system container runtime, and is the recommended developer configuration that Fedora ships with. 

- Install the [Podman Desktop application](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) for graphical use. 

> Though we default to docker and vscode for development, all of the Fedora upstream tools are included for those that prefer that experience.
