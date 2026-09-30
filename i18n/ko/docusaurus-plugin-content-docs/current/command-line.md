---
title: 애플리케이션과 명령줄
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin은 일반인이 사용하도록 설계되었지만, 명령줄은 우리의 _**열정**_입니다. 따라서 우리는 그래픽 데스크톱 경험과 터미널 워크플로 모두에 투자합니다. 신나게 달려보세요.

## 그래픽 애플리케이션

Bluefin은 데스크톱 소프트웨어에 **Flatpak 우선** 접근 방식을 따릅니다. 애플리케이션은 호스트 운영체제와 격리되어 실행되며 [Flathub](https://flathub.org)에서 가져옵니다.

- **[Bazaar](https://github.com/kolunmi/bazaar)** — 기본 애플리케이션 스토어. 버려진 애플리케이션과 구식 Flatpak 런타임에 의존하는 애플리케이션을 걸러냅니다.
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** — Flatpak 수명 주기를 관리하고, 설치된 런타임을 검사하고, 남은 파일을 정리하고, 버전을 고정하거나 다운그레이드합니다.
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** — 세밀한 Flatpak 파일 시스템, 네트워크, 장치 접근 제어를 위한 그래픽 권한 관리자.

## 명령줄 애플리케이션과 Homebrew

[brew](https://brew.sh/)(Homebrew)는 기본 OS 이미지를 오염시키지 않고 명령줄 애플리케이션과 개발자 유틸리티를 설치하기 위한 기본 패키지 관리자입니다.

- [Homebrew 문서](https://docs.brew.sh/)
- [Homebrew 패키지](https://formulae.brew.sh/)
- [치트시트](https://devhints.io/homebrew)

Homebrew Cask 기능은 macOS 전용이며 Bluefin에서는 동작하지 않는다는 점에 유의하세요. 대신 GUI 앱에는 Flatpak을 사용합니다. [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/), [mise](https://github.com/jdx/mise) 같은 다른 도구들도 Homebrew로 설치하면 원활하게 동작합니다.

:::info[스트림을 교차하지 마세요]

일반적으로 CLI 도구나 유틸리티가 필요하면 Homebrew를 사용하세요. 개발 작업용 라이브러리와 의존성이 필요하면 컨테이너를 사용하세요. 이렇게 하면 모든 것이 깨끗하고 재현 가능하게 유지됩니다.

:::

### 오늘의 메시지와 `fastfetch`

프로젝트는 세련되었으면서도 목적을 수행하는 기능성 장식을 선호합니다. 새 터미널(<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>)은 시스템 정보와 함께 오늘의 메시지를 표시합니다:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

`bluefin-dx:beta` 줄은 OS 이미지의 이름으로, 고정된 이미지를 사용 중인지 알려주고 일반적인 명령을 빠르게 참조할 수 있게 해줍니다. `ujust toggle-user-motd`로 켜고 끌 수 있습니다.

우리는 기기를 자랑하기 좋아합니다. `fastfetch`를 실행하세요:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

이 화면은 하드웨어 정보, 사용자 이름, 머신 이름, 커널 버전을 보여줍니다. 각 Bluefin 이미지에는 해당 머신의 최초 설치를 기념하는 "Forged On" 날짜가 있습니다:

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## 터미널 구성

### 기본 터미널 셸 변경하기

Bluefin은 기본적으로 [bash](https://www.gnu.org/software/bash/)를 사용하지만, 편의를 위해 이미지에 [fish](https://fishshell.com/)([후원](https://github.com/sponsors/fish-shell))와 [zsh](https://www.zsh.org/)도 함께 제공합니다.

Bluefin은 기본 터미널로 [Ptyxis](https://devsuite.app/ptyxis/)(앱 런처에서는 `Terminal`)를 제공합니다. 시스템 전체가 아니라 [터미널 에뮬레이터를 통해 셸을 변경하는 것](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/)을 **강력히 권장**합니다. 먼저 원하는 셸을 `brew install zsh` 또는 `brew install fish`로 설치하세요. 터미널 설정을 클릭하고 프로필을 편집하세요:

![Ptyxis → 기본 설정 → 프로필 → 프로필 설정 → 편집...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

"사용자 지정 명령 사용"을 선택하고 셸을 추가하세요:

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → 기본 설정 → 프로필 → 프로필 설정 → 편집... → 셸 → 사용자 지정 명령](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## 유지관리자 권장 GNOME 확장

다음은 유지관리자가 데스크톱 경험을 완성하기 위해 권장하는 GNOME 확장입니다. 좋아하는 확장 작성자에게 후원하여 응원해 주세요!

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

Tailscale GUI의 경우 [공식 systray 애플리케이션](https://tailscale.com/docs/features/client/linux-systray)을 권장합니다: `tailscale configure systray --enable-startup=systemd` 후 재부팅하세요.

</div>

## 글꼴

Homebrew는 글꼴 설치에도 사용됩니다. [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/)를 둘러보고 좋아하는 글꼴을 `~/.local/share/fonts`에 설치하세요.

### Microsoft 글꼴

문서 호환성을 위해 Microsoft 글꼴이 필요하다면:

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
