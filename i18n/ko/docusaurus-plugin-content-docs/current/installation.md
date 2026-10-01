---
title: 설치
slug: /installation
---

# 설치 런북

성공적으로 설치를 마치려면 Bluefin 설치를 여러 단계로 계획하여 흔한 함정과 제대로 지원되지 않는 구성을 피하는 것이 좋습니다. Linux 친화적인 하드웨어에서는 설치 과정으로 부팅해 권장 설치 프로그램 기본값을 그대로 클릭하는 것만으로 보통 충분합니다. 하지만 지나치게 안심할 수는 없습니다. 필요할 경우를 대비해 자세한 내용을 여기 정리했습니다.

:::info[💙 사랑하는 사람을 이 페이지로 보내지 마세요 💙]

이 런북은 다른 사람을 위해 Bluefin을 설치하는 숙련된 사용자를 위한 것입니다. 고급 기술 수준을 전제로 합니다. 최대한 몰입하려면 [좋은 플레이리스트](/music)를 고르는 것도 잊지 마세요.

:::

이 페이지는 Bluefin 설치 과정을 위한 짧은 [런북](https://www.pagerduty.com/resources/learn/what-is-a-runbook/)입니다. 랩터의 공격에 대비해 생존하려면 이 문서를 처음부터 끝까지 읽으세요.

## 지원 등급

Bluefin은 Linux 개발의 최신 기술을 따르도록 의도적으로 설계되었으며, 프로젝트는 사용자가 성공할 최선의 기회를 제공하기 위해 "황금 경로"를 최적화합니다. 하지만 때로는 운이 좋을 수도(또는 나쁠 수도) 있습니다. 이 섹션은 Homebrew의 [지원 등급](https://docs.brew.sh/Support-Tiers)에서 영감을 받았습니다. 모든 구성이 지원되지는 않습니다. 간단한 안내는 다음과 같습니다:

### Tier 1 - 최고의 경험

Tier 1 구성은 완전히 지원되는 것으로 간주됩니다. 이러한 구성은 가장 높은 수준의 지원을 받고 우선순위가 부여됩니다.

#### 요구 사항

- Linux 친화적인 하드웨어(외부 커널 모듈 불필요)
  - Linux 노트북 벤더는 이 등급에 포함될 수도 있고 아닐 수도 있습니다.
  - "우리 하드웨어는 업스트림 Linux 커널에서 완전히 지원됩니다" ← 좋음
  - "우리는 Ubuntu 24.04만 지원합니다" ← 아마 좋지 않음
- 최신 Linux용으로 패키징된 소프트웨어(데스크톱 앱은 Flatpak, 개발은 컨테이너 등)

#### 사용자가 기대할 수 있는 것

- 가장 안정적이고 의도된 Bluefin 경험

**권장:** Bluefin

### Tier 2 - 아마 괜찮을 것입니다

Tier 2 구성은 완전히 지원되지 않으며 하드웨어나 소프트웨어 선택으로 인한 타협이 있을 수 있습니다.
대체로 동작하지만 설치 후 구성이 필요할 수 있습니다. 일부는 잘 동작하지만, 소프트웨어가 벤더에 의해 제공되어 팀이 제어할 수 없는 경우(예: Nvidia 드라이버) 여기에 분류됩니다.

#### 요구 사항

- 데스크톱의 NVidia GPU
- 일부 Linux 노트북 벤더가 이 등급에 포함될 수 있습니다.
  - 커널 지원은 좋지만 팬 컨트롤러나 다른 구성 요소를 위한 외부 모듈이 필요할 수 있습니다
- 문서에 다루지 않은 로컬 레이어링 패키지 또는 기타 소프트웨어 구성
- ARM/aarch64 하드웨어 - 핵심 팀은 이 하드웨어에 접근할 수 없지만 커뮤니티를 위해 이미지를 생성합니다

#### 사용자가 기대할 수 있는 것

- 불안정한 업그레이드와 수동 시스템 유지보수
  - 팀은 일반적으로 테스트 시 이러한 구성을 고려하지 않습니다.
- 일상적으로는 대체로 잘 동작함

**권장:** Bluefin을 시도해 보고 어떻게 동작하는지 확인하세요. 어떤 사람들은 커스텀 이미지를 만들며, 조사가 필요할 수 있습니다.

### Tier 3 - 누가 알겠습니까?

Tier 3는 대부분 지원되지 않습니다. 완벽하게 동작할 수도 있고 재앙일 수도 있습니다.

#### 요구 사항

- 알려진 문제성 하드웨어(Asus 및 Apple 노트북). T2 보안 칩이 있는 2018–2020년 Intel Mac은 커뮤니티 [T2 Mac 설치 가이드](/t2-mac)를 참고하세요.
- Nvidia 하드웨어가 있는 듀얼 GPU 노트북
- 구식의 "이거 잘 되면 좋겠네요!" 패키징 형식
  - .run 파일, tarball, Appimage
  - 소프트웨어가 DKMS를 요구하는 모든 경우
- 일반적으로 특이한 하드웨어 - 경우에 따라 Tier 3 설치는 자랑거리로 쓰일 수 있습니다.

#### 사용자가 기대할 수 있는 것

- 불안정한 업그레이드와 수동 시스템 유지보수
  - 팀은 일반적으로 테스트 시 이러한 구성을 고려하지 않습니다.
- "불안정한 지원" - 무선이 때때로 동작하지 않거나, 일시 중지/재개 문제 등이 발생할 수 있습니다.

**권장:** Ubuntu 또는 커스텀 이미지.

## 시스템 요구 사항

Bluefin을 설치하기 전에 다음 사항을 검토하세요:

- 설치 미디어를 만들려면 [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer)를 사용하세요. 다른 생성 방법은 제대로 동작하지 않을 수 있습니다
  - Ventoy 사용은 **지원되지 않습니다**
- 구형 BIOS 기반 시스템은 **지원되지 않으며**, UEFI 시스템만 지원됩니다
- 같은 디스크에서의 듀얼 부팅은 **지원되지 않습니다**. 다른 운영체제를 위해 전용 드라이브를 사용하고 BIOS에서 부팅할 다른 OS를 선택하세요
  - 완전히 전환하기 전에 베어 메탈에서 사용해 보고 싶다면 Bluefin은 [외부 드라이브 설치](#alternative-bluefin-to-go-external-drive)를 지원합니다
- 설치 중 자동 파티셔닝을 **강력히 권장**합니다. 다중 디스크 시스템이 아니라면 수동 파티셔닝은 불필요합니다
- 기본 Bluefin 설치는 약 12.4 GB(개발자 모드 활성화 시 약 17.4 GB)입니다

### 빠른 참조

| 구성 요소  | 최소                           | 권장                                          |
| ---------- | ------------------------------ | --------------------------------------------- |
| **CPU**    | 64비트 x86_64                  | 지출할 수 있는 만큼                           |
| **RAM**    | 16 GB                          | 32 GB+ / ZFS를 사용한다면 지출할 수 있는 만큼 |
| **저장소** | 128 GB(SSD만, HDD는 너무 느림) | 지출할 수 있는 만큼                           |
| **그래픽** | 최신 Intel/AMD GPU             | Nvidia Maxwell 및 그 이전을 제외한 최신 GPU   |
| **부팅**   | UEFI(BIOS 미지원)              | Secure Boot를 사용하는 UEFI                   |

### 디스크 사용량

다음은 각 Bluefin 이미지가 기본적으로 사용하는 디스크 공간이며, 제거할 수 있는 flatpak 애플리케이션이 포함된 수치입니다:

#### Bluefin

약 12.4 GB / 개발자 모드 활성화 시 약 17.4 GB

### 왜 최소 16 GB RAM인가요?

Bluefin은 광범위한 클라우드 네이티브 개발 스택을 제공합니다. 이러한 워크로드는 일반적으로 컴퓨터 클러스터 전체를 복제하도록 확장되며 일반적인 워크로드보다 더 많은 리소스를 요구합니다.

_이러한 요구 사항은 Bluefin의 통합 개발 워크플로와 컨테이너 우선 아키텍처가 원활하게 동작하도록 보장합니다._

## 대안: Bluefin to Go(외부 드라이브) {#alternative-bluefin-to-go-external-drive}

외부 드라이브에 Bluefin을 설치하여 휴대 가능한 Bluefin 설치를 만들 수 있습니다:

![bluefin-drive](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**설치 중 전체 디스크 암호화를 선택하는 것을 잊지 마세요!**

사용 사례:

- Linux를 사용해 보는 좋은 방법입니다. 마음에 들면 재설치 없이 드라이브를 본체에 옮기면 됩니다.
- 또는 PC용 새 드라이브를 사고 기존 OS를 외장 케이스에 넣어 백업으로 보관합니다.
- 구매 전에 하드웨어를 사용해 보거나 기계를 임시로 다른 용도로 활용합니다.
- Linux 때문에 다투지 않고 PC를 공유합니다.
- 홈랩 및 휴대용 개발 환경.
- 도킹된 [Bazzite 기반](https://bazzite.gg) 핸드헬드에 Bluefin DX 드라이브 추가.

### Windows to Go

반대 방향도 가능합니다. [Rufus](https://rufus.ie)를 사용해 펌웨어 업데이트나 드물게 필요한 Windows 전용 소프트웨어를 위해 외부 드라이브에 [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go) 모드로 Windows를 설치할 수 있습니다.

## Day 0: 계획

대부분의 문제점은 미리 계획하면 직접 해결할 수 있습니다. "Day"라는 용어는 추상적 표현이니 Bluefin을 사흘에 걸쳐 설치하지는 마세요. 일반적으로 설치는 약 20분이면 끝납니다.

### 모든 사용자

- 하드웨어가 Linux 친화적인가요?
  - (해당되는 경우) Nvidia GPU 사용의 한계를 이해하고 있나요?
    - Nvidia Optimus 노트북은 특히 문제가 되기 쉬운 경향이 있습니다
  - 하드웨어가 트리 외부(out-of-tree) 커널 모듈을 요구하나요? 이는 장기적 유지보수 문제로 이어질 수 있습니다
  - 사용하는 소프트웨어가 트리 외부 커널 모듈을 요구하나요?
    - VirtualBox와 VMware는 지원되지 않습니다
    - Nvidia, Xbox One 컨트롤러 지원, wl 드라이버, v4l2loopback은 지원됩니다("최선의 노력" 방식이며, 경우에 따라 Linux 커널의 최신 버전에서 깨지는 타사 소프트웨어를 우리가 제어할 수 없습니다)
    - [openzfs](https://github.com/openzfs/zfs)는 기본으로 포함됩니다. 유지관리자가 정기적으로 사용하며 아직 Bluefin이 제공하는 커널보다 뒤처진 적이 없습니다. 하지만 트리 외부 커널 모듈이므로 여전히 보장할 수 없습니다
  - 무선 카드가 Linux에서 지원되나요?
    - 지원이 부족한 카드로는 Broadcom이 있습니다
    - 확실하지 않다면 [USB-Wifi](https://github.com/morrownr/USB-WiFi)를 확인하세요
  - 프린터/스캐너가 Linux에서 잘 지원되나요?
    - [드라이버 없는 프린터](https://openprinting.github.io/printers/)를 강력히 권장하며, 모든 프린터가 동작한다고 보장할 수는 없습니다
    - [스캐너 지원](http://www.sane-project.org/sane-mfgs.html)
- 장치의 BIOS/UEFI가 최신인가요?
- 설치 전에 모든 하드웨어 펌웨어 업데이트를 완료하고 최신 상태로 유지할 것을 권장합니다
- 의존하는 애플리케이션이 Flathub에서 잘 지원되나요?
- VPN 제공자가 Network Manager에 가져올 wireguard 구성을 제공하나요?
- 전용 디스크가 준비되었나요?
  - Bluefin은 같은 디스크에서의 듀얼 부팅을 지원하지 않습니다
  - Bluefin은 기존 Fedora 설치에서의 리베이스를 지원하지 않습니다
- 이것이 Fedora 기반 커스텀 이미지이며 Ubuntu LTS 같은 것에 비해 빠르게 움직인다는 점을 기억하세요
- 이 문서를 처음부터 끝까지 읽으세요. 관련 업스트림 문서는 다음과 같습니다:
  - [Homebrew](https://docs.brew.sh/)([후원](https://github.com/Homebrew/brew#donations))
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### 개발자

- 개발을 위해 [컨테이너를 사용하는 방법](https://docker-curriculum.com/#introduction)을 알고 있나요?
- 시스템과 사용자 계정 모두에 대해 [systemd 서비스 유닛](https://systemd.io/)을 관리하는 방법을 알고 있나요?

## Day 1: 배포와 구성

### 배포

:::info[Bluefin 다운로드]

[웹사이트](https://projectbluefin.io/#scene-picker)에서 올바른 ISO를 다운로드하세요

:::

- 운영체제 설치
  - 자동 파티셔닝으로 전체 디스크 사용
  - (선택): [Secure Boot 설정](#secure-boot)
  - (선택): `ujust rebase-helper`로 `:stable` 또는 `:testing`으로 이동
- 백업 설정, 테스트, **검증** - 시스템 이미지는 재현 가능한 데이터지만 홈 폴더의 사용자 데이터는 여전히 백업해야 합니다. Bluefin은 선호도에 따라 두 가지 백업 유틸리티를 제공합니다. Flatpak으로 설치되므로 사용하지 않는 하나는 제거할 수 있습니다. 명령줄 도구를 선호한다면 `rclone`([후원](https://github.com/sponsors/rclone))과 `restic`([후원](https://github.com/sponsors/restic))도 미리 설치되어 있습니다
  - [Deja Dup](https://apps.gnome.org/DejaDup/)([후원](https://liberapay.com/DejaDup))
  - [Pika Backup](https://apps.gnome.org/PikaBackup/)([후원](https://opencollective.com/pika-backup))
  - 구성으로 넘어가기 _전에_ 백업이 제대로 동작하는지 확인하세요

### 구성

나머지 단계는 사용자별 구성이며 우리가 여러분에게 맡기는 편입니다. 이 단계를 자동화하려면 dotfile 구성과 동기화에 [chezmoi](https://www.chezmoi.io/) 같은 도구를 사용하는 것이 좋습니다: `brew install chezmoi`

사용자 공간은 모두 홈 디렉터리에 있으므로 이 단계를 자동화하는 데 사용하는 모든 도구가 예상대로 동작할 것입니다. 이상적으로는 과거에 시스템 수준에서 했을 구성을 이제 사용자 수준에서 구성하여 사용자 구성과 시스템 이미지가 깔끔하게 분리됩니다.

- 소프트웨어 설치
  - Bazaar 스토어를 사용해 애플리케이션 설치
  - (선택): `brew`를 통해 명령줄 애플리케이션 설치
- 설치 후 구성
  - 원하는 대로 기본 애플리케이션 선택/변경
  - (선택) [`wg-quick`을 통해 wireguard 구성 가져오기](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) 또는 네트워크 관리자 GUI에서 VPN 구성 사용
- (선택) 개발자 구성
  - `ujust devmode`를 실행하고 안내를 따르세요
  - VSCode를 시작하고 설정과 확장을 구성하세요

## Day 2: 운영과 유지보수

Bluefin은 유지보수를 최대한 간단하게 만들고자 노력하지만, 많은 자동화 작업을 수동으로 실행할 수도 있습니다.

- 메뉴 옵션이나 `ujust update`로 시스템 업그레이드를 실행하여 업데이트와 재부팅 과정을 확인하세요
  - `ujust changelogs`는 Fedora에서 들어오는 변경 사항과 업데이트를 보여줍니다
  - `ujust bios`는 머신을 재부팅하고 BIOS/UEFI 메뉴로 들어갑니다. Windows 드라이브로 부팅할 때 유용합니다
- [블로그](/blog) 구독
- [리베이스 및 롤백 절차](/administration#switching-between-streams) 이해
- [Warehouse 애플리케이션](https://github.com/flattool/warehouse)을 사용해 Flatpak 수명 주기 관리:
  - 이전 버전으로 고정하거나 롤백
  - 애플리케이션을 한 번에 쉽게 제거
- `ujust clean-system`으로 오래된 컨테이너와 사용하지 않는 flatpak 런타임 정리

그리고 한 가지 더: Day 0에 더 많이 투자할수록 Day 1이 더 순조로워지고, 결과적으로 Day 2는 더욱 순조로워집니다. 그 이후는 모두 자랑거리입니다. `fastfetch`([후원](https://github.com/sponsors/LinusDierheimer)) 명령이 여러분의 이정표를 상기시켜 줄 것입니다:

![image](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot

Secure Boot는 기본적으로 지원되며 추가 보안 계층을 제공합니다.

Universal Blue는 [자체 키](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der)로 secure boot를 지원합니다.

설치가 완료된 후 첫 부팅 중에 [mokutil UEFI 메뉴 UI](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot)(_QWERTY_ 키보드 입력 및 탐색)를 사용하여 secure boot 키를 등록하라는 메시지가 표시됩니다.

**Enroll MOK**를 선택하고 비밀번호로 `universalblue`를 입력하세요.

초기 설정 중에 이 단계를 완료하지 않았다면 터미널에서 다음 명령을 실행하여 수동으로 키를 등록할 수 있습니다:

```sh
ujust enroll-secure-boot-key
```

설치나 리베이스 전에 이 키를 등록하고 싶다면 키를 다운로드하고 다음을 실행하세요:

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

`mokutil --list-enrolled`를 사용하여 "ublue kernel" 키가 나열되어 있는지 확인할 수 있습니다:

![image](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
`ublue akmods`가 나열되어 있다면 곧 제거될 예정인 이전 키입니다. `ublue kernel`이 현재 키입니다.
:::

Lenovo ThinkPad 사용자(P, T, X 시리즈): Secure Boot를 활성화하기 전에 BIOS(F1) → Security → Secure Boot로 이동하여 "Allow Microsoft 3rd party UEFI CA"를 활성화하세요. Fedora의 서명된 shim 부트로더가 펌웨어에 의해 인식되려면 이 설정이 필요합니다. 이 설정이 없으면 Secure Boot가 위반 오류와 함께 실패합니다.
