---
title: Bluefin에 오신 것을 환영합니다
slug: /
pagination_next: downloads
---

# Bluefin에 오신 것을 환영합니다

최종 사용자에게는 Chromebook만큼 안정적이고 유지 관리 시간이 거의 필요 없는 시스템을, 동시에 개발자에게는 강력한 [클라우드 네이티브 개발 모드](/bluefin-dx)를 제공합니다. 자신의 컴퓨터로 일을 해내야 하는 사람들을 위해 차세대 기술로 만들어졌습니다.

![Bluefin 데스크톱 스크린샷](/img/bluefin-hero.webp)

## Bluefin은 당신을 위한 것인가요?

Bluefin은 점진적 개선을 지향하는 차세대 Linux 데스크톱입니다. 가능한 한 최선의 경험을 제공하기 위해, 우리는 레거시 기술에서 엄격하고 적극적으로 멀어집니다.

:::tip

Bluefin이 개발자나 경험 많은 Linux 사용자에게 가장 잘 맞는다는 말도 할 수 있지만, 매우 안정적이고 기본 상태로 훌륭하게 구성된다는 점에서 새로운 사용자에게도 그에 못지않은 후보라고 생각합니다.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin은 다음과 같습니다:

- **Flatpak First** - Bluefin의 애플리케이션 모델은 Flathub에서 관리되는 격리된 앱을 중심으로 합니다. Wayland, Pipewire, Flatpak Portals 등 현대적인 구성 요소와 잘 맞지 않는 애플리케이션은 나쁜 경험을 제공할 수 있으므로 권장하지 않습니다.
- **의도적으로 보이지 않는** - Bluefin은 배포판이 아닙니다. 사용자가 실제로 관계를 맺는 대상은 Flathub, homebrew, 그리고 컨테이너에 직접 넣은 것들과의 관계입니다.
- **96%를 위한 최적화** - 4%가 아니라 - Bluefin은 기능에 대해 "함께라서 더 강해진다"는 접근을 취합니다. 사용자는 언제든 원하는 것을 할 수 있지만, 가치는 최선의 실습을 공유하는 데서 나옵니다. 우리는 경계 사례에 시간을 많이 쓰지 않습니다.
- **검증된 개발 모델** - 컨테이너를 중심으로 한 개발자 경험과, 새로운 Linux 사용자를 [클라우드 네이티브에서 사용되는 도구](https://www.cncf.io/)에 노출시키는 것입니다. 자세한 내용은 [미션 스테이트먼트](/mission)와 [가치](/values) 페이지를 참고하세요.
- **의도적으로 뛰어난 하드웨어에 집중** - Bluefin은 가능한 한 많은 레거시 없는 경험을 사용자에게 제공하기 위해 Linux 친화적인 하드웨어에서 가장 잘 동작합니다. Bluefin은 Linux 노트북과 데스크톱을 판매하는 OEM도 지원하고자 하므로, 소프트웨어와 하드웨어의 최상의 조합으로 동작하도록 노력합니다. 사용자 경험을 해치는 일을 문서화하거나 우회 방법을 따로 찾아내지 않으므로, 어떤 경우에는 다른 운영체제를 선택하는 것이 옳을 수 있습니다.

요구 사항이 이 범위를 벗어난다면 **Bluefin은 당신에게 최적의 선택이 아닐 수 있습니다**. Bluefin은 [잘못 잡았을 때](/troubleshooting/#am-i-holding-bluefin-wrong) 불편함과 참극을 초래할 수 있습니다. 더 나은 데스크톱을 만들기 위해 전통적인 Linux 데스크톱 경험의 많은 부분은 우리와 함께 오지 않는다는 점을 인정합니다.

## 데스크톱 경험과 기능

Bluefin은 커뮤니티가 설정한 GNOME([후원](https://www.gnome.org/donate/)) 데스크톱을 제공합니다. 손대지 않고도 사용자의 길을 비켜가도록 설계되어, 사용자가 자신의 애플리케이션에 집중할 수 있게 합니다.

시스템 업데이트는 이미지 기반이며 자동입니다. 애플리케이션은 그래픽 애플리케이션에는 Flatpak을, 명령줄 애플리케이션에는 `brew`를 사용하여 논리적으로 시스템과 분리되어 있습니다.

:::tip

Bluefin은 "Fedora 기술 위에 구축된 Ubuntu 정신의 해석"입니다 — 많은 오픈소스 애호가들이 오래전부터 익숙했던 Ubuntu의 어느 시기를 향한 노골적인 회고이며, 클래식 X-Men과도 비슷합니다. 우리도 그 무드가 여기에 전해지도록 목표로 합니다. 우리를 부팅이라고 생각하시면 됩니다. 편안한 분위기.

:::

- 검수된 확장을 통합한 **Ubuntu와 유사한 GNOME 레이아웃**:
  - 익숙한 독을 위한 [Dash to Dock](https://micheleg.github.io/dash-to-dock/)
  - 오른쪽 위 모서리에 트레이 형태의 아이콘을 위한 [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator)
  - 모바일 기기를 데스크톱과 연결하기 위한 [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect)
  - 화려한 연출을 위한 [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([후원](https://github.com/sponsors/aunetx))
  - 기본적으로 <kbd>Super</kbd>-<kbd>Space</kbd>에 연결된 macOS Spotlight 유사 작업 흐름과 검색 기능을 제공하는 [Search Light](https://github.com/icedman/search-light)
- **[개발자 모드](/bluefin-dx)** - Bluefin을 강력한 클라우드 네이티브 워크스테이션으로 바꾸는 전용 개발 도구
- 컨테이너 중심 작업 흐름을 위한 **[Ptyxis 터미널](https://devsuite.app/ptyxis/)**
  - 컨테이너 관리를 위한 [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([후원](https://github.com/sponsors/ranfdev))
- VPN을 위해 **[Tailscale](https://tailscale.com)** 와 함께 `wireguard-tools` 및 systray 지원 포함
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([후원](https://github.com/sponsors/mjakeman)) 포함
- [Flathub](https://flathub.org)를 기반으로 제공되는 **[Bazaar 애플리케이션 스토어](https://github.com/kolunmi/bazaar)**:
  - 그래픽 애플리케이션을 설치하기 위한 익숙한 소프트웨어 센터 UI
  - 관리가 중단된 애플리케이션과 오래된 런타임은 목록에서 제외
  - Flatpak 관리를 위해 [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([후원](https://ko-fi.com/heliguy)) 포함
- **편의성 기능**:
  - 기본 활성화된 [Starship](https://starship.rs) 터미널 프롬프트
  - `libratbagd`와 함께 Logitech 마우스를 위한 [Solaar](https://github.com/pwr-Solaar/Solaar)
  - 클라우드 스토리지 마운트와 현대적인 파일 백업을 위한 [rclone](https://rclone.org/overview/) 및 [restic](https://restic.net/)
  - 선택 셸로 `zsh`와 `fish` 포함
  - 듀얼 GPU 노트북을 위한 [Switcheroo 지원](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com)
- **Universal Blue 기반**:
  - 게임 컨트롤러와 기타 하드웨어를 위한 추가 udev 규칙 기본 제공
  - 모든 멀티미디어 코덱 포함
  - 단계적 자동 업데이트: 컴퓨터를 평소처럼 사용하다가 작업이 끝나면 그대로 꺼 두세요

## Distroless 중심 설계

Bluefin은 사용자 정의 애플리케이션 대신 업스트림 도구를 기본으로 제공합니다. "배포판 앱 스토어"라는 아이디어는 데스크톱 애플리케이션 개발자에게 지속 가능하지 않음이 드러났으므로, Bluefin은 대신 [Bazaar](https://github.com/kolunmi/bazaar)와 [Homebrew](https://brew.sh)와 같은 도구를 제공합니다. 작업 흐름은 배포판에 구애받지 않을 뿐 아니라 운영체제에도 구애받지 않습니다.

:::info[이것은 크로스 플랫폼 세계입니다]

Bluefin의 작업 흐름은 의도적으로 업스트림을 지향합니다 — Windows의 WSL, Mac의 Podman/Docker, 어떤 Linux 시스템이든 누구에게나 일관된 Linux 경험을 제공한다고 믿기 때문입니다. [클라우드 네이티브 생태계](http://cncf.io)는 이 모델이 동작함을 증명했습니다. 덕분에 수백만 명의 기존 개발자가 이미 알고 있던 작업 흐름으로 진입할 수 있고, Linux이 가장 중요한 곳에서 경쟁할 수 있게 됩니다.

:::

## 다음 단계

- **[다운로드](/downloads)** — 공식 Bluefin ISO 또는 토렌트 받기
- **[설치 런북](/installation)** — 하드웨어 계획 및 설정 단계
- **[사용자 가이드](/administration)** — 일상적인 관리, 업데이트, 앱
- **[개발자 가이드](/bluefin-dx)** — 컨테이너, devcontainer, AI 도구

[announcement 블로그 글](https://www.ypsidanger.com/announcing-project-bluefin/)에도 추가 배경 정보가 있습니다.

## 소개 영상과 팟캐스트

더 많은 정보는 [영상과 리뷰 목록](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts)을 확인하세요.

:::tip

"진화는 지속적인 분기와 확장의 과정이다."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="래프터 공룡"
  width="1120"
  height="630"
  loading="lazy"
/>
