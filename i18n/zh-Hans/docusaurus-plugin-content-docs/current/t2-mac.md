---
title: 在 T2 Mac 上安装 Bluefin
author: Chris Lauretano
slug: /t2-mac
---

这是对[Bluefin 安装 runbook](/installation)的补充，面向 T2 Mac，通过支持在最后一代 Intel Mac（2018-2020）上安装 Bluefin 来支持本项目的可持续性目标。Apple 在 2024 年后停止对它们的支持。

请阅读原始的[Bluefin 安装 runbook](/installation)，其内容不会在此重复。章节标题在可能的情况下一一对应。

## Day 0 - 规划

由于你的 T2 Mac 有专门的硬件需求，且 Apple 基本不支持其硬件上 MacOS 以外的任何东西，使用 Bluefin 存在一些重要注意事项。考虑你的个人使用场景，这些在 Mac Mini 或 docking 的笔记本上可能不是问题，但在高度移动的场景中可能令人沮丧。

### 所有用户

- 你的硬件对 Linux 友好吗？
  - 不！就连 MacBook Pro 上的键盘和触摸板在主行 linux 内核上也无法工作。这是最不友好、最闭源的 x86 笔记本之一。但它能工作。自 Bluefin 切换到 fsync 内核后，所需的补丁已经存在。
  - sleep/suspend 在近期的一次 Apple 固件更新（2023 年末）中损坏，且至今未恢复。
- 你的无线卡被 Linux 支持吗？
  - 当然不，Apple 使用了 Broadcom。终端用户无法直接安装固件，需要 rebase 到包含固件文件的个人或社区自定义 Bluefin 镜像。未来，这可以像 Surface/Asus 一样打包成自定义镜像。

## Day 1 - 部署与配置

### 部署

