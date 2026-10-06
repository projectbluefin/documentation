---
title: 安装
slug: /installation
---

# 安装手册

为了取得成功，把你的 Bluefin 安装划分为几个阶段来规划是有帮助的，这样可以避免常见的陷阱和支持不良的配置。在对该 Linux 友好的硬件上，启动安装过程并点过安装器推荐的默认值通常就够了。但你永远无法万无一失——万一需要，以下是细节。

:::info[💙 请勿把你爱的人送到本页 💙]

本手册面向正在为他人安装 Bluefin 的经验丰富用户。它面向较高的技术水平。别忘了[选一个好的播放列表](/music)以获得最佳沉浸体验。

:::

本页是 Bluefin 安装过程的简短[手册](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)。通读全部文档以求生（以防遭遇 raptor 袭击）。

## 支持层级

Bluefin 刻意设计跟随时序的 Linux 开发前沿，项目优化了一条“黄金路径”，以给用户最佳的成功机会。但有时你只是运气好（或运气差）。本节受 Homebrew 的[支持层级](https://docs.brew.sh/Support-Tiers)启发。并非所有配置都受支持。以下是快速指南：

### 第一层 —— 最佳体验

第一层配置被视为完全受支持。这些配置获得最高级别的覆盖并受到优先处理。

#### 要求

- 对 Linux 友好的硬件（无需外部内核模块）
  - Linux 笔记本厂商可能属于也可能不属于这一层。
  - “我们的硬件完全支持得上游 Linux 内核” ← 好
  - “我们只支持 Ubuntu 24.04” ← 可能不好
- 为现代 Linux 打包的软件（桌面应用用 Flatpak，开发用容器等）

#### 用户可以期待

- 最可靠、最符合预期的 Bluefin 体验

**建议：** Bluefin

### 第二层 —— 你大概没问题

第二层配置并非完全受支持，可能因硬件或软件选择而存在妥协。
它大多能工作，但可能需要安装后配置。其中一些能正常工作，但被归到这一层，是因为软件由厂商提供，而非团队能控制的东西，比如 Nvidia 驱动。

#### 要求

- 桌面上的 Nvidia GPU
- 部分 Linux 笔记本厂商可能属于这一层
  - 可能有好的内核支持，但需要外部模块来驱动风扇控制器或其他组件
- 本地分层包或其他文档未覆盖的软件配置
- ARM/aarch64 硬件——核心团队没有这些硬件的访问权限，但为社区创建了镜像

#### 用户可以期待

- 不可靠的升级和手动系统维护
  - 团队在测试时通常不考虑这些配置。
- 日常使用 generally 正常

**建议：** 试试 Bluefin，看看它运行得如何。有些人会制作自定义镜像，可能需要调查。

### 第三层 —— 谁知道呢？

第三层大多不受支持——它可能运行完美，也可能是一场灾难。

#### 要求

- 已知有问题的硬件（Asus 和 Apple 笔记本）。对于 2018–2020 年 Intel Mac（配备 T2 安全芯片），参见社区的[T2 Mac 安装指南](/t2-mac)。
- 带 Nvidia 硬件的双显卡笔记本
- 老式“祝你好运才行”的打包格式
  - .run 文件、tarball 和 AppImage
  - 任何需要 DKMS 的东西
- 异构硬件——在某些情况下，第三层安装可能成为炫耀的资本。

#### 用户可以期待

- 不可靠的升级和手动系统维护
  - 团队在测试时通常不考虑这些配置。
- “时好时坏的支持”——无线时有时能工作，挂起/唤醒问题等。

**建议：** Ubuntu 或自定义镜像。

## 系统要求

安装 Bluefin 之前请查阅以下考量：

- 使用[Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer)创建安装介质。其他创建方法可能无法正常工作。
  - 使用 Ventoy **不受支持**
- 较老的基于 BIOS 的系统**不受支持**；仅支持 UEFI 系统
- 同一磁盘上双启动**不受支持**；为另一个操作系统使用独立磁盘，并用 BIOS 选择从另一个 OS 启动
  - 如果你想先在裸机上试用再决定，Bluefin 支持[在外部驱动上的安装](#alternative-bluefin-to-go-external-drive)
- 我们**强烈建议**在安装时使用自动分区；除非在多磁盘系统上，否则手动分区毫无必要
- 一套原始 Bluefin 安装约占用 12.4 GB（启用开发者模式后为 17.4 GB）

### 快速参考

| 组件       | 最小值                            | 推荐值                                            |
| ---------- | ------------------------------------ | ------------------------------------------------ |
| **CPU**    | 64 位 x86_64                         | 尽可能多花钱                                      |
| **内存**   | 16 GB                                | 32 GB+ / 若使用 ZFS 则尽可能多花钱                  |
| **存储**   | 128 GB（仅 SSD，HDD 太慢）           | 尽可能多花钱                                      |
| **图形**   | 任何现代 Intel/AMD GPU               | 任何现代 GPU，Nvidia Maxwell 及更早除外             |
| **启动**   | UEFI（不支持 BIOS）                  | 带 Secure Boot 的 UEFI                            |

### 磁盘使用

这是每个 Bluefin 镜像默认的磁盘占用，其中包括 Flatpak 应用（可以移除）：

#### Bluefin

约 12.4 GB / 启用开发者模式后约 17.4 GB

### 为什么 16 GB 内存是最低要求？

Bluefin 附带了极其丰富的云原生开发栈。这些 workload 通常扩展到复制整个计算机集群，并需要比典型 workload 更多的资源。

_这些要求确保 Bluefin 集成开发工作和容器优先架构顺畅运行。_

## 备选：Bluefin 随身版（外部驱动器）

你可以把 Bluefin 安装在外部驱动器上，得到一个便携的 Bluefin 安装：

![bluefin-drive](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**别忘了在安装时选择全盘加密！**

使用场景：

- 试用 Linux 的好方法；如果喜欢，把驱动器移入主机即可，无需重新安装。
- 或者为新 PC 买一个新驱动器，把现有 OS 放进外部硬盘壳作为备份。
- 临时复用一台机器，或在购买前试用硬件。
- 共享一台 PC 而无需就 Linux 争吵。
- 家庭实验室和便携开发设置。
- 为一台 docking 的 [Bazzite 驱动](https://bazzite.gg)掌机添加一台 Bluefin DX 驱动器。

### Windows to Go

你也可以做相反的操作：使用 [Rufus](https://rufus.ie) 将 Windows 安装到外部驱动器的[Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go)模式中，用于固件更新或罕见的仅 Windows 软件。

## 第 0 天：规划

大多数痛点可以直接通过提前规划来解决。请注意“天”是一个抽象概念——请勿在三天内分次安装 Bluefin。通常，一次安装大约需要二十分钟。

### 所有用户

- 你的硬件对 Linux 友好吗？
  - 你是否理解了拥有 Nvidia GPU（如适用）的限制？
    - Nvidia Optimus 笔记本往往特别麻烦
  - 硬件是否需要树在内核之外的模块？这可能导致长期维护问题
  - 你使用的软件是否需要树在内核之外的模块？
    - VirtualBox 和 VMware 不受支持
    - Nvidia、Xbox One 控制器支持、wl 驱动和 v4l2loopback 受支持（这些是“尽力而为”；在某些情况下我们无法控制随着新版 Linux 内核破坏的第三方软件）
    - [openzfs](https://github.com/openzfs/zfs) 开箱即用。维护者定期使用它，且尚未落后于 Bluefin 随附的内核。然而，我们仍无法为此担保，因为它是一个树在内核之外的模块
  - 你的无线网卡被 Linux 支持吗？
    - 支持不良的网卡包括 Broadcom
    - 若不确定，参见[USB-Wifi](https://github.com/morrownr/USB-WiFi)
  - 你的打印机/扫描仪在 Linux 中支持良好吗？
    - 强烈建议[无驱动打印机](https://openprinting.github.io/printers/)；我们无法保证每台打印机都能工作
    - [扫描仪支持](http://www.sane-project.org/sane-mfgs.html)
- 设备上的 BIOS/UEFI 已更新到最新吗？
- 我们建议在安装前完成并更新所有硬件固件更新
- 你依赖的应用在 Flathub 上支持良好吗？
- 你的 VPN 提供商是否能提供可导入 Network Manager 的 wireguard 配置？
- 有准备好的专用磁盘吗？
  - Bluefin 不支持从同一磁盘双启动
  - Bluefin 不支持从一个已有的 Fedora 安装 rebased
- 记住这是一个基于自定义 Fedora 的镜像，它相比像 Ubuntu LTS 这样的系统推进得更快
- 通读全部文档，以下是一些相关的上游文档：
  - [Homebrew](https://docs.brew.sh/)（[捐赠](https://github.com/Homebrew/brew#donations)）
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### 开发者

- 你知道如何在开发中使用[容器](https://docker-curriculum.com/#introduction)吗？
- 你知道如何为系统和用户账户管理 [systemd 服务单元](https://systemd.io/)吗？

## 第 1 天：部署与配置

### 部署

:::info[下载 Bluefin]

从[网站](https://projectbluefin.io/#scene-picker)下载正确的 ISO

:::

- 安装操作系统
  - 使用整个磁盘并自动分区
  - （可选）[设置 Secure Boot](#secure-boot)
  - （可选）`ujust rebase-helper` 移动到 `:stable` 或 `:testing`
- 设置、测试并**验证备份**——由于系统镜像是可复现的数据，但你主文件夹中的用户数据仍需要备份。Bluefin 随附两个备份工具，取决于你的偏好。它们以 Flatpak 形式安装，你可以移除不用的那个。若偏好命令行工具，`rclone`（[捐赠](https://github.com/sponsors/rclone)）和 `restic`（[捐赠](https://github.com/sponsors/restic)）也已预装。
  - [Deja Dup](https://apps.gnome.org/DejaDup/)（[捐赠](https://liberapay.com/DejaDup)）
  - [Pika Backup](https://apps.gnome.org/PikaBackup/)（[捐赠](https://opencollective.com/pika-backup)）
  - 在继续配置之前，确保你的备份功能正常

### 配置

这些步骤的其余部分是用户特定的配置，而我们倾向于交给你处理。自动化这一步是使用 [chezmoi](https://www.chezmoi.io/) 来配置和同步点文件的好场所：`brew install chezmoi`

由于用户空间都在你的主目录中，你用来自动化这一步的任何工具都应该如你所愿地工作。理想情况下，你过去在系统层面做的配置现在应在用户层面配置，从而在用户配置和系统镜像之间实现干净分离。

- 软件安装
  - 使用 Bazaar 商店安装应用
  - （可选）通过 `brew` 安装命令行应用
- 安装后配置
  - 按需选择/更改默认应用
  - （可选）通过 `wg-quick` 导入你的 [wireguard 配置](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/)，或在网络管理器 GUI 中使用 VPN 配置
- （可选）开发者配置
  - `ujust devmode` 并按指示操作
  - 启动 VSCode 并配置你的设置和扩展

## 第 2 天：操作与维护

Bluefin 力求让维护尽可能简单，然而许多自动化任务可以手动运行。

- 通过菜单选项或 `ujust update` 运行系统升级，以观察一次更新并重启
  - `ujust changelogs` 将显示来自 Fedora 的 incoming 更改和更新
  - `ujust bios` 将重启机器并进入 BIOS/UEFI 菜单。这对启动到一个 Windows 驱动器很有用
- 订阅[博客](/blog)
- 理解[rebase 和回滚流程](/administration#switching-between-streams)
- 使用[仓库应用](https://github.com/flattool/warehouse)来管理 Flatpak 生命周期：
  - 固定到旧版本或回滚
  - 一次性轻松移除应用
- `ujust clean-system` 以清理旧容器和未使用的 Flatpak 运行时

还有一条建议：你在第 0 天投入越多，第 1 天就越顺畅，从而第 2 天更加顺畅。之后，就都是炫耀的资本了。`fastfetch`（[捐赠](https://github.com/sponsors/LinusDierheimer）命令会在那里提醒你你的里程碑：

![image](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot

Secure Boot 默认受支持，提供额外的安全层。

Universal Blue 通过[我们的自定义密钥](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der)支持 secure boot。

安装完成后，在首次启动时，你会被提示使用[mokutil UEFI 菜单 UI](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot)（_QWERTY_ 键盘输入和导航）注册 secure boot 密钥。

选择 **Enroll MOK**，并输入 `universalblue` 作为密码。

如果初始设置未完成此步骤，你可以手动注册密钥，在终端中运行以下命令：

```sh
ujust enroll-secure-boot-key
```

如果你想在安装或 rebased 之前就注册此密钥，下载密钥并运行以下命令：

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

你可以使用 `mokutil --list-enrolled` 来确认 “ublue kernel” 密钥已列出：

![image](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
如果你看到 `ublue akmods` 列出，它是即将被移除的旧密钥。`ublue kernel` 是当前密钥。
:::

联想 ThinkPad 用户（P、T、X 系列）：在启用 Secure Boot 之前，进入 BIOS（F1）→ Security → Secure Boot 并启用 “Allow Microsoft 3rd party UEFI CA”。Fedora 的签名 shim 引导加载程序需要此设置才能被固件识别。否则，Secure Boot 将以违规错误失败。
