---
title: T2 Mac에 Bluefin 설치
author: Chris Lauretano
slug: /t2-mac
---

이것은 T2 Mac에 대한 [Bluefin 설치 runbook](/installation)의 addendum으로, 최종 Intel Mac 세대(2018-2020)에 Bluefin 설치를 가능하게 하여 프로젝트의 지속가능성 목표를 지원합니다. Apple은 2024년 이후 이들에 대한 지원을 끝냅니다.

이것의 내용은 여기에서 재생성되지 않으므로 원본 [Bluefin 설치 runbook](/installation)을 읽으세요. 가능한 섹션 제목이 일치합니다.

## Day 0 - 계획

T2 Mac의 전문화된 하드웨어 요구사항과 그들의 하드웨어에서 MacOS 외의 모든 것을 대부분 지원하지 않는 Apple 때문에, Bluefin 사용에 대한 몇 가지 주요 주의사항이 있습니다. 당신의 개인적 사용 사례를 고려하세요, 이것들은 Mac Mini나 Docked 노트북에서는 문제가 아닐 수 있지만, 매우 모바일인 시나리오에서 frustrate할 수 있습니다.

### 모든 사용자

- 당신의 하드웨어가 Linux 친화적인가요?
  - 아닙니다! MacBook Pro의 키보드와 trackpad조차도 mainline linux 커널에서 동작하지 않습니다. 가장 비친화적인 것 중 하나이며, 가장 소유한 x86 노트북입니다. 그러나 동작합니다. Bluefin이 fsync 커널로 전환한 이후로, 필요한 patches는 이미 존재합니다.
  - sleep/suspend는 최근 Apple firmware 업데이트(2023년 후반)에서 깨졌고 여전히 깨져 있습니다.
- 당신의 무선 카드가 Linux에 지원되나요?
  - 물론 아닙니다, Apple은 Broadcom를 사용했습니다. 펌웨어는 최종 사용자가 직접 설치할 수 없으므로, 펌웨어 파일을 이미지에 포함하는 Bluefin의 개인 또는 커뮤니티 이미지로 rebasing이 필요합니다. 미래에는, 이것은 Surface/Asus와 같은 맞춤 이미지로 패키징될 수 있습니다.

## Day 1 - 배포 및 구성

### 배포

