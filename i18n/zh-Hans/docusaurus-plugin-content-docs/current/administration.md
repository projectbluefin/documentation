---
title: 管理员指南
slug: /administration
---

#### 日常运维

Bluefin 设计为在硬件的整个生命周期中安装而无需重新安装。与传统操作系统不同，镜像始终是"干净"的，使升级更少出问题。更新默认是自动且静默的。

这通常意味着你可以一次性设置好系统，然后让它保持那样。然后你可能永远不需要再回到这里。🙂

:::tip

我想要那种"默认生活方式"。

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin Desktop Environment Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## 安装应用

使用 [Bazaar](https://github.com/kolunmi/bazaar) [从 Flathub 安装应用](https://flathub.org/)。系统更新和升级不由这个应用处理，它的范围已缩减为只从 Flathub 安装 Flatpak。包含两个 Flatpak 管理工具：

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) 提供应用管理。
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal) 也包含在内用于权限管理。

## 系统更新

Bluefin 设计为"放手不管"。系统每六（6）小时检查一次更新。这包括系统更新、flatpak、pet container 和 homebrew。

- 大多数镜像每周发布，但我们可能在任何时候推送新更新。

更新在系统重启时应用。因此，建议在不使用设备时定期关机，以确保内核更新被应用。应用更新（如浏览器）独立于此发生，不需要重启。

机器固件更新通过 Firmware 应用提供。

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### 管理更新

在 **Settings** → **Network** → 某个 network setting 中，将 **Metered Connection: has data limits or can incur charges** 设置为暂停 Bluefin 更新：

