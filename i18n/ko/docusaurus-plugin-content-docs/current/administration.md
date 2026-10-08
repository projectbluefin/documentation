---
title: 관리자 가이드
slug: /administration
---

#### 일상 운영

Bluefin은 재설치 없이 하드웨어의 수명까지 설치하도록 설계되었습니다. 전통적인 운영체제와 달리, 이미지는 항상 깨끗하고 "정제"되어 있어 업그레이드가 덜 문제가 됩니다. 업데이트는 기본적으로 자동적이고 조용합니다.

이는 일반적으로 시스템을 한 번 설정한 후 그렇게 유지할 수 있음을 의미합니다. 그러면 아마도 여기로 돌아올 필요가 없을 것입니다. 🙂

:::tip

나는 그 "기본값대로 사는 방식(default lifestyle)"이 좋다.

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin Desktop Environment Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## 애플리케이션 설치

[Flathub](https://flathub.org/)에서 [애플리케이션을 설치](https://flathub.org/)하려면 [Bazaar](https://github.com/kolunmi/bazaar)를 사용하세요. 시스템 업데이트와 업그레이드는 이 애플리케이션으로 처리되지 않으며, 그 범위는 Flathub에서 Flatpak만 설치하도록 축소되었습니다. 두 개의 flatpak 관리 도구가 포함되어 있습니다:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)는 애플리케이션 관리를 제공합니다.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)도 권한 관리를 위해 포함되어 있습니다.

## 시스템 업데이트

Bluefin은 손댈 필요가 없도록("hands off") 설계되었습니다. 시스템은 6시간마다 업데이트를 확인합니다. 여기에는 시스템 업데이트, Flatpak, 펫 컨테이너(pet container), Homebrew가 포함됩니다.

- 대부분의 이미지는 매주 게시되지만, 필요하면 언제든지 새 업데이트를 배포할 수 있습니다.

업데이트는 시스템이 재부팅될 때 적용됩니다. 따라서 커널 업데이트가 적용되는지 보장하기 위해 사용하지 않을 때 정기적으로 장치를 종료하는 것이 권장됩니다. 애플리케이션 업데이트 (브라우저 등)는 이것과 독립적으로 일어나며 재부팅이 필요 없습니다.

장치 펌웨어 업데이트는 Firmware 애플리케이션을 통해 제공됩니다.

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### 업데이트 관리

**Settings** → **Network** → 네트워크 설정에서 **Metered Connection: has data limits or can incur charges**를 설정하여 Bluefin 업데이트를 일시 중지하세요:

![Settings → Network → A network setting - `Metered Connection: has data limits or can incur charges` Highlight](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## Stream 및 업데이트 속도 설정 {#streams-and-throttle-settings}

Bluefin은 Fedora 현재 버전을 기반으로 한 이미지를 제공합니다. 사용자는 업데이트를 얼마나 공격적으로 받을지 유연하게 선택할 수 있으며, 이러한 선택지를 "stream"이라고 부릅니다.

### Bluefin

`stable`: Bluefin의 기본 stream이며 대부분의 사용자를 위한 것입니다. 항상 Fedora 현재 버전을 가리키지만 Fedora CoreOS 릴리스 일정을 따릅니다. 따라서 커널 업그레이드는 Fedora에 도입된 지 약 2주 뒤에 이루어집니다. 문제가 생기면 Bluefin 팀이 특정 커널 버전에 고정할 수 있으므로 커널 회귀(regression)를 피하는 데 도움이 됩니다. 이를 커널 "게이팅(gating)"이라고 부릅니다. 매일 빌드를 원하는 사용자는 `stable-daily`를 사용할 수 있습니다.

:::note[Latest (테스터용)]
`latest`: 최신 Fedora가 제공하는 모든 것을 원하는 사용자를 위한 stream으로, 게이트되지 않은 Linux 커널, 매일 업데이트, 업데이트 속도 제한 없음이 특징입니다. 🔥 이 stream은 의도적으로 브랜딩이 없으며 일반 용도로 쓰기 위한 것이 아닙니다.
:::

세 가지 rolling 태그 중에서 고르거나 특정 Fedora 버전에 고정할 수 있습니다. 버전별 정보는 [릴리스 노트](https://github.com/projectbluefin/bluefin/releases)를 확인하세요:

|                        | `stable`(기본값) 또는 `stable-daily` | `latest`          |
| ---------------------- | ------------------------------------ | ----------------- |
| Fedora 버전:           | 43                                   | 43                |
| GNOME 버전:            | 49                                   | 49                |
| 대상 사용자:           | 모든 사용자                          |                   |
| 시스템 업데이트:       | 매주 또는 매일                       | 매일              |
| 애플리케이션 업데이트: | 하루 두 번                           | 하루 두 번        |
| 커널:                  | 게이트(Gated)                        | 비게이트(Ungated) |

`latest`와 `stable`의 주요 차이는 커널 업데이트 주기와 메이저 업그레이드 시점입니다. `latest`는 다음 메이저 Fedora 릴리스가 나오는 즉시 업그레이드하며 매일 빌드됩니다. `stable`은 CoreOS가 사용자 공간(userspace)을 업그레이드할 때 함께 업그레이드하는데, 보통 몇 주 뒤이며 매주 또는 매일 빌드됩니다. 매일 stable 업데이트를 받으려면 `stable-daily` 이미지를, 매주 빌드를 원하면 `stable`을 사용하세요.

#### 게이트 커널(Gated Kernel)

`stable` 태그는 게이트 커널을 사용합니다. 이 커널은 [Fedora CoreOS stable stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable)과 같은 버전을 따르며, 기본 Fedora Silverblue보다 업데이트 주기가 느립니다. Universal Blue 팀은 회귀(regression)가 사용자에게 영향을 주지 않도록 일시적으로 특정 커널 버전에 고정할 수 있습니다.

커널 부트 인수의 추가 및 편집은 `bootc kargs`로 처리합니다. 자세한 내용은 [upstream 문서](https://bootc.dev/bootc/building/kernel-arguments.html)를 확인하세요.

:::info[모두 같은 Bluefin입니다]

Bluefin의 구성 요소는 모든 이미지에서 공유되므로, 별도의 "에디션"이나 "스핀"으로 생각하지 마세요. Bluefin은 모든 이미지에서 동일하게 유지되도록 노력하며, 업데이트를 얼마나 공격적으로 받을지는 "하나의 설정"이어야 한다고 생각합니다. 이상적으로는 그냥 "Bluefin"을 사용하고 업데이트 stream은 신경 쓰지 않아도 됩니다.

:::

### Stream 간 전환 {#switching-between-streams}

`ujust rebase-helper` 명령에서 rebase를 선택한 다음 원하는 stream을 고르세요:

![`ujust rebase-helper` - channel](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

또는 `date`를 선택해 이전 이미지를 고를 수도 있습니다.

![`ujust rebase-helper` - date](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### 수동으로 stream 전환하기

Bluefin은 운영체제 이미지 관리에 [`bootc`](https://bootc.dev/bootc/)를 사용합니다. 현재 배포와 스테이징된 배포를 확인하려면 다음을 실행하세요:

```sh
sudo bootc status
```

부팅된 이미지, 스테이징된 업데이트(있는 경우), 롤백 대상이 표시됩니다:

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

`ghcr.io/projectbluefin/bluefin:stable` 참조는 이미지와 stream 태그를 나타냅니다. `:stable`, `:latest` 또는 날짜로 고정된 태그를 찾아보세요.

로컬에 레이어링한 패키지가 있다면 stream을 전환하기 전에 모두 제거해 기본 이미지 상태로 되돌리세요:

```sh
rpm-ostree reset
```

**팁**: Bluefin의 [릴리스 노트](https://github.com/projectbluefin/bluefin/releases)에는 릴리스마다 stream 전환 방법이 포함되어 있습니다.

stream을 옮기려면 `bootc switch` 명령을 사용하세요:

#### 수동 전환 예시

<details>

<summary>`:stable`로 전환하기. `--enforce-container-sigpolicy` 플래그는 대상 이미지의 서명 검증을 보장합니다:</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

`:testing`으로 전환하기:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

NVIDIA 하드웨어용 이미지로 전환하기:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

특정 날짜 태그에 고정하기:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

이전 배포로 롤백하기:

```sh
sudo bootc rollback
```

`skopeo inspect`로 이미지 메타데이터와 사용 가능한 태그를 조회하세요:

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

사용 가능한 모든 태그와 함께 이미지 및 커널 버전 같은 유용한 메타데이터가 표시됩니다.

자세한 내용은 [bootc 문서](https://bootc.dev/bootc/)를 확인하세요.

## 가상 사설망(VPN) {#virtual-private-networks-vpn}

[Tailscale](https://tailscale.com)은 데스크톱과 개발 용도 모두에 VPN 서비스를 제공하기 위해 기본으로 포함되어 있습니다. [Tailscale is pretty useful](https://blog.6nok.org/tailscale-is-pretty-useful/)도 참고하세요.

- [Tailscale과 Mullvad 함께 사용하기](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) - 설치 직후 바로 가장 좋은 경험을 제공합니다
- [Tailscale과 Docker 함께 사용하기](https://tailscale.com/docs/features/containers/docker) - 개발용
- [Tailscale에서 시스템 트레이 사용하기](https://tailscale.com/docs/features/client/linux-systray) - 시스템 트레이에 Tailscale 아이콘을 표시하려면 이 문서를 따르세요. `wl-clipboard`는 이미 시스템에 포함되어 있으므로 따로 설치할 필요가 없습니다.
- Tailscale의 [YouTube 채널](https://www.youtube.com/@Tailscale)에는 유용한 팁과 요령이 많이 있습니다
- 좋은 VPN 제공업체는 Network Manager로 바로 가져올 수 있는 WireGuard 구성을 제공하기도 하니, 자세한 내용은 각 제공업체의 문서를 확인하세요:
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

Flathub에도 좋은 경험을 제공하는 VPN 제공업체가 있습니다:

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([후원하기](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN 클라이언트](https://flathub.org/apps/com.protonvpn.www) - Flathub에서 사용 가능

여기에서 언급하지 않은 다른 VPN 제공업체는 패키징 품질이 떨어질 수 있어 권장하지 않습니다. 사용 중인 VPN 제공업체가 여기에 해당한다면 WireGuard 구성을 내보낸 뒤 수동으로 가져오는 것이 가장 좋은 방법일 수 있습니다.

## 로컬 레이어링 {#local-layering}

Bluefin에서는 호스트 이미지에 패키지를 직접 추가하는 것을 권장하지 않습니다. 운영체제는 `bootc`로 관리되는 OCI 이미지로서 깨끗하고 재현 가능하게 유지되도록 설계되었습니다.

작업 환경은 컨테이너(Distrobox 또는 Devcontainers), Homebrew로 설치한 CLI 도구, Flathub에서 설치한 그래픽 애플리케이션으로 분리해야 합니다.

호스트에 패키지를 임시로 레이어링해야 한다면:

```sh
rpm-ostree install <package>
```

레이어링한 패키지를 모두 제거하고 순수한 기본 이미지로 돌아가려면:

```sh
rpm-ostree reset
```

적용하려면 재부팅하세요.

| 권장 대안            | 호스트 레이어링을 피할 항목 |
| -------------------- | --------------------------- |
| Flatpak 앱           | 그래픽 데스크톱 앱          |
| Homebrew CLI 도구    | 호스트 유틸리티             |
| Distrobox / 컨테이너 | 개발자 런타임               |

## 시스템 기본값 재정의 {#overwriting-system-defaults}

Bluefin의 시스템 기본값은 Fedora 구성과 함께 기본 이미지의 `/usr/etc`에 포함되어 배포됩니다. 대부분은 `/etc`에 파일을 두어 재정의할 수 있습니다.

예를 들어 Distrobox 구성은 `/usr/etc/distrobox/distrobox.ini`에 있습니다. 사용자 정의 옵션은 `/etc/distrobox/distrobox.ini`에 두면 됩니다. 원본 파일을 복사해 두고 수정해야 하는 경우에 유용합니다.

구성 옵션에 대한 자세한 내용은 [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/)을 확인하세요. 특히 `~/.local`과 `~/.config`를 참고하세요.

## 커뮤니티 별칭 및 우회 방법 {#community-aliases-and-workarounds}

Bluefin에서는 [just](https://just.systems)를 작업 실행기(task runner)로 사용합니다. 여기에 포함된 명령은 대부분 커뮤니티에서 만든 편의용 별칭이거나, 일부 작업이나 초기 설정을 자동화하는 좀 더 복잡한 스크립트입니다. 시스템 명령은 `ujust`라는 별칭으로 제공되므로 다른 프로젝트에서는 `just` 자체를 그대로 사용할 수 있습니다.

### ujust 시작하기 {#getting-started-with-ujust}

- `ujust --choose` - 모든 명령과, 선택했을 때 실행되는 스크립트를 보여줍니다. 사용 가능한 명령을 둘러보는 데 유용합니다
- `ujust -n $command` - `-n`은 명령을 드라이런(dry-run) 모드로 실행하므로, 실제로 어떤 명령이 실행되는지 확인하는 데 유용합니다

:::tip

팁: 자신만의 작업과 별칭을 `~/.Justfile`에 보관하고, 프로젝트 루트에도 Justfile을 두면 자주 하는 작업을 자동화하기 편리합니다. [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads)의 예시를 확인하세요.

:::

### 엄선된 도구 묶음 {#curated-tool-bundles}

Bluefin에는 엄선된 CLI 도구 모음이 포함되어 있습니다. 다음 명령은 Homebrew로 이 도구 모음을 설치합니다:

| 명령                | 설명                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | 최신 CLI 도구: atuin, bat, chezmoi, direnv, eza, fd, gh, glab, ripgrep, starship, tealdeer, television, zoxide 등 |

### 시스템 명령 {#system-commands}

| 명령                           | 설명                                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | 시스템, Flatpak, brew 포뮬러를 수동으로 업데이트합니다                                                                                             |
| `ujust toggle-updates`         | 자동 시스템 업데이트를 켜거나 끕니다                                                                                                               |
| `ujust changelogs`             | 마지막 업데이트 이후 각 패키지의 변경 내역을 보여줍니다                                                                                            |
| `ujust bios`                   | PC를 재부팅하고 BIOS/UEFI로 진입합니다. 서로 다른 디스크로 듀얼 부팅하는 경우에 유용합니다                                                         |
| `ujust bios-info`              | BIOS/UEFI 정보(제조사, 제품명, 버전, 출시일)를 표시합니다                                                                                          |
| `ujust device-info`            | 상태, Flatpak 목록, 시스템 정보를 CentOS pastebin에 올리고 URL을 터미널에 출력합니다. 이 URL을 공유하면 다른 사람들이 디버깅을 도와주기 쉬워집니다 |
| `ujust rebase-helper`          | stream 전환, 다른 이미지로 rebase, 이전 버전으로 롤백을 도와주는 대화형 도우미입니다                                                               |
| `ujust clean-system`           | 사용하지 않는 컨테이너, 볼륨, Flatpak 런타임을 정리합니다                                                                                          |
| `ujust check-idle-power-draw`  | powerstat으로 시스템의 유휴 전력 소비를 측정합니다                                                                                                 |
| `ujust check-local-overrides`  | `/usr/etc`와 `/etc` 사이에 차이가 나는 파일을 보여주어 로컬 사용자 정의를 확인할 수 있게 합니다                                                    |
| `ujust logs-this-boot`         | 현재 부팅의 모든 시스템 로그 메시지를 보여줍니다                                                                                                   |
| `ujust logs-last-boot`         | 이전 부팅의 모든 시스템 로그 메시지를 보여줍니다                                                                                                   |
| `ujust enroll-secure-boot-key` | 보안 부팅(Secure Boot)용 Nvidia 드라이버 및 KMOD 서명 키를 등록합니다(비밀번호: "universalblue")                                                   |
| `ujust toggle-user-motd`       | 터미널의 오늘의 메시지(MOTD) 표시를 켜거나 끕니다                                                                                                  |
| `ujust toggle-tpm2`            | TPM을 이용한 LUKS 디스크 자동 잠금 해제를 켜거나 끕니다(선택적으로 PIN 사용 가능)                                                                  |
| `ujust toggle-iwd`             | Wi-Fi 네트워킹에 iwd와 wpa_supplicant 중 무엇을 쓸지 전환합니다(iwd는 처리량을 높이고 지연 시간을 줄일 수 있습니다)                                |
| `ujust benchmark`              | stress-ng로 1분간 시스템 벤치마크를 실행합니다                                                                                                     |
| `ujust powerwash`              | 이 기기를 초기 상태로 공장 초기화합니다(실험적 기능)                                                                                               |

### 개발자 경험 명령 {#developer-experience-commands}

| 명령                   | 설명                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ujust devmode`        | Bluefin과 개발자 경험(bluefin-dx) 사이를 전환합니다                                                             |
| `ujust dx-group`       | 개발에 필요한 모든 권한을 위해 사용자를 docker, incus-admin, libvirt, dialout 그룹에 추가합니다                 |
| `ujust bluefin-cli`    | 최신 도구(atuin, bat, eza, fd, ripgrep, starship, zoxide 등)로 구성된 Bluefin의 엄선된 명령줄 환경을 설치합니다 |
| `ujust toggle-devmode` | `ujust devmode`의 별칭입니다                                                                                    |

### 애플리케이션 설치 명령 {#application-installation-commands}

| 명령                                  | 설명                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`             | JetBrains IDE 관리를 위한 [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/)를 설치합니다    |
| `ujust install-opentabletdriver`      | 오픈 소스 태블릿 드라이버인 [OpenTabletDriver](https://opentabletdriver.net/)를 설치하거나 제거합니다 |
| `ujust install-system-flatpaks`       | 기본 시스템 Flatpak을 설치합니다(rebase 후에 유용합니다)                                              |
| `ujust install-system-flatpaks-extra` | 추가로 권장하는 Flatpak 애플리케이션을 설치합니다                                                     |

일반적으로 Bluefin은 시스템 Justfile의 범위를 좁게 유지하려고 합니다. 이 명령들은 대부분 우회 방법이며 완전한 기능을 갖춘 명령이 아닙니다. 원래 해결하려던 문제의 상황에 따라 제거되거나 변경될 수 있습니다.

## 확장 기능 관리 {#managing-extensions}

Bluefin은 Matthew Jakeman의 [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)로 데스크톱 확장 기능을 관리합니다. 이 애플리케이션은 기본으로 포함되어 있으며, [Logo Menu](https://github.com/Aryan20/Logomenu)에서 열 수 있습니다(Aryan Kaushik에게 감사드립니다!).

![GNOME Extension Menu Option (opens Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

Bluefin에 기본으로 포함된 확장 기능 중 일부를 쓰고 싶지 않을 때 유용합니다.

![Extension Manager - System Extensions Highlight](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

드물게 세션이 비정상 종료되면 모든 확장 기능이 비활성화됩니다. 이런 경우 Extension Manager에서 확장 기능을 다시 모두 켜야 할 수 있습니다.

:::

## 원격 관리 {#remote-management}

:::note[도움이 필요합니다]

이 기능은 아직 완성되지 않았으며, 실현하려면 기여자가 필요합니다.

:::

Bluefin과 Aurora에는 기기 관리를 위한 Cockpit이 포함되어 있습니다. 앞으로 바로 쓸 수 있는 관리 템플릿을 더 포함하고 싶습니다. 도움을 주실 수 있다면 [이 이슈](https://github.com/projectbluefin/bluefin/issues)를 확인하세요.

## 검증 {#verification}

이 이미지는 sigstore의 [cosign](https://docs.sigstore.dev/cosign/)으로 서명됩니다. Bluefin Classic은 키 기반 서명을 사용하므로 [ublue-os/bluefin](https://github.com/ublue-os/bluefin)의 `cosign.pub` 키로 검증하세요:

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

반면 Dakota와 Utah는 키 없이(keyless) 서명됩니다. 검증 명령은 [공급망 보안](/supply-chain)을 확인하세요.
