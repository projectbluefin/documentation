---
slug: /bluefin-dx
---

# 开发者模式

Bluefin 开发者体验（`bluefin-dx`）是一款捆绑了工具的专用开发者镜像。与传统 Linux 系统不同，操作系统和开发者环境被明确且刻意地分离。这意味着工具不安装在宿主机上，而是容器化、运行在虚拟机中，或被限定在用户的 home 目录内。它旨在满足以下使用场景：

Bluefin 力求提供：

- 世界上最强大的[cloud native 开发环境](https://landscape.cncf.io/)
- 围绕 QEMU/KVM 的完整虚拟化支持，以及针对 Docker 和 Incus 的支持

:::info[更强在一起]

世界上有[1560 万云原生开发者](https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/)。我们的工作流建立在这些技术所得到的开发经验之上。

:::

## 云原生开发 Approach

Bluefin 在云原生开发上"all in"，其使用方式与传统发行版（如 Ubuntu）不同：

- 开发在容器中进行，常见的容器模式包括：
  - 使用 VSCode、Jetbrains 或 neovim 的 [Devcontainers](https://containers.dev/)
  - 用于带图形界面（GUI）的开发容器管理的 [Podman Desktop](https://podman-desktop.io/docs/intro)。这是一个[podman/vscode 配置的示例](https://podman-desktop.io/blog/2025/05/05/vs-code-with-podman-desktop) —— 这些扩展已包含在 Bluefin 中
  - 使用 [Podman](https://podman.io/docs) 或 [Docker](https://docs.docker.com/reference/cli/docker/) 的命令行容器管理。
- 命令行应用使用 [homebrew](https://brew.sh) 安装
- 预配置了 Ubuntu、Fedora 和 Wolfi 的即用容器。使用你想要的任何发行版。

这与传统发行版的区别在于，它让开发过程与操作系统无关。Bluefin 上没有 `apt install php` 的等价物；开发直接通过 IDE 使用 `podman` 或 `docker` 完成。

我们也坚信通过 `uv` 轻松访问其他繁荣的生态系统（如 Python）。我们放弃"一个 Linux 系统包管理器统治一切"，因为这些生态系统本身就是巨头。批评者会说我们发布了太多包管理器，我们说我们发布的不是包管理器，我们发布的是**用户想要的生态系统**。这些现代包管理器正是为运行在容器上的世界而设计的，因为事实确如此。而我们希望它们在开箱即用的桌面上就能用。

:::tip[为什么是云原生？]

我们选择云原生模式，因为容器中的本地开发会转化为在现代基础设施上部署容器。

:::

![image](/img/user-attachments/51415b6c-b7fe-45e9-af74-c01694b26fbe.png)

`bluefin-dx`（以及 `aurora-dx`）中的模式围绕 [devcontainers](https://containers.dev) 展开。由于 devcontainers 存在于项目的 git 仓库中，它们可以部署在任何操作系统上：Linux、macOS 或 Windows（通过 WSL）。这促进了"默认分布式"开发，并避免 Linux 用户在与使用其他操作系统的同事协作时成为"异类"。

每个项目都包含一个声明式环境，让用户开箱即用即以"最佳实践"云原生工作流起步。[Ultimate Guide to Dev Containers](https://web.archive.org/web/20260313112015/https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers) 很好地阐述了使用 devcontainers 的优势。这意味着开发环境保存在版本控制中，而不是耦合到宿主机上。

也可以使用 Homebrew 安装开发工具。但建议避免这样做，而是在版本控制中声明项目的依赖。有时它如此方便，[这样也行](https://www.youtube.com/shorts/lKwavoyaaFA)。

Mise 是一个让你为项目安装应用特定版本的工具（例如一个项目用 node 20，另一个用 node 21）。你可以使用仓库中的 `mise.toml` 文件来追踪你所需要的特定工具。[这些也可以全局安装](https://mise.jdx.dev/configuration.html#global-config-config-mise-config-toml)。它可以类似 devcontainers 地使用，但不要求你进入容器才能使用。

你始终可以使用你想要的任何东西。你不需要在这里使用所有东西才能高效 —— 归根结底这是你的电脑，这是一套默认值。

# 启用开发者模式

启用开发者模式是一个两步过程：

## 步骤 1：开启它

运行 `ujust devmode` 来启用或禁用 dx 模式，然后重启：

![image](/img/user-attachments/76df5201-da02-42d0-bec9-fad259df9b0d.png)

## 步骤 2：把自己加入正确的组

运行 `ujust dx-group` —— 把你的用户账户加入正确的组。然后重启。这一步只需要做一次。

与所有 Universal Blue 镜像一样，切换是原子的，可以根据使用场景在模式之间干净地切换。

# 功能

## 带 Docker 的 Visual Studio Code

[Visual Studio Code](https://code.visualstudio.com/) 作为默认 IDE 包含在镜像中。它已预装 [devcontainers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)。这是推荐的开发者体验，如果你是容器化开发的新手，从这里开始！

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers) - 你可以跳过大部分安装说明，直接前往[教程](https://code.visualstudio.com/docs/devcontainers/tutorial#_install-the-extension)
- [Dev Containers Specification](https://containers.dev/)
- [Beginner's Series to: Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) - 来自[VS Code YouTube channel](https://www.youtube.com/@code/videos)的优秀入门教程

默认包含最新的 [Docker Engine](https://docs.docker.com/engine/)，并设置为 VSCode 的默认容器运行时。使用 [docker compose](https://danielquinn.org/blog/developing-with-docker/) 也是入门容器开发的绝佳方式，是在 devcontainers 不合你口味时的一个选项。请注意，Docker Desktop 不可用，图形化的容器管理请用 Podman Desktop。

### 在 Dev Containers 中使用 Podman

Dev Containers 扩展默认使用 Docker。要切换到 Podman，在 VS Code 中添加以下设置：

```json
"dev.containers.dockerComposePath": "podman-compose"
"dev.containers.dockerPath": "podman"
"dev.containers.dockerSocketPath": "/run/user/1000/podman/podman.sock"
```

运行 `systemctl --user status podman.socket` 来确认你用户 ID 的 socket 路径。对于 rootful Podman，使用 `/run/podman/podman.sock`。

**SELinux 故障排查：** 如果你的 devcontainer 因 SELinux 访问错误而无法启动（检查 `ausearch -m avc -ts recent`），运行 `restorecon -R -v $HOME/.local/share`。对于卷挂载错误，运行 `restorecon -R -v /path/to/your/project`。仅在万不得已时，你可以在 `.devcontainer/devcontainer.json` 中为特定容器禁用 SELinux 标签：

```json
{
  "runArgs": ["--security-opt", "label=disable"]
}
```

## Podman 与 Podman Desktop

![Podman Desktop](/img/user-attachments/69f64ed1-7fcc-4040-9a3d-12b71308da1b.png)

[Podman Desktop](https://podman-desktop.io/) 包含在内以提供容器管理。查看 Podman Desktop 的[documentation](https://podman-desktop.io/docs/intro) 了解更多信息。所有上游 `podman` 工具都包含在内。这是默认的系统容器运行时，也是为新用户推荐的开发者配置。

## 内置性能工具

[Sysprof](https://www.sysprof.com/) 作为系统级性能分析器包含在内。以及 [Brendan Gregg 的](https://www.brendangregg.com/) 推荐的 CLI 工具：

- `bcc`、`bpftrace`、`iproute2`、`nicstat`、`numactl`、`sysprof`、`sysstat`、`tiptop`、`trace-cmd` 和 `util-linux`

感谢 Ubuntu 和 Canonical 提供的[详细规范](https://discourse.ubuntu.com/t/spec-include-performance-tooling-in-ubuntu/43134)及其理由。项目希望性能工具的纳入会[带来更好的上游软件](https://blogs.gnome.org/chergert/2024/09/25/messaging-needs/)。

## 生活质量改进

- 一系列精心策划的等宽字体
- 用于自动化任务的 [Just](https://github.com/casey/just) 任务运行器
- `fish` 和 `zsh` 作为可选 shell 提供

### Pet Containers

Pet container 可通过 [distrobox](https://distrobox.it/) 以交互式终端的形式提供。通过附带的 [DistroShelf](https://github.com/ranfdev/DistroShelf) 应用管理它们，该应用可在桌面左上角的 logomenu 的"Containers"下找到：

![image](/img/user-attachments/bdab71b0-c04a-4562-a73d-396d4b907060.png)

使用 DistroShelf 的界面，从列表中的任何发行版创建你自己的 pet container：

![image](/img/user-attachments/2daf276d-2aed-47b9-9792-923d674ef226.png)

对于命令行战士，你可以使用终端内置的容器支持来管理容器：

![image](/img/user-attachments/2a4dc4b5-f1a8-4781-80a4-92ea4dfeeb97.png)

附带的 [Terminal](https://gitlab.gnome.org/GNOME/ptyxis) 包含一个宿主机终端，你可以快速在容器和宿主机之间切换。

- 默认终端是 [Ptyxis](https://gitlab.gnome.org/GNOME/ptyxis)，它内置了 distrobox 容器的集成。它在菜单中被别名为"Terminal"。默认映射到 <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>Enter</kbd> 以便快速启动
- [Podman Desktop](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) - 面向应用开发者的容器和 Kubernetes
- [Pods](https://flathub.org/apps/com.github.marhkb.Pods) 也是以图形方式管理你容器的绝佳方式

# 其他工具

## JetBrains

`ujust jetbrains-toolbox` 会获取并安装 [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app) 应用，由它管理 JetBrains 工具集的安装。该应用会处理 JetBrains 产品的安装、移除和升级，且完全在你的 home 目录中处理，与操作系统镜像无关。我们不建议使用 JetBrains 的 flatpak。

- 查看 [JetBrains documentation](https://www.jetbrains.com/help/idea/podman.html) 了解如何将这些工具与 podman 运行时集成。
- 查看如何[用 devcontainers 设置 JetBrains](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html)
- [Uninstallation instructions](https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270-How-to-uninstall-Toolbox-App-)

JetBrains 博客还有更多关于 JetBrains Dev Containers 支持的信息：

- [Using Dev Containers in JetBrains IDEs – Part 1](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/)

## Neovim

运行 `brew install neovim devcontainer`，然后按照这些指引进行 devcontainer 设置：

- [Running Neovim with Devcontainers](https://cadu.dev/running-neovim-on-devcontainers/)

## 虚拟化与容器运行时

- [virt-manager](https://virt-manager.org/) 及相关工具（KVM、qemu）
- [Incus](https://linuxcontainers.org/incus/) 提供系统容器

## 本地应用开发

[GNOME Builder](https://developer.gnome.org/documentation/introduction/builder.html) 是创建应用的推荐应用栈。

## Kubernetes

通过 Homebrew 安装 Kubernetes 管理员常用的一整套工具（`brew install <name>`）：

| Name                                                     | Description                                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [cdk8s](https://formulae.brew.sh/formula/cdk8s)          | 使用熟悉的编程语言定义 Kubernetes 应用和可复用抽象                  |
| [dagger](https://formulae.brew.sh/formula/dagger)        | 用于 CI/CD 流水线的便携式 devkit                                                                           |
| [grype](https://formulae.brew.sh/formula/grype)          | 用于容器镜像和文件系统的漏洞扫描器                                                    |
| [helm](https://formulae.brew.sh/formula/helm)            | Kubernetes 的包管理器                                                                              |
| [k0sctl](https://k0sproject.io/)                         | 用于引导和管理 k0s Kubernetes 集群的命令行工具                                      |
| [k3sup](https://formulae.brew.sh/formula/k3sup)          | 用于在任何本地或远程 VM 上安装 k3s 的轻量实用程序                                                 |
| [k9s](https://formulae.brew.sh/formula/k9s)              | 提供终端 UI 来与你的 Kubernetes 集群交互                                                |
| [kind](https://formulae.brew.sh/formula/kind)            | 使用 Docker 容器"节点"运行本地 Kubernetes 集群的工具                                     |
| [kubectl](https://kubernetes.io/docs/reference/kubectl/) | Kubernetes 命令行工具，允许你对 Kubernetes 集群运行命令                        |
| [kubectx](https://formulae.brew.sh/formula/kubectx)      | 在 kubectl 上在上下文（集群）之间切换更快的工具                                                  |
| [pack](https://buildpacks.io/)                           | 使用 Cloud Native Buildpacks 构建应用的 CLI 工具                                                          |
| [syft](https://formulae.brew.sh/formula/syft)            | 用于从容器镜像和文件系统生成软件清单（SBOM）的 CLI 工具和库 |

### CNCF 工具

要访问全套[Cloud Native Computing Foundation](https://l.cncf.io) 工具，运行 `ujust cncf` 来浏览并从一个包含 89 个 CNCF 项目的丰富集合中安装，涵盖已毕业、 incubating 和 sandbox 工具。其中包括 Argo、Cilium、Envoy、Flux、Istio、Linkerd、Prometheus 等。

## 字体

通过 Homebrew 安装精心策划的开发者字体（`brew install --cask <font-name>`），或使用附带的 [Embellish](https://flathub.org/en/apps/io.github.getnf.embellish) 工具：

| Name                                                                                          |
| --------------------------------------------------------------------------------------------- |
| [CaskaydiaMono Nerd Font](https://formulae.brew.sh/cask/font-caskaydia-mono-nerd-font)        |
| [Comic Shanns Mono Nerd Font](https://formulae.brew.sh/cask/font-comic-shanns-mono-nerd-font) |
| [Droid Sans Mono Nerd Font](https://formulae.brew.sh/cask/font-droid-sans-mono-nerd-font)     |
| [Go Mono Nerd Font](https://formulae.brew.sh/cask/font-go-mono-nerd-font)                     |
| [Blex Mono Nerd Font](https://formulae.brew.sh/cask/font-blex-mono-nerd-font)                 |
| [Sauce Code Pro Nerd Font](https://formulae.brew.sh/cask/font-sauce-code-pro-nerd-font)       |
| [Source Code Pro](https://formulae.brew.sh/cask/font-source-code-pro)                         |
| [Ubuntu Nerd Font](https://formulae.brew.sh/cask/font-ubuntu-nerd-font)                       |
| [FiraCode Nerd Font](https://formulae.brew.sh/cask/font-fira-code-nerd-font)                  |
| [0xProto Nerd Font](https://formulae.brew.sh/cask/font-0xproto-nerd-font)                     |

# 使用 Finpilot 构建自定义镜像

如果你想基于 Bluefin 创建自己的可定制的、可启动的 `bootc` 操作系统镜像：

- **[finpilot](https://github.com/projectbluefin/finpilot)** 提供了用于构建自定义 Linux 镜像的官方模板仓库。
- 实现了用于分层包、配置文件和桌面定制的阶段性容器构建架构。
- 包含用于自动化构建、通过 Cosign 进行 keyless 镜像签名、以及发布到 GitHub Container Registry（GHCR）的 GitHub Actions 工作流。
- 要部署你的自定义镜像，使用以下命令切换：
  ```bash
  sudo bootc switch ghcr.io/<your-username>/<your-image>:latest --enforce-container-sigpolicy
  ```
