---
title: 欢迎使用 Bluefin
slug: /
pagination_next: downloads
---

# 欢迎使用 Bluefin

对终端用户而言，Bluefin 像 Chromebook 一样可靠，几乎无需维护，同时为开发者提供强大的 [cloud-native 开发模式](/bluefin-dx)。它采用下一代技术构建，专为需要靠机器把工作做完的人而打造。

![Bluefin 桌面截图](/img/bluefin-hero.webp)

## Bluefin 适合你吗？

Bluefin 是一款下一代 Linux 桌面，倾向于持续渐进式改进。我们会尽快、坚决地摒弃过时技术，从而提供尽可能出色的使用体验。

:::tip

或许有人乐于把 Bluefin 说成最能惠及开发者或有经验的 Linux 用户的工具，但我会争论说，它对新用户同样是有力的选择，因为它足够可靠，而且开箱即用。

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin 是：

- **Flatpak 优先** - Bluefin 的应用模型围绕隔离的应用展开，这些应用由 Flathub 维护。与现代组件（如 Wayland、Pipewire、Flatpak Portal 等）配合不佳的应用体验可能较差，不推荐使用。
- **刻意保持隐形** - Bluefin 不是一个发行版。你打交道的是 Flathub、Homebrew 以及你放进容器里的任何东西。
- **为 96% 优化** - 不是那 4% - Bluefin 对功能采取"更强共同体"的方式。你始终可以做你想做的事，但价值来自最佳实践的共享。我们不会在边界情况上花费太多时间。
- **经过验证的开发模式** - 以容器为中心，并向新的 Linux 用户介绍[云原生所用的工具](https://www.cncf.io/)。更多信息请参阅[使命声明](/mission)和[价值观](/values)页面。
- **刻意聚焦优秀硬件** - Bluefin 在友好的 Linux 硬件上运行最佳，从而尽可能为用户提供无过时的体验。Bluefin 也希望支持销售 Linux 笔记本和台式机的 OEM，因此会力求以最佳的软硬件组合运行。我们不会刻意去文档化或绕开那些损害用户体验的问题，所以在某些情况下，另一种操作系统才是正确的选择。

如果你的需求超出这个范围，那么 **Bluefin 可能不是最佳选择**。Bluefin 可能会带来不适甚至[持有不当](/troubleshooting/#am-i-holding-bluefin-wrong)造成的伤害。我们承认，为了做出更好的桌面，传统 Linux 桌面体验的许多部分将不再随我们而来。

## 桌面体验与功能

Bluefin 配备了由社区配置的 GNOME（[Donate](https://www.gnome.org/donate/)）桌面。它的设计是少干预、不打扰，让你专注自己的应用。

系统更新基于镜像且自动进行。应用通过 Flatpak（图形应用）和 `brew`（命令行应用）与系统逻辑分离。

:::tip

Bluefin 是"建立在 Fedora 技术之上的对 Ubuntu 精神的演绎"——这是对许多开源爱好者成长经历的 Ubuntu 某个时代的致敬，就像经典的 X-Men。我们希望把同样的氛围带到这里；把我们看作是一次重启。Chill vibes。

:::

- **类 Ubuntu 的 GNOME 布局**，集成精选扩展：
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - 提供熟悉的 dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - 在右上角提供类似托盘的图标
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - 将你的移动设备集成到桌面
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donate](https://github.com/sponsors/aunetx)) - 增加视觉效果
  - [Search Light](https://github.com/icedman/search-light) - 提供搜索功能，并在默认情况下用 <kbd>Super</kbd>-<kbd>Space</kbd> 绑定类似 macOS Spotlight 的工作流
- **[Developer Mode](/bluefin-dx)** - 专用的开发工具，将 Bluefin 变成强大的云原生工作站
- **[Ptyxis 终端](https://devsuite.app/ptyxis/)** 面向以容器为中心的工作流
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donate](https://github.com/sponsors/ranfdev)) 用于容器管理
- **[Tailscale](https://tailscale.com)** 内置，用于 VPN，并附带 `wireguard-tools` 和系统托盘支持
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Donate](https://github.com/sponsors/mjakeman)) 随附
- **[Bazaar 应用商店](https://github.com/kolunmi/bazaar)**，支持 [Flathub](https://flathub.org)：
  - 熟悉的应用中心 UI 用于安装图形应用
  - 被遗弃的应用和过时的运行时会被隐藏
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donate](https://ko-fi.com/heliguy)) 随附，用于 Flatpak 管理
- **生活质量功能**：
  - [Starship](https://starship.rs) 终端提示符默认启用
  - [Solaar](https://github.com/pwr-Solaar/Solaar) 用于罗技鼠标，并附带 `libratbagd`
  - [rclone](https://rclone.org/overview/) 和 [restic](https://restic.net/) 用于云存储挂载和现代文件备份
  - `zsh` 和 `fish` 作为可选 shell 提供
  - [Switcheroo 支持](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com)用于双 GPU 笔记本
- **Universal Blue 基础**：
  - 随附用于游戏控制器和其他硬件的额外 udev 规则
  - 包含所有多媒体编解码器
  - 分阶段自动更新：正常使用电脑，用完后关机即可

## 无发行版聚焦

Bluefin 特意采用上游工具而非自定义应用。"发行版应用商店"的想法对桌面应用作者被证明是不可持续的，所以 Bluefin 采用 [Bazaar](https://github.com/kolunmi/bazaar) 和 [Homebrew](https://brew.sh) 等工具。工作流不仅与发行版无关，甚至与操作系统无关。

:::info[这是一个跨平台的世界]

Bluefin 中的工作流刻意聚焦上游——我们相信每个人都有一致的 Linux 体验，无论是 Windows 上的 WSL、Mac 上的 Podman/Docker，还是任何 Linux 系统。[云原生生态](http://cncf.io)已经证明这种模式可行。这让数百万现有开发者能够以他们已经熟悉的工作流上船，也让 Linux 在最关键的地方参与竞争。

:::

## 下一步

- **[Downloads](/downloads)** — 获取官方 Bluefin ISO 或种子
- **[Installation Runbook](/installation)** — 硬件规划和安装步骤
- **[User Guide](/administration)** — 日常管理、更新和应用
- **[Developer Guide](/bluefin-dx)** — 容器、devcontainers 和 AI 工具

[公告博文](https://www.ypsidanger.com/announcing-project-bluefin/)还包含一些额外的背景信息。

## 入门视频与播客

查看我们的[视频和评测列表](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts)以获取更多信息。

:::tip

"进化是一个不断分支和扩张的过程。"

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