1. 首先下载 [Project Bluefin](https://projectbluefin.io/) 的标准笔记本镜像。

:::note[双启动支持]

Bluefin 使用的安装软件 Anaconda 不支持 OCI 部署的双启动，因此在不需要 MacOS 的 Mac 上安装，或安装到 USB/Thunderbolt SSD 上。

:::

#### 创建 Bluefin USB

使用 dd、[Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/) 或类似工具。

#### 安装 Bluefin

:::note[这简直是疯魔]

此时，在 T2 上安装 Bluefin 以及开机时解锁加密磁盘（直到稍后运行某个命令之前）都需要外部键盘和鼠标。

:::

1. 在 Mac 关机状态下，连接外部键盘和鼠标，并插入你的 Bluefin USB。
2. 按住 option（在 Windows 键盘上是 alt）键并启动你的 Mac。
3. 在启动菜单中，选择"EFI Boot"（会有 USB 图标）。点击 Continue。
4. 在 Fedora 安装器启动界面，在安装前选择测试或不测试你的媒体。
5. 当安装器启动时，选择你想使用的语言以进入主菜单。
6. 在主安装器菜单中，选择 Installation Destination 来选择你的安装磁盘。使用自动分区。如果使用外部驱动器，请确保内部驱动器也没有被选中（带复选框），因为这可能会修改你内部驱动器上的 MacOS EFI 引导程序。
   > 请注意，如果你使用加密，那么在运行安装后命令之前，每次开机都需要外部键盘。
7. 在所有前置条件都设置好后，继续安装。这里不会显示太多详细进度，但如果你擅长切换到其他 TTY 并使用 tmux ([Donate](https://github.com/sponsors/tmux))，背后有大量日志在记录。安装不会花很长时间（比把一台空白 Mac 弄到 internet recovery 模式要快）。
8. 点击 Finish Installation，然后重启进入你新的 Bluefin 安装！

### T2 的配置（必需）

:::note

请注意，wifi/bluetooth 固件无法通过包来层叠。在传统系统上，固件可以[从 MacOS 安装中提取（T2Linux Wiki）](https://wiki.t2linux.org/guides/wifi-bluetooth/#on-linux)，但在 Bluefin 上，这些文件必须作为 custom image 中的 containerfile 层或脚本引入。

:::

:::note

另外请注意，在大多数情况下 suspend/sleep 无法工作，如果一台 Mac 的固件版本是 v13.5 或更新。有多种变通方法。

:::

在这里，你需要做一个选择。如果你需要 wifi/bluetooth 固件，你就需要 rebase 到自定义或社区特定的 T2 的 Bluefin 镜像。如果不需，你可以层叠几个包来获得与 T2 特定镜像相同的体验。详见下表及下面的步骤。

|                                | T2 特定的 Bluefin 镜像 | 层叠包                 | Bluefin                                      |
| ------------------------------ | ------------------------- | ------------------------ | -------------------------------------------- |
| T2 打补丁内核                  | **yes, fsync**            | 如果基础镜像使用 fsync | **yes, fsync on latest, fsync-ba on stable** |
| 内置键盘和触摸板               | **yes**                   | **yes**                  | **yes**                                      |
| Touchbar                       | **yes**                   | possible                 | no                                           |
| T2 音频                        | **yes**                   | possible via copr        | no                                           |
| 风扇控制                       | **yes**                   | possible                 | no                                           |
| 混合图形                       | **configurable**          | possible                 | no                                           |
| Wifi / Bluetooth 固件          | possible                  | _no_                     | _no_                                         |
| Deep Sleep                     | _no_                      | _no_                     | _no_                                         |

有关 T2 Mac 上整体 Linux 硬件支持的更多信息（例如 Touch ID 无法使用），查看 [T2Linux Wiki](https://wiki.t2linux.org)。

#### Rebase 到 T2 特定的 Bluefin 镜像

你可以创建一个包含你的 mac 所需的全 Broadcom wifi/bluetooth 固件的 Bluefin 自定义镜像。目前，一个 Bluefin 粉丝的社区项目 [T2-Atomic](https://github.com/lauretano/t2-atomic) 已经存在，它会发布所有 T2 启用组件都已就位 Bluefin/Aurora 镜像。在创建你自己的自定义镜像时，请随意将其作为一种资源使用。

##### 社区自定义镜像：

- [T2-Atomic](https://github.com/lauretano/t2-atomic) - 镜像在计划的 Bluefin 构建之后同步每日构建。将下面字符串复制/粘贴到 rebase 命令中相应位置）：
  - lauretano/t2-atomic-bluefin:latest
  - lauretano/t2-atomic-bluefin-dx:latest
  - lauretano/t2-atomic-aurora:latest
  - lauretano/t2-atomic-aurora-dx:latest

要 rebase 到这些镜像，类似于从 Silverblue rebase 到 Bluefin，你需要先 rebase 到一个未签名镜像，然后再 rebase 到签名镜像。

1. Rebase 到未签名镜像，将 "[repo/bluefin-package:tag]" 替换为你选择或创建的仓库和镜像变体：

`sudo bootc switch ghcr.io/[repo/bluefin-package:tag]`

2. 重启 `systemctl reboot`

3. Rebase 到签名镜像，同样将 "[repo/bluefin-package:tag]" 替换为你选择或创建的仓库和镜像变体：

`sudo bootc switch ghcr.io/[repo/bluefin-package:tag] --enforce-container-sigpolicy`

查看 [T2-Atomic](https://github.com/lauretano/t2-atomic) 的 readme 了解其他可用镜像（Sway、Cosmic、vanilla Silverblue）的详情。

#### 手动安装（层叠包）

在终端中，你会安装几个包并启用一些运行你的 T2 所需的守护进程。你会安装用于 touchbar 管理的 `t2fanrd` 和 `rust-tiny-dfr`，以及用于基本 T2 音频支持的 `t2linux-audio`。

1. 安装 SharpenedBlade 的 T2Linux copr：`sudo curl -o /etc/yum.repos.d/sharpenedblade-t2linux-fedora-43.repo https://copr.fedorainfracloud.org/coprs/sharpenedblade/t2linux/repo/fedora-43/sharpenedblade-t2linux-fedora-43.repo`

2. 安装 T2 特定包：`sudo dnf install t2fanrd rust-tiny-dfr t2linux-audio`，在提示时重启。

3. 重启后，用 `systemctl status t2fanrd` 确保 t2fanrd 正在运行。风扇转速曲线可以通过编辑 `/etc/t2fanrd.conf` 来管理。详见 [T2FanRD](https://github.com/GnomedDev/T2FanRD)。

4. 启用适合 T2 的内核参数。在终端中运行：`sudo bootc kargs --append intel_iommu=on --append iommu=pt --append mem_sleep_default=s2idle`，在提示时重启。

### Day 2-3 T2 安装后微调

#### 在早期引导期间允许使用内置键盘（LUKS 加密解锁）

启用 initramfs 再生成。这将使 dracut 在升级时运行，从而让我们能够配置 apple-bce 模块在早期引导时加载。`sudo bootc initramfs --enable` —— 请注意，initramfs 生成会在镜像更新期间消耗本地 CPU 时间。

- 如果在层叠 T2 包，创建一个加载 apple-bce 模块的配置文件：`echo "force_drivers+=\" apple-bce \"" | sudo tee /etc/dracut.conf.d/t2linux-modules.conf`

- 如果使用 T2-Atomic，`/etc/dracut.conf.d/t2-bce.conf` 应当已经存在。

#### 混合图形

参见 [Hybrid Graphics at T2Linux Wiki](https://wiki.t2linux.org/guides/hybrid-graphics/)。只需要关于启用 iGPU（创建 apple-gmux.conf）的章节。radeon 通常在"low"功耗模式下运行，因为 iGPU 被使用时它大多不被使用。截至 2024 年，dGPU 电源无法切换（radeon 始终开启），但仅通过使用 iGPU 处理大多数任务就能降低电源/热量。

如果使用 T2-Atomic 镜像，编辑 `/etc/modprobe.d/apple-gmux.conf` 并取消注释"options"行。

#### 调谐 DSP 音频

16" MacBook Pro 的音质可以使用 Asahi Linux 团队创建并带到 T2 Linux 的调谐软件 DSP 得到显著改善。详见 [T2 Apple Audio DSP (@lemmyg on GitHub)](https://github.com/lemmyg/t2-apple-audio-dsp/tree/speakers_161)。MacBookPro16,1 的 .wav 文件已包含在 T2-Atomic 镜像中，可以包含在你自己的自定义镜像中。

- 如果在层叠包，用 `sudo dnf install calf libspatialaudio lsp-plugins-lv2 lv2-calf-plugins ladspa-swh-plugins pipewire-module-filter-chain-lv2` 安装依赖
- 如果使用 T2-Atomic，这些依赖已经安装。重命名禁用的配置文件并重启。`sudo mv /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.confdisabled /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.conf`

#### 禁用 Sleep/suspend、盖子开关等

为了防止系统休眠，我们将配置 systemd 来忽略盖子开关，并将电源按钮配置为关机而非挂起：

##### 手动安装：

1. 在终端中运行：

```
sudo mkdir -p /etc/systemd/logind.conf.d
sudo touch /etc/systemd/logind.conf.d/t2-lidswitch.conf
```

2. 编辑 `/etc/systemd/logind.conf.d/t2-lidswitch.conf` 使其包含以下内容，这将覆盖 `/usr/lib/systemd/logind.conf` 中的默认系统级配置：

```
[Login]
# we generally want to ignore or poweroff, no suspend since it doesn't work on T2s
HandlePowerKey=ignore
HandlePowerKeyLongPress=poweroff
HandleSuspendKey=ignore
HandleSuspendKeyLongPress=poweroff
HandleHibernateKey=ignore
HandleHibernateKeyLongPress=poweroff
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
```

##### T2-Atomic：

文件 `/etc/systemd/logind.conf.d/t2-lidswitch.conf` 应当存在，且包含上面看到的相同设置。它会禁用盖子开关（记得关闭你的笔记本！），并将电源按钮动作设置为关机。

#### 禁用 T2 USB 以太网通知垃圾信息

T2 芯片呈现一个内部 USB 以太网接口，会连接和断开。这个以太网接口在当前版本的 Linux 中未被使用，因此可以阻止这些模块加载，以停止这些通知堵塞你的桌面和日志。

##### 手动安装：

编辑文件 `/etc/modprobe.d/t2-eth-blocklist.conf` 并包含以下内容：

```
blacklist cdc_ncm
blacklist cdc_mbim
```

##### T2-Atomic：

这个文件应当已经存在。如果你仍收到通知，你可能需要以另一种方式在你的电脑上禁用这个接口。
