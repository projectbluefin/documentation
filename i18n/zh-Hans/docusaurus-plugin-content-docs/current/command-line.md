---
title: 应用与命令行
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin 的设计面向普通人，但命令行是我们的 _**热爱**_。因此我们既投资图形桌面体验，也投资终端工作流。加油干。

## 图形应用

Bluefin 对桌面软件采取 **Flatpak 优先** 的 Approach。应用与宿主操作系统隔离运行，来源为 [Flathub](https://flathub.org)。

- **[Bazaar](https://github.com/kolunmi/bazaar)** —— 默认应用商店。它会过滤已被弃用的应用以及那些依赖过时 Flatpak 运行时的应用。
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** —— 管理 Flatpak 生命周期、检查已安装的运行时、清理残留物，并对版本进行固定或降级。
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** —— 用于细粒度 Flatpak 文件系统、网络和设备访问控制的图形化权限管理器。

## 命令行应用与 Homebrew

[brew](https://brew.sh/)（Homebrew）是安装命令行应用和开发者工具的主要包管理器，且不会污染基础操作系统镜像。

- [Homebrew Documentation](https://docs.brew.sh/)
- [Homebrew Packages](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

请注意，Homebrew Cask 功能是 macOS 特有的，在 Bluefin 中无法使用；图形应用改用 Flatpak。其他工具如 [uv](https://github.com/astral-sh/uv)、[pixi](https://github.com/prefix-dev/pixi)、[asdf](https://asdf-vm.com/) 和 [mise](https://github.com/jdx/mise) 通过 Homebrew 安装时都能顺利运行。

:::info[不要混用两套体系]

一般来说，如果你需要一个 CLI 工具或实用程序，就用 Homebrew。如果你需要开发用的库和依赖，就用容器。这样能保持一切都干净且可复现。

:::

### 每日消息与 `fastfetch`

项目偏好那种既炫酷又有实用价值的"装饰"。新终端（<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>）会显示一条包含系统信息的每日消息（message of the day）：

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

`bluefin-dx:beta` 这一行是操作系统镜像的名称，提醒你是否在使用固定镜像，并提供常用命令的快速参考。用 `ujust toggle-user-motd` 来开关它。

我们喜欢炫耀自己的机器。运行 `fastfetch`：

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

这个界面显示硬件信息、用户名、机器名和内核版本。每个 Bluefin 镜像都有一个"Forged On"日期，纪念该机器初次安装的日期：

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## 终端配置

### 更改默认终端 Shell

Bluefin 默认使用 [bash](https://www.gnu.org/software/bash/)，同时镜像也附带 [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) 和 [zsh](https://www.zsh.org/) 以求方便。

Bluefin 将 [Ptyxis](https://devsuite.app/ptyxis/) 作为默认终端（在应用启动器中名为 `Terminal`）。我们**强烈建议**你[通过终端模拟器而非系统范围来更改 shell](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/)。先用 `brew install zsh` 或 `brew install fish` 安装你想要的 shell。点击终端设置并编辑你的配置文件：

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

选择 "Use Custom Command" 并添加你的 shell：

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## 维护器推荐的 GNOME 扩展

以下是维护器推荐用来完善你桌面体验的 GNOME 扩展。向你喜爱的扩展作者捐赠以支持他们！

<div className={styles.extensionsGrid}>

<GnomeExtensions extensionId={5724} />
<GnomeExtensions extensionId={6670} />
<GnomeExtensions extensionId={6325} />
<GnomeExtensions extensionId={8834} />
<GnomeExtensions extensionId={3843} />
<GnomeExtensions extensionId={2236} />
<GnomeExtensions extensionId={5964} />
<GnomeExtensions extensionId={6000} />
<GnomeExtensions extensionId={7065} />

对于 Tailscale 的图形界面，我们推荐[官方 systray 应用](https://tailscale.com/docs/features/client/linux-systray)：`tailscale configure systray --enable-startup=systemd` 然后重启。

</div>

## 字体

Homebrew 也用于安装字体。浏览 [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/) 并将你喜欢的字体安装到 `~/.local/share/fonts`。

### 微软字体

如果你需要微软字体以保证文档兼容性：

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