1. [Project Bluefin](https://projectbluefin.io/)의 표준 Laptop 이미지를 다운로드하는 것으로 시작하세요.

:::note[Dual-boot 지원]

설치 소프트웨어인 Anaconda는 Bluefin이 사용하는 것이 OCI 배포를 위한 dualboot를 지원하지 않으므로, MacOS가 필요 없는 Mac에 또는 USB/Thunderbolt SSD에 설치하세요.

:::

#### Bluefin USB 만들기

dd, [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/), 또는 유사한 것을 사용합니다.

#### Bluefin 설치

:::note[이것은 미치광입니다]

T2에서 Bluefin을 설치하고 부팅할 때 외부 키보드와 마우스가 필요합니다. 이것은 암호화된 디스크를 잠금 해제할 때까지입니다 (나중에 명령을 실행할 때까지).

:::

1. Mac을 끌 때, 외부 키보드와 마우스를 연결하고 Bluefin USB를 삽입하세요
2. option(Windows 키보드에서 alt)을 누른 채 Mac의 전원을 켜세요.
3. boot 메뉴에서 "EFI Boot"를 선택하세요 (USB 아이콘이 있을 것입니다). Continue를 클릭하세요.
4. Fedora installer boot 화면에서, 설치 전에 미디어를 테스트할지 선택하세요.
5. installer가 시작되면, main 메뉴로 가기 위해 사용할 언어를 선택하세요.
6. main installer 메뉴에서, Installation Destination을 선택하여 설치 디스크를 선택하세요. 자동 파티셔닝을 사용하세요. 외장 드라이브를 사용하면, 내부 드라이브도 선택되지 않았는지 확인하세요 (체크박스로), 이것이 당신의 내부 드라이브의 MacOS EFI bootloader를 수정하게 할 수 있습니다.
   > 암호화를 사용하면, post-install 명령을 실행할 때까지 부팅할 때마다 외부 키보드가 필요합니다.
7. 모든 prerequisite가 설정되면, 설치로 진행하세요. 여기에 많은 상세한 progress가 표시되지 않지만, 다른 TTY로 전환하고 tmux([Donate](https://github.com/sponsors/tmux))를 사용한다면, 많은 logging이 일어나고 있습니다. 설치는 그리 오래 걸리지 않습니다 (빈 Mac을 internet recovery 모드로 얻는 것보다 빠릅니다).
8. Finish Installation을 클릭한 후 새로운 Bluefin 설치를 재부팅하세요!

### T2에 대한 구성 (필수)

:::note

wifi/bluetooth 펌웨어가 패키지를 통해 layer될 수 없음을 참고하세요. 전통적인 시스템에서는 펌웨어를 [MacOS 설치에서 추출할 수 있습니다 (T2Linux Wiki)](https://wiki.t2linux.org/guides/wifi-bluetooth/#on-linux), 그러나 Bluefin에서는 이러한 파일을 custom 이미지의 containerfile layer 또는 스크립트로 가져와야 합니다.

:::

:::note

suspend/sleep이 대부분의 경우 동작하지 않으며, Mac의 펌웨어 버전이 v13.5 이상인 경우 참고하세요. 다양한 workarounds가 있습니다.

:::

여기서 결정할 선택이 있습니다. wifi/bluetooth 펌웨어가 필요하다면, custom 또는 커뮤니티 T2 전용 Bluefin 이미지로 rebasing이 필요합니다. 아니라면, 여러 패키지를 layer하여 T2 전용 이미지와 같은 경험을 얻을 수 있습니다. 아래 표와 아래 단계에서 분해와 단계를 확인하세요.

|                         | T2-특정 Bluefin 이미지 | Layer된 패키지                 | Bluefin                                      |
| ----------------------- | ---------------------- | ------------------------------ | -------------------------------------------- |
| T2-Patched 커널         | **yes, fsync**         | base 이미지가 fsync를 사용하면 | **yes, fsync on latest, fsync-ba on stable** |
| 내부 키보드와 Trackpad  | **yes**                | **yes**                        | **yes**                                      |
| Touchbar                | **yes**                | 가능                           | no                                           |
| T2 오디오               | **yes**                | copr를 통해 가능               | no                                           |
| Fan 제어                | **yes**                | 가능                           | no                                           |
| Hybrid Graphics         | **configurable**       | 가능                           | no                                           |
| Wifi / Bluetooth 펌웨어 | 가능                   | _no_                           | _no_                                         |
| Deep Sleep              | _no_                   | _no_                           | _no_                                         |

T2 Mac에서의 전체 Linux 하드웨어 지원에 대한 더 많은 세부 정보 (Touch ID가 동작하지 않는 등)를 확인하려면 [T2Linux Wiki](https://wiki.t2linux.org)를 확인하세요.

#### T2-특정 Bluefin 이미지로 Rebasing

Mac을 위한 필요한 broadcom wifi/bluetooth 펌웨어를 포함하는 Bluefin의 이미지를 만들 수 있습니다. 현재, Bluefin 팬의 커뮤니티 프로젝트인 [T2-Atomic](https://github.com/lauretano/t2-atomic)이 모든 T2-enablement 조각이 갖춰진 Bluefin/Aurora 이미지를 게시합니다. 이것을 자원으로 사용하여자신의 이미지를 자유롭게 사용하세요.

##### 커뮤니티 이미지:

- [T2-Atomic](https://github.com/lauretano/t2-atomic) - 이미지는 예약된 Bluefin 빌드 직후 매일 동기화되어 빌드됩니다. 아래 rebase 명령에 주어진 문자열을 복사/붙여넣으세요:
  - lauretano/t2-atomic-bluefin:latest
  - lauretano/t2-atomic-bluefin-dx:latest
  - lauretano/t2-atomic-aurora:latest
  - lauretano/t2-atomic-aurora-dx:latest

이 이미지로 rebasing하려면, Silverblue에서 Bluefin으로 rebasing과 유사하게, 먼저 unsigned 이미지로 rebasing한 후 다시 signed 이미지로 rebasing이 필요합니다.

1. unsigned 이미지로 rebasing하고, "[repo/bluefin-package:tag]"를 당신의 선택 또는 생성의 repo와 이미지 variant로 대체하세요:

`sudo bootc switch ghcr.io/[repo/bluefin-package:tag]`

2. 재부팅 `systemctl reboot`

3. signed 이미지로 rebasing하고, 다시 "[repo/bluefin-package:tag]"를 당신의 선택의 repo와 이미지 variant로 대체하세요:

`sudo bootc switch ghcr.io/[repo/bluefin-package:tag] --enforce-container-sigpolicy`

다른 이미지 (Sway, Cosmic, vanilla Silverblue)에 대한 [T2-Atomic](https://github.com/lauretano/t2-atomic) readme를 확인하세요.

#### 수동 설치 (패키지 Layering)

터미널에서, T2를 실행하는 데 필요한 여러 패키지를 설치하고 몇몇 daemons을 활성화할 것입니다. touchbar 관리를 위해 t2fanrd rust-tiny-dfr를 설치하고, 기본 T2 오디오 지원을 위해 t2linux-audio를 설치합니다.

1. SharpenedBlade's T2Linux copr 설치: `sudo curl -o /etc/yum.repos.d/sharpenedblade-t2linux-fedora-43.repo https://copr.fedorainfracloud.org/coprs/sharpenedblade/t2linux/repo/fedora-43/sharpenedblade-t2linux-fedora-43.repo`

2. T2-특정 패키지 설치: `sudo dnf install t2fanrd rust-tiny-dfr t2linux-audio` 그리고 요청될 때 재부팅하세요.

3. 재부팅 후, `systemctl status t2fanrd`로 t2fanrd가 실행되는지 확인하세요. Fan speed 곡선은 `/etc/t2fanrd.conf`를 편집하여 관리할 수 있습니다. 세부 정보는 [T2FanRD](https://github.com/GnomedDev/T2FanRD)를 확인하세요.

4. T2-적용 커널 인수를 활성화하세요.
   터미널에서, 실행하세요: `sudo bootc kargs --append intel_iommu=on --append iommu=pt --append mem_sleep_default=s2idle` 그리고 요청될 때 재부팅하세요.

### Day 2-3 T2에 대한 설치 후 세련화

#### 초기 부팅 동안 내부 키보드 허용 (LUKS 암호화 잠금 해제)

initramfs 재생성을 활성화하세요. 이것은 upgrade 동안 dracut이 실행되어 apple-bce 모듈을 초기 부팅에서 로드하도록 구성할 것입니다. `sudo bootc initramfs --enable` --initramfs 생성은 이미지 업데이트 동안 로컬 CPU 시간을 추가합니다.

- T2 패키지를 layer한다면, apple-bce 모듈을 로드하는 config 파일을 만드세요: `echo "force_drivers+=\" apple-bce \"" | sudo tee /etc/dracut.conf.d/t2linux-modules.conf`

- T2-Atomic을 사용하면, /etc/dracut.conf.d/t2-bce.conf가 이미 존재해야 합니다.

#### Hybrid Graphics

[Hybrid Graphics at T2Linux Wiki](https://wiki.t2linux.org/guides/hybrid-graphics/)를 확인하세요. iGPU를 활성화하는 것에 대한 섹션 (apple-gmux.conf 만들기)만 필요합니다. radeon는 iGPU가 사용될 때 일반적으로 "low" 전력 모드에서 동작하는데, 대부분 사용되지 않기 때문입니다. 2024년 기준으로, dGPU 전력을 토글할 수 없지만 (radeon는 항상 켜져 있지만), 전력/열은 대부분의 작업에 iGPU를 사용하여 줄어듭니다.

T2-Atomic 이미지를 사용하면, `/etc/modprobe.d/apple-gmux.conf`를 편집하고 "options" 줄의 주석을 해제하세요.

#### Tuned DSP 오디오

16" MacBook pro의 음질은 Asahi Linux 팀이 만들고 T2 Linux로 가져온 tuned software DSP를 사용하여 크게 개선할 수 있습니다. 세부 정보는 [T2 Apple Audio DSP (@lemmyg on GitHub)](https://github.com/lemmyg/t2-apple-audio-dsp/tree/speakers_161)를 확인하세요. MacBookPro16,1을 위한 .wav 파일은 이미 T2-Atomic 이미지에 포함되어 있고자신의 이미지에서 포함할 수 있습니다.

- 패키지를 layer한다면, `sudo dnf install calf libspatialaudio lsp-plugins-lv2 lv2-calf-plugins ladspa-swh-plugins pipewire-module-filter-chain-lv2`로 의존성을 설치하세요
- T2-Atomic을 사용하면, هذه 의존성이 이미 설치되어 있습니다. 비활성화된 config 파일을 이름 변경하고 재부팅하세요. `sudo mv /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.confdisabled /etc/pipewire/pipewire.conf.d/10-t2_161_speakers.conf`

#### Sleep/suspend, Lid switch 등 비활성화

시스템이휴면하지 않도록, systemd가 lid switch를 무시하고 power button을 suspend 대신 shutdown하도록 구성할 것입니다:

##### Manual Install:

1. 터미널에서, 실행하세요:

```
sudo mkdir -p /etc/systemd/logind.conf.d
sudo touch /etc/systemd/logind.conf.d/t2-lidswitch.conf
```

2. `/etc/systemd/logind.conf.d/t2-lidswitch.conf`를 편집하여 다음 내용을 가지도록 하세요, 이것은 `/usr/lib/systemd/logind.conf`의 기본 시스템-wide config를 재정의할 것입니다:

```
[Login]
# 우리는 일반적으로 무시하거나 poweroff하기를 원합니다, suspend는 T2에서 동작하지 않기 때문입니다
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

##### T2-Atomic:

파일 `/etc/systemd/logind.conf.d/t2-lidswitch.conf`는 위의 설정과 동일한 설정으로 존재해야 합니다. 이것은 lid switch를 비활성화하고 (노트북을 닫는 것을 잊지 마세요!) power button 동작을 shutdown으로 설정합니다.

#### T2 USB Ethernet 알림 스팸 비활성화

T2 Chip은 연결하고 끊내는 내부 USB ethernet 인터페이스를 제시합니다. 이 ethernet 인터페이스는 이 시간에 Linux에서 사용되지 않으므로, 모듈이 로드되는 것을 차단하여 이러한 알림이 당신의 데스크톱과 로그를 막는 것을 막을 수 있습니다.

##### Manual Install:

파일 `/etc/modprobe.d/t2-eth-blocklist.conf`를 편집하고 다음 내용을 포함하세요:

```
blacklist cdc_ncm
blacklist cdc_mbim
```

##### T2-Atomic:

이 파일은 이미 존재해야 합니다. 여전히 알림을 받으면, 다른 방법으로 당신의 컴퓨터에서 인터페이스를 비활성화해야 할 수 있습니다.