![Settings → Network → A network setting - `Metered Connection: has data limits or can incur charges` Highlight](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## 流与节流设置

Bluefin 提供基于 Fedora 当前版本的镜像。这是给用户灵活度，让他们可以自由控制更新的激进程度。这些被称为"streams"（流）。

### Bluefin

`stable`：这是 Bluefin 的默认流，面向大多数用户。它始终别名到 Fedora 的当前版本，但遵循 Fedora CoreOS 的发布计划。这意味着内核升级比它们进入 Fedora 晚约 2 周，这对避免内核回归有用，因为在这种情况下 Bluefin 团队可以固定到某个特定内核。我们称这为对内核"gating"（放行）。`stable-daily` 为想要每日构建的用户提供。

:::note[最新（面向测试者）]
`latest`：对于想要 Fedora 最新特性的用户，一个 ungated Linux 内核、每日更新、完全开放节流。🔥 这个流刻意保持无品牌，并非面向通用用途。
:::

你可以从三个滚动标签中选择，或固定到 Fedora 的某个特定版本。查看[发布说明](https://github.com/projectbluefin/bluefin/releases)获取特定版本信息：

|                      | `stable`（默认）或 `stable-daily` | `latest`    |
| -------------------- | ------------------------------------ | ----------- |
| Fedora 版本:         | 43                                   | 43          |
| GNOME 版本:          | 49                                   | 49          |
| 目标用户:            | 所有用户                            |             |
| 系统更新:            | 每周或每日                            | 每日        |
| 应用更新:            | 每天两次                            | 每天两次    |
| 内核:                | 放行（Gated）                       | 未放行（Ungated） |

`latest` 和 `stable` 之间的主要区别在于内核节奏和它们进行重大升级的时间。`latest` 会在下一个 Fedora 主要版本一可用就升级并每日构建。`stable` 会在 CoreOS 进行用户空间升级时升级，通常在那之后几周，并每周或每日构建。用户可以选择 `stable-daily` 镜像来获得每日稳定更新，或坚持使用 `stable` 来获得每周构建。

#### 放行内核

`stable` 标签配备了放行内核。这个内核遵循与[Fedora CoreOS stable 流](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable)相同版本，其节奏比默认 Fedora Silverblue 慢。Universal Blue 团队可能会临时固定到某个特定内核，以避免可能影响用户的回归。

添加和编辑内核启动参数由 `bootc kargs` 处理。查看[upstream documentation](https://bootc.dev/bootc/building/kernel-arguments.html)获取更多信息。

:::info[它们都只是 Bluefin]

Bluefin 的组件在所有镜像间共享，不要把它当作一个单独的"Edition"或"Spin"。Bluefin 力求在所有镜像上都一致，我们认为更新的激进程度可以"作为一个设置"。理想情况下你使用"Bluefin"而不需要关心你的更新流。

:::

### 在流之间切换

使用 `ujust rebase-helper` 命令来选择 rebase 并选择特定流：

![`ujust rebase-helper` - channel](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

或选择 `date` 并选择一个较旧的镜像。

![`ujust rebase-helper` - date](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### 手动在流之间切换

Bluefin 使用 [`bootc`](https://bootc.dev/bootc/) 来管理操作系统镜像。要检查你当前和暂存的部署，运行：

```sh
sudo bootc status
```

这会显示你启动的镜像、暂存的更新（如果有）以及回滚目标：

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

`ghcr.io/projectbluefin/bluefin:stable` 引用指示镜像和流标签。查找 `:stable`、`:latest` 或固定的日期标签。

如果你有本地层叠的包，在切换流之前重置它们：

```sh
rpm-ostree reset
```

**提示**：Bluefin 的[发布说明](https://github.com/projectbluefin/bluefin/releases)包含每个发布的流切换说明。

使用 `bootc switch` 命令切换到不同的流：

#### 手动切换示例

<details>

<summary>切换到 `:stable`。`--enforce-container-sigpolicy` 标志确保对目标镜像的签名验证：</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

切换到 `:testing`：

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

切换到 NVIDIA 硬件镜像：

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

固定到特定日期标签：

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

回滚到上一个部署：

```sh
sudo bootc rollback
```

使用 `skopeo inspect` 查询镜像元数据和可用标签：

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

这会显示所有可用标签和有用的元数据，如镜像和内核版本。

查看 [bootc documentation](https://bootc.dev/bootc/) 获取更多信息。

## 虚拟专用网络（VPN）

[Tailscale](https://tailscale.com) 默认包含在内，为桌面和开发使用场景提供 VPN 服务。[Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/)。

- [Using Tailscale with Mullvad](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) - 提供最好的开箱即用体验
- [Using Tailscale with Docker](https://tailscale.com/docs/features/containers/docker) - 用于开发
- [Using the system tray with tailscale](https://tailscale.com/docs/features/client/linux-systray) - 按照这个来设置系统托盘中的 tailscale 图标。请注意 `wl-clipboard` 已经包含在系统中。
- Tailscale 的[YouTube channel](https://www.youtube.com/@Tailscale)有很多很好的技巧和窍门
- 好的 VPN 提供商可能提供可以直接导入到 Network Manager 的 Wireguard 配置，查看他们的 documentation 获取更多信息：
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

Flathub 上也有 VPN 提供商会提供良好的体验：

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([Donate](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN client](https://flathub.org/apps/com.protonvpn.www) - 在 Flathub 上可用

其他在这里没有明确提到的 VPN 提供商可能有较差的打包体验，不推荐。如果你的 VPN 提供商属于这一类，那么导出 wireguard 配置并手动导入可能是最好的方法。

## 本地层叠

在 Bluefin 中不鼓励直接把包安装到宿主镜像上。操作系统被设计为保持纯净和可复现，作为由 `bootc` 管理的 OCI 镜像。

工作负载应当在容器中隔离（通过 Distrobox 或 Devcontainers），通过 Homebrew 安装的 CLI 工具，以及从 Flathub 安装的图形应用。

如果你必须临时层叠一个宿主包：

```sh
rpm-ostree install <package>
```

要移除所有层叠包并回到纯镜像基线：

```sh
rpm-ostree reset
```

重启以应用。

| 推荐的替代方案 | 避免在宿主上层叠 |
| ----------------------- | ---------------------- |
| Flatpak 应用            | 图形桌面应用 |
| Homebrew CLI 工具       | 宿主实用程序         |
| Distrobox / 容器        | 开发者运行时     |

## 覆盖系统默认值

Bluefin 系统默认值随基础镜像一起提供，Fedora 配置在 `/usr/etc` 中。大多数可以通过在 `/etc` 中放置文件来覆盖。

例如，Distrobox 配置在 `/usr/etc/distrobox/distrobox.ini`。你的定制选项将放在 `/etc/distrobox/distrobox.ini`。这在某些情况下有用，当你需要原始文件的副本作为参考时。

查看 [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) 获取关于配置选项的更多信息，特别是 `~/.local` 和 `~/.config`。

## 社区别名与变通方法

[just](https://just.systems) 在 Bluefin 上作为任务运行器使用。这些通常是社区便利别名，或更复杂的脚本来帮助自动化一些任务或初始设置。它被别名为 `ujust`，这样你就可以用 `just` 本身来处理你的其他项目。

### 开始使用 ujust

- `ujust --choose` - 显示每个命令以及选择该命令时正在执行的脚本。用于浏览可用命令很有用
- `ujust -n $command` - `-n` 将以 dry-run 模式运行命令，用于检查正在运行的命令很有用

:::tip

提示，把你自己任务和别名放在 `~/.Justfile` 中，把它们放在你项目文件的根目录来自动化常见任务也很方便，看看来自 [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads) 的这个示例。

:::

### 精选工具包

Bluefin 包含精选的 CLI 工具集合。这些命令通过 Homebrew 安装精选的工具集合：

| 命令              |  Description                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | 现代 CLI 工具：atuin、bat、chezmoi、direnv、eza、fd、gh、glab、ripgrep、starship、tealdeer、television、zoxide 等 |

### 系统命令

| 命令                        |  Description                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | 手动更新系统、flatpak 和 brew 公式                                                                                                                                                           |
| `ujust toggle-updates`         | 启用或禁用自动系统更新                                                                                                                                                                        |
| `ujust changelogs`             | 显示每个包自上次更新以来的变更日志                                                                                                                                                        |
| `ujust bios`                   | 重启 PC 并进入 BIOS/UEFI。用于从独立磁盘运行双启动系统                                                                                                                |
| `ujust bios-info`              | 显示 BIOS/UEFI 信息（制造商、产品名称、版本、发布日期）                                                                                                                                 |
| `ujust device-info`            | 将状态、flatpak 列表和系统信息发送到 CentOS pastebin，并将 URL 返回到终端。这允许终端用户方便地粘贴他们的 URL 以便帮助他们调试 |
| `ujust rebase-helper`          | 交互式助手，用于在流之间切换、rebase 到不同镜像，或回滚到之前的版本                                                                                                   |
| `ujust clean-system`           | 清理未使用的容器、卷和 flatpak 运行时                                                                                                                                                         |
| `ujust check-idle-power-draw`  | 使用 powerstat 测量你系统的空闲功耗                                                                                                                                                      |
| `ujust check-local-overrides`  | 显示 `/usr/etc` 和 `/etc` 之间不同的文件，以识别本地定制                                                                                                                             |
| `ujust logs-this-boot`         | 显示当前启动的所有系统日志消息                                                                                                                                                                |
| `ujust logs-last-boot`         | 显示上次启动的所有系统日志消息                                                                                                                                                               |
| `ujust enroll-secure-boot-key` | 为 secure boot 注册 Nvidia 驱动 & KMOD 签名密钥（密码：`universalblue`）                                                                                                                           |
| `ujust toggle-user-motd`       | 开关终端中每日消息的显示                                                                                                                                                              |
| `ujust toggle-tpm2`            | 通过 TPM 自动 LUKS 磁盘解锁的开关（启用/禁用，可选 PIN）                                                                                                                                      |
| `ujust toggle-iwd`             | 在 iwd 和 wpa_supplicant 之间切换 Wi-Fi 网络（iwd 可以提高吞吐并降低延迟）                                                                                                        |
| `ujust benchmark`              | 使用 stress-ng 运行一分钟的系统基准测试                                                                                                                                                                 |
| `ujust powerwash`              | 将此设备工厂重置为初始状态（实验性功能）                                                                                                                                             |

### 开发者体验命令

| 命令                |  Description                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ujust devmode`        | 在 Bluefin 和开发者体验（bluefin-dx）之间切换                                                               |
| `ujust dx-group`       | 把你的用户加入 docker、incus-admin、libvirt 和 dialout 组以获得完整的开发者访问权限                                    |
| `ujust bluefin-cli`    | 使用现代工具（atuin、bat、eza、fd、ripgrep、starship、zoxide 等）安装 Bluefin 精选的命令行体验 |
| `ujust toggle-devmode` | `ujust devmode` 的别名                                                                                                      |

### 应用安装命令

| 命令                               |  Description                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`          | 安装 [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/) 以管理 JetBrains IDEs              |
| `ujust install-opentabletdriver`   | 安装或卸载 [OpenTabletDriver](https://opentabletdriver.net/)，一个开源的 tablet 驱动 |
| `ujust install-system-flatpaks`    | 安装默认系统 flatpak（在 rebase 后有用）                                          |
| `ujust install-system-flatpaks-extra` | 安装额外的推荐的 flatpak 应用                                                       |

请注意，一般来说 Bluefin 尽量保持系统的 Justfiles 范围精细，其中大多数是变通方法而非完整的命令。它们可能根据它们最初旨在解决的问题被移除或更改。

## 管理扩展

Bluefin 使用 Matthew Jakeman 的 [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) 来管理桌面扩展。该应用默认包含在内。你可以通过 [Logo Menu](https://github.com/Aryan20/Logomenu)（感谢 Aryan Kaushik！）访问它。

![GNOME Extension Menu Option (opens Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

如果你决定不想使用一些随 Bluefin 捆绑的扩展，这很有用。

![Extension Manager - System Extensions Highlight](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

在极 unlikely 的情况下你的会话崩溃，那么你所有的扩展都会被禁用。在罕见情况下发生这种事时，你可能需要在扩展管理器中把它们全部重新打开。

:::

## 远程管理

:::note[Help Wanted]

这个功能不完整，需要贡献者来实现它

:::

Bluefin 和 Aurora 包含 Cockpit 用于机器管理。我们希望包含更多开箱即用的管理模板，如果你有兴趣志愿参与，请[查看这个 issue](https://github.com/projectbluefin/bluefin/issues)。

## 验证

这些镜像使用 sigstore 的 [cosign](https://docs.sigstore.dev/cosign/) 签名。Bluefin Classic 使用基于密钥的签名，因此使用来自 [ublue-os/bluefin](https://github.com/ublue-os/bluefin) 的 `cosign.pub` 密钥来验证：

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

Dakota 和 Utah 使用 keyless（无密钥）签名——参见 [Supply Chain Security](/supply-chain) 获取它们的验证命令。
