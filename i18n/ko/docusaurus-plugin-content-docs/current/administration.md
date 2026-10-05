---
title: 관리자 가이드
slug: /administration
---

#### 일상 운영

Bluefin은 재설치 없이 하드웨어의 수명까지 설치하도록 설계되었습니다. 전통적인 운영체제와 달리, 이미지는 항상 깨끗하고 "정제"되어 있어 업그레이드가 덜 문제가 됩니다. 업데이트는 기본적으로 자동적이고 조용합니다.

이는 일반적으로 시스템을 한 번 설정한 후 그렇게 유지할 수 있음을 의미합니다. 그러면 아마도 여기로 돌아올 필요가 없을 것입니다. 🙂

:::tip

나는 그 "디폴트 라이프스타일"이 좋다.

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin Desktop Environment Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## 애플리케이션 설치

[Flathub](https://flathub.org/)에서 [애플리케이션을 설치](https://flathub.org/)하려면 [Bazaar](https://github.com/kolunmi/bazaar)를 사용하세요. 시스템 업데이트와 업그레이드는 이 애플리케이션으로 처리되지 않으며, 그 범위는 Flathub에서 Flatpak만 설치하도록 축소되었습니다. 두 개의 flatpak 관리 도구가 포함되어 있습니다:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)는 애플리케이션 관리를 제공합니다.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)도 권한 관리를 위해 포함되어 있습니다.

## 시스템 업데이트

Bluefin은 "hands off"하도록 설계되었습니다. 시스템은 6시간마다 (6) 업데이트를 확인합니다. 여기에는 시스템 업데이트, flatpak, pet containers, 그리고 homebrew가 포함됩니다.

- 대부분의 이미지는 매주 게시되지만, 우리는 모든 시점에 새 업데이트를 밀 수 있습니다.

업데이트는 시스템이 재부팅될 때 적용됩니다. 따라서 커널 업데이트가 적용되는지 보장하기 위해 사용하지 않을 때 정기적으로 장치를 종료하는 것이 권장됩니다. 애플리케이션 업데이트 (브라우저 등)는 이것과 독립적으로 일어나며 재부팅이 필요 없습니다.

장치 펌웨어 업데이트는 Firmware 애플리케이션을 통해 제공됩니다.

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### 업데이트 관리

**Settings** → **Network** → 네트워크 설정에서 **Metered Connection: has data limits or can incur charges**를 설정하여 Bluefin 업데이트를 일시 중지하세요:

![Settings → Network → A network setting - `Metered Connection: has data limits or can incur charges` Highlight](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## Streams 및 Throttle 설정

Bluefin은 Fedora의 현재 버전를 기반으로 이미지를 제공합니다. 이것은 업데이트를 얼마나 공격적으로 할지에 대한 유연성을 사용자에게 제공합니다. 이들은 "streams"라고 불립니다.

### Bluefin

`stable`: 이것은 Bluefin의 기본 stream이며 대부분의 사용자를 목표로 합니다. 이것은 항상 Fedora의 현재 버전으로 alias되지만 Fedora CoreOS 릴리스 일정을 따릅니다. 이것은 커널 업그레이드가 Fedora에 도입된 지 약 2주 후에 이루어지는데, 이는 Bluefin 팀이 그러한 상황에서 특정 커널로 핀할 수 있기 때문에 커널 regressions을 피하는 데 유용할 수 있습니다. 우리는 이것을 커널을 "gating"한다고 부릅니다. `stable-daily`는 매일 빌드를 원하는 사용자를 위해 사용할 수 있습니다.

:::note[Latest (For Testers)]
`latest`: 사용자에게 최신 Fedora가 제공할 모든 것을 원하는 사람들을 위해, ungated Linux 커널, 매일 업데이트, 완전한 open throttle. 🔥 이 stream는 의도적으로 브랜드가 없고 일반 목적 사용용이 아닙니다.
:::

세 개의 rolling tag에서 선택하거나 Fedora의 특정 버전으로 잠글 수 있습니다. 특정 버전 정보를 위해 [release notes](https://github.com/projectbluefin/bluefin/releases)를 확인하세요:

|                      | `stable` (default) 또는 `stable-daily` | `latest`    |
| -------------------- | -------------------------------------- | ----------- |
| Fedora Version:      | 43                                     | 43          |
| GNOME Version:       | 49                                     | 49          |
| Target User:         | All Users                              |             |
| System Updates:      | Weekly or Daily                        | Daily       |
| Application Updates: | Twice a Day                            | Twice a Day |
| Kernel:              | Gated                                  | Ungated     |

`latest`와 `stable` 사이의 주요 차이는 커널 cadence와 그들이 언제 major 업그레이드를 하는지입니다. `latest`는 사용 가능해지는 즉시 다음 major Fedora 릴리스로 업그레이드하고 매일 빌드합니다. `stable`는 CoreOS가 userspace 업그레이드를 할 때 업그레이드하는데, 이것은 보통 몇 주 후에 이루어지고 매주 또는 매일 빌드합니다. 사용자는 매일 stable 업데이트를 위해 `stable-daily` 이미지를 선택하거나, 매주 빌드를 위해 `stable`에 머물 수 있습니다.

#### Gated Kernel

`stable` tag는 gated 커널을 특징으로 합니다. 이 커널은 기본 Fedora Silverblue보다 느린 cadence인 [Fedora CoreOS stable stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable)의 동일한 버전를 따릅니다. Universal Blue 팀은 regressions이 사용자에게 영향을 줄 수 있는 순서를 피하기 위해 임시적으로 특정 커널로 핀할 수 있습니다.

커널 boot 인수를 추가하고 편집하는 것은 `bootc kargs`로 처리됩니다. 더 많은 정보를 위해 [upstream documentation](https://bootc.dev/bootc/building/kernel-arguments.html)를 확인하세요.

:::info[It's all just Bluefin]

Bluefin의 컴포넌트는 모든 이미지에 공유되므로, 그것을 별도의 "Edition" 또는 "Spin"으로 생각하지 마세요. Bluefin은 모든 이미지에 걸쳐 동일하기를 노력합니다, 우리는 업데이트의 공격성이 "be a setting"일 수 있다고 생각합니다. 이상적으로는 "Bluefin"을 사용하고 업데이트 stream에 대해 신경 쓸 필요가 없습니다.

:::

### Switching between Streams

`ujust rebase-helper` 명령을 사용하여 rebase를 선택하고 특정 stream을 선택하세요:

![`ujust rebase-helper` - channel](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

또는 `date`를 선택하고 오래된 이미지를 선택하세요.

![`ujust rebase-helper` - date](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### streams 수동으로 전환

Bluefin은 운영체제 이미지를 관리하기 위해 [`bootc`](https://bootc.dev/bootc/)를 사용합니다. 현재의와 staging된 deployment를 검사하려면, 실행하세요:

```sh
sudo bootc status
```

이것은 부팅된 이미지, staging된 업데이트 (있는 경우), 그리고 rollback 타깃을 표시합니다:

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

`ghcr.io/projectbluefin/bluefin:stable` 참조는 이미지와 stream tag를 나타냅니다. `:stable`, `:latest`, 또는 pinned date tags를 찾으세요.

로컬로 layer된 패키지가 있다면, streams를 전환하기 전에 그것들을 초기화하세요:

```sh
rpm-ostree reset
```

**Pro Tip**: Bluefin의 [release notes](https://github.com/projectbluefin/bluefin/releases)에는 각 릴리스에 대한 stream 전환 지침이 포함되어 있습니다.

streams를 이동하려면 `bootc switch` 명령을 사용하세요:

#### Manual Switch Examples

<details>

<summary>Switching to `:stable`. The `--enforce-container-sigpolicy` flag ensures signature validation for the target image:</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

Switching to `:testing`:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

Switching to NVIDIA hardware images:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Pinning to a specific date tag:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

Roll back to the previous deployment:

```sh
sudo bootc rollback
```

Use `skopeo inspect` to query image metadata and available tags:

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

This will show all the available tags and useful metadata like image and kernel versions.

Check the [bootc documentation](https://bootc.dev/bootc/) for more information.

## Virtual Private Networks (VPN)

[Tailscale](https://tailscale.com)는 desktop와 development 사용 사례 모두를 위해 VPN 서비스를 제공하기 위해 기본적으로 포함되어 있습니다. [Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Using Tailscale with Mullvad](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) - 박스에서 가장 좋은 경험을 제공합니다
- [Using Tailscale with Docker](https://tailscale.com/docs/features/containers/docker) - development을 위해
- [Using the system tray with tailscale](https://tailscale.com/docs/features/client/linux-systray) - system tray에 tailscale 아이콘을 설정하기 위해 이것을 따르세요. `wl-clipboard`는 이미 시스템에 포함되어 있으므로 그것을 설치할 필요가 없음을 참고하세요.
- Tailscale의 [YouTube channel](https://www.youtube.com/@Tailscale)는 많은 훌륭한 팁과 트릭을 가지고 있습니다
- 좋은 VPN 제공자는 직접 Network Manager로 가져올 수 있는 Wireguard 구성을 제공할 수 있으므로, 더 많은 정보를 위해 그들의 문서를 확인하세요:
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

Flathub에도 좋은 경험을 제공할 VPN 제공자가 있습니다:

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([Donate](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN client](https://flathub.org/apps/com.protonvpn.www) - Flathub에서 사용 가능

여기에서 명시적으로 언급되지 않은 다른 VPN 제공자는 부족한 패키징 경험을 제공할 수 있고 권장되지 않습니다. 당신의 VPN 제공자가 이 카테고리에 속한다면, wireguard 구성을 내보내고 수동으로 가져오는 것이 가장 좋은 접근일 수 있습니다.

## Local Layering

직접적으로 host 이미지에 패키지를 추가하는 것은 Bluefin에서 권장되지 않습니다. 운영체제는 `bootc`로 관리되는 OCI 이미지로서 깨끗하고 재현 가능하게 유지되도록 설계되었습니다.

Workload는 컨테이너 (Distrobox 또는 Devcontainers를 통해), Homebrew를 통해 설치된 CLI 도구, 그리고 Flathub에서 설치된 그래픽 애플리케이션으로 고립되어야 합니다.

임시로 host 패키지를 layer해야 한다면:

```sh
rpm-ostree install <package>
```

모든 layer된 패키지를 제거하고 순수 이미지 baseline로 돌아가기 위해:

```sh
rpm-ostree reset
```

적용하기 위해 재부팅하세요.

| Recommended Alternative | Avoid Layering on Host |
| ----------------------- | ---------------------- |
| Flatpak apps            | Graphical desktop apps |
| Homebrew CLI tools      | Host utilities         |
| Distrobox / Containers  | Developer runtimes     |

## Overwriting System Defaults

Bluefin 시스템 데폴트는 Fedora 구성과 함께 `/usr/etc`의 base 이미지에_shipped됩니다. 이것들의 대부분은 `/etc`에 파일을 배치하여 재정의할 수 있습니다.

예를 들어, Distrobox 구성은 `/usr/etc/distrobox/distrobox.ini`에 있습니다. 당신의 커스터마이징 옵션은 `/etc/distrobox/distrobox.ini`에 배치될 것입니다. 이것은 원본 파일의 사본이 필요한 상황에 유용합니다.

구성 옵션에 대한 더 많은 정보를 위해 [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)를 확인하세요, 특히 `~/.local`과 `~/.config`입니다.

## Community Aliases and Workarounds

[just](https://just.systems)는 Bluefin에서 task runner로 사용됩니다. 이것들은 일반적으로 커뮤니티 편의 alias이거나, 일부 작업이나 초기 설정을 자동화하는 데 도움이 되는 더 복잡한 스크립트입니다. 이것은 `ujust`로 alias되어, 당신의 다른 프로젝트에서 `just` 자체를 사용할 수 있습니다.

### Getting Started with ujust

- `ujust --choose` - 모든 명령과 그 명령이 선택될 때 실행되는 스크립트를 표시합니다. 사용 가능한 명령을 탐색하는 데 유용합니다
- `ujust -n $command` - `-n`은 dry-run 모드에서 명령을 실행합니다, 이것은 실행되는 명령을 검사하는 데 유용합니다

:::tip

Pro tip, 당신의 자신의 작업과 alias를 `~/.Justfile`에 유지하고, 프로젝트 파일의 루트에 두는 것도 일반적인 작업을 자동화하는 데 편리합니다, [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads)에서 이 예시를 확인하세요.

:::

### Curated Tool Bundles

Bluefin은 curated CLI 도구 컬렉션을 포함합니다. 이 명령은 Homebrew를 통해 curated 도구 컬렉션을 설치합니다:

| Command             | Description                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | Modern CLI tools: atuin, bat, chezmoi, direnv, eza, fd, gh, glab, ripgrep, starship, tealdeer, television, zoxide, and more |

### System Commands

| Command                        | Description                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | Manually update the system, flatpaks, and brew formulas                                                                                                                                                           |
| `ujust toggle-updates`         | Enable or disable automatic system updates                                                                                                                                                                        |
| `ujust changelogs`             | Show the changelogs for each package since the last update                                                                                                                                                        |
| `ujust bios`                   | Reboot the PC and enter the BIOS/UEFI. Useful for running dual boot systems from independent disks                                                                                                                |
| `ujust bios-info`              | Display BIOS/UEFI information (manufacturer, product name, version, release date)                                                                                                                                 |
| `ujust device-info`            | Sends the status, flatpak list, and system info to the CentOS pastebin, and returns the URL to the terminal. This allows the end user to conveniently paste the URL with their info so others can help them debug |
| `ujust rebase-helper`          | Interactive assistant to switch between streams, rebase to different images, or roll back to a previous version                                                                                                   |
| `ujust clean-system`           | Clean up unused containers, volumes, and flatpak runtimes                                                                                                                                                         |
| `ujust check-idle-power-draw`  | Measure your system's idle power consumption using powerstat                                                                                                                                                      |
| `ujust check-local-overrides`  | Show files that differ between `/usr/etc` and `/etc` to identify local customizations                                                                                                                             |
| `ujust logs-this-boot`         | Show all system log messages from the current boot                                                                                                                                                                |
| `ujust logs-last-boot`         | Show all system log messages from the previous boot                                                                                                                                                               |
| `ujust enroll-secure-boot-key` | Enroll the Nvidia driver & KMOD signing key for secure boot (password: "universalblue")                                                                                                                           |
| `ujust toggle-user-motd`       | Toggle display of the message of the day in terminal                                                                                                                                                              |
| `ujust toggle-tpm2`            | Toggle automatic LUKS disk unlock via TPM (enable/disable with optional PIN)                                                                                                                                      |
| `ujust toggle-iwd`             | Switch between iwd and wpa_supplicant for Wi-Fi networking (iwd can improve throughput and reduce latency)                                                                                                        |
| `ujust benchmark`              | Run a one-minute system benchmark using stress-ng                                                                                                                                                                 |
| `ujust powerwash`              | Factory reset this device to its initial state (experimental feature)                                                                                                                                             |

### Developer Experience Commands

| Command                | Description                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ujust devmode`        | Toggle between Bluefin and the Developer Experience (bluefin-dx)                                                               |
| `ujust dx-group`       | Add your user to docker, incus-admin, libvirt, and dialout groups for full developer access                                    |
| `ujust bluefin-cli`    | Install Bluefin's curated command line experience with modern tools (atuin, bat, eza, fd, ripgrep, starship, zoxide, and more) |
| `ujust toggle-devmode` | Alias for `ujust devmode`                                                                                                      |

### Application Installation Commands

| Command                               | Description                                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`             | Install [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/) for managing JetBrains IDEs      |
| `ujust install-opentabletdriver`      | Install or uninstall [OpenTabletDriver](https://opentabletdriver.net/), an open source tablet driver |
| `ujust install-system-flatpaks`       | Install the default system flatpaks (useful after rebasing)                                          |
| `ujust install-system-flatpaks-extra` | Install extra recommended flatpak applications                                                       |

Note that generally speaking Bluefin tries to keep the system Justfiles finely scoped, most of these are workarounds and not full-fledged commands. They may get removed or changed depending on the problem they were initially meant to solve.

## Managing Extensions

Bluefin은 Matthew Jakeman의 [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)를 사용하여 desktop extensions을 관리합니다. 애플리케이션은 기본적으로 포함되어 있습니다. 당신은 [Logo Menu](https://github.com/Aryan20/Logomenu)를 통해 접근할 수 있습니다 (thanks Aryan Kaushik!)

![GNOME Extension Menu Option (opens Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

이것은 Bluefin과 함께 번들로 제공되는 것들의 일부 사용을 원하지 않게 되면 유용합니다.

![Extension Manager - System Extensions Highlight](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

In the unlikely event that your session crashes, then all of your extensions will be disabled. In the rare case when this happens you may need to turn them all back on in the extensions manager.

:::

## Remote Management

:::note[Help Wanted]

This feature is incomplete and needs contributors to make it a reality

:::

Bluefin과 Aurora는 기기 관리를 위해 Cockpit을 포함합니다. 우리는 더 많은 out-of-the-box 관리 템플릿을 포함하기를 희망합니다, 자원봉사하고자 한다면 [check this issue](https://github.com/projectbluefin/bluefin/issues)를 확인하세요.

## Verification

이 이미지는 sigstore의 [cosign](https://docs.sigstore.dev/cosign/)으로 서명됩니다. Bluefin Classic은 key-based signing을 사용하므로, [ublue-os/bluefin](https://github.com/ublue-os/bluefin)에서 lấy온 `cosign.pub` 키로 검증하세요:

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

Dakota와 Utah는 keylessly 대신 서명됩니다 — 검증 명령은 [Supply Chain Security](/supply-chain)를 확인하세요.
