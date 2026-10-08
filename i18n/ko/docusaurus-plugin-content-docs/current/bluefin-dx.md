---
slug: /bluefin-dx
---

# 개발자 모드

Bluefin 개발자 경험(`bluefin-dx`)는 번들된 도구를 갖춘 전용 개발자 이미지입니다. 전통적인 Linux 시스템과 달리 운영체제와 개발자 환경이 명시적이고 의도적으로 분리됩니다. 이는 도구가 호스트에 설치되지 않고, 대신 컨테이너화되거나 가상 머신에 있거나 사용자의 홈 디렉토리로 제한된다는 의미입니다. 다음 사용 사례를 충족하도록 설계되었습니다:

Bluefin은 다음을 출시하려 노력합니다:

- 세계에서 가장 강력한 [클라우드 네이티브 개발자 환경](https://landscape.cncf.io/)
- QEMU/KVM을 중심으로 한 완전한 가상화 지원과 함께 Docker와 Incus 지원

:::info[더 함께 강하게]

세계에는 [1,560만 클라우드 네이티브 개발자](https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/)가 있습니다. 우리의 워크플로우는 이러한 기술에서 얻은 경험을 기반으로 합니다.

:::

## 클라우드 네이티브 개발 접근법

Bluefin은 클라우드 네이티브 개발에 "모든 것을 투입"하며, Ubuntu와 같은 전통적인 배포판과 다르게 사용됩니다:

- 개발은 컨테이너에서 이루어집니다. 일반적인 컨테이너 패턴은 다음과 같습니다:
  - [Devcontainers](https://containers.dev/) — VSCode, Jetbrains, 또는 neovim과 함께
  - [Podman Desktop](https://podman-desktop.io/docs/intro) — 그래픽(GUI) 인터페이스로 컨테이너 개발. 여기는 [podman/vscode 설정의 예시](https://podman-desktop.io/blog/2025/05/05/vs-code-with-podman-desktop)가 있습니다 — 이 확장들은 Bluefin에 포함되어 있습니다
  - [Podman](https://podman.io/docs) 또는 [Docker](https://docs.docker.com/reference/cli/docker/) 명령줄 컨테이너 관리
- 명령줄 애플리케이션은 [homebrew](https://brew.sh)을 통해 설치됩니다
- Ubuntu, Fedora, Wolfi를 위한 사전 구성된 임시 컨테이너가 포함되어 있습니다. 원하는 배포판을 사용하세요.

이는 개발 프로세스를 운영체제 중립적으로 만들어 전통적인 배포판과 구분됩니다. Bluefin에는 `apt install php`에 해당하는 것이 없습니다 — 개발은 IDE를 통해 `podman` 또는 `docker`를 직접 사용해 이루어집니다.

우리는 또한 `uv`를 통한 Python과 같은 번성하는 다른 생태계에 쉽게 접근할 수 있기를 믿습니다. "누구에게나 하나를 통치하는 하나의 Linux 시스템 패키지 매니저"에 대해서는 포기합니다 — 이러한 생태계 자체가 거인이기 때문입니다. 비판가들이 너무 많은 패키지 매니저를 출시한다고 말하지만, 우리는 패키지 매니저를 출시하지 않습니다, 사용자가 원하는 _생태계_를 출시할 뿐입니다. 그리고 이러한 현대적인 패키지 매니저는 컨테이너로 달리는 세계를 위해 설계되었으며, 실제로 كذلك 때문입니다. 그리고 우리는 그것을 우리의 데스크톱에서 기본으로 원합니다.

:::tip[왜 클라우드 네이티브인가?]

우리는 클라우드 네이티브 패턴을 선택했습니다 — 컨테이너에서의 로컬 개발은 현대적인 인프라에 컨테이너의 배포로 이어지기 때문입니다.

:::

![image](/img/user-attachments/51415b6c-b7fe-45e9-af74-c01694b26fbe.png)

`bluefin-dx`(및 `aurora-dx`)의 패턴은 [devcontainers](https://containers.dev)를 중심으로 합니다. devcontainers는 프로젝트의 git 저장소에 있기 때문에 모든 운영체제에 배포할 수 있습니다: Linux, macOS, 또는 Windows(WSL을 통해). 이는 "기본적으로 분산된" 개발을 촉진하고, 다른 운영체제의 팀원과 작업할 때 Linux 사용자가 "배타적인 존재"가 되는 것을 방지합니다.

각 프로젝트는 "best practice" 클라우드 네이티브 워크플로우로 시작하는 선언적인 환경을 포함합니다. [Dev Containers에 대한 궁극적인 가이드](https://web.archive.org/web/20260313112015/https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers)는 devcontainers 사용의 장점에 대한 좋은 설명을 제공합니다. 이는 개발 환경이 호스트에 결합되는 대신 버전 관리에 유지된다는 의미입니다.

Homebrew를 개발 도구 설치에도 사용할 수 있습니다. 그러나 이를 피하고 프로젝트의 의존성을 버전 관리에 선언하는 것이 권장됩니다. 가끔 너무 편리해서, [괜찮습니다](https://www.youtube.com/shorts/lKwavoyaaFA).

Mise는 프로젝트별로 특정 버전의 애플리케이션을 설치할 수 있게 하는 도구입니다 (예: 한 프로젝트에서는 node 20, 다른 프로젝트에서는 node 21). 저장소의 `mise.toml` 파일을 사용해 필요한 특정 도구를 추적할 수 있습니다. [이것들을 전역으로 설치할 수도 있습니다](https://mise.jdx.dev/configuration.html#global-config-config-mise-config-toml). 이것은 devcontainers와 유사하게 사용할 수 있지만, 사용하기 위해 컨테이너로 전환할 필요는 없습니다.

항상 원하는 것을 사용할 수 있습니다. 생산적이 되기 위해 여기에 있는 모든 것을 사용할 필요는 없습니다 — 결국 이것은 당신의 컴퓨터이고 이것은 기본값의 집합입니다.

## 개발자 모드 활성화

개발자 모드를 켜는 것은 두 단계 절차입니다:

### 1단계: 켜기

`ujust devmode`를 통해 dx 모드를 활성화하거나 비활성화한 후 재부팅하세요:

![image](/img/user-attachments/76df5201-da02-42d0-bec9-fad259df9b0d.png)

### 2단계: 올바른 그룹에 본인 추가

`ujust dx-group` — 사용자 계정을 올바른 그룹에 추가합니다. 그런 다음 재부팅하세요. 이 단계는 한 번만 수행하면 됩니다.

모든 Universal Blue 이미지처럼 전환은 원자적이며, 사용 사례에 따라 모드 간에 깨끗하게 전환할 수 있습니다.

## 기능

### Docker가 있는 Visual Studio Code

[Visual Studio Code](https://code.visualstudio.com/)는 기본 IDE로 이미지에 포함되어 있습니다. [devcontainers 확장](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)가 이미 설치되어 제공됩니다. 권장되는 개발자 경험이기 때문에, 컨테이너 개발이 익숙하지 않다면 여기서 시작하세요!

- [Dev Containers 문서](https://code.visualstudio.com/docs/devcontainers/containers) — 설치 설명의 대부분을 건너뛰고 [튜토리얼](https://code.visualstudio.com/docs/devcontainers/tutorial#_install-the-extension)으로 바로 가세요
- [Dev Containers 규격](https://containers.dev/)
- [초보자를 위한 시리즈: Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) — [VS Code YouTube 채널](https://www.youtube.com/@code/videos)의 훌륭한 입문용 튕토리얼

가장 최근의 [Docker Engine](https://docs.docker.com/engine/)이 기본으로 포함되며 VSCode의 기본 컨테이너 런타임으로 설정되어 있습니다. [docker compose](https://danielquinn.org/blog/developing-with-docker/)를 사용하는 것도 컨테이너 개발에 시작하는 훌륭한 방법이며, devcontainers가 당신의 스타일에 맞지 않을 경우 선택지입니다. 참고로, Docker Desktop은 사용 불가능하며, 그래픽 컨테이너 관리를 위해 Podman Desktop을 사용하세요.

#### Dev Containers로 Podman 사용

Dev Containers 확장은 기본적으로 Docker를 사용합니다. Podman으로 전환하려면 다음 설정을 VS Code에 추가하세요:

```json
"dev.containers.dockerComposePath": "podman-compose"
"dev.containers.dockerPath": "podman"
"dev.containers.dockerSocketPath": "/run/user/1000/podman/podman.sock"
```

`systemctl --user status podman.socket`를 실행해 사용자 ID의 소켓 경로를 확인하세요. rootful Podman의 경우 `/run/podman/podman.sock`을 사용하세요.

**SELinux 문제 해결:** devcontainer가 SELinux 접근 오류로 시작되지 않는다면 (`ausearch -m avc -ts recent`를 확인), `restorecon -R -v $HOME/.local/share`를 실행하세요. 볼륨 마운트 오류의 경우 `restorecon -R -v /path/to/your/project`를 실행하세요. 마지막 수단으로, `.devcontainer/devcontainer.json`에서 특정 컨테이너의 SELinux 라벨링을 비활성화할 수 있습니다:

```json
{
  "runArgs": ["--security-opt", "label=disable"]
}
```

### Podman과 Podman Desktop

![Podman Desktop](/img/user-attachments/69f64ed1-7fcc-4040-9a3d-12b71308da1b.png)

[Podman Desktop](https://podman-desktop.io/)는 컨테이너 관리를 제공하기 위해 포함되어 있습니다. 자세한 내용은 Podman Desktop [문서](https://podman-desktop.io/docs/intro)를 참고하세요. 모든 업스트림 `podman` 도구가 포함되어 있습니다. 이것이 기본 시스템 컨테이너 런타임이며 새 사용자를 위한 권장 개발자 설정입니다.

### 내장 성능 도구

[Sysprof](https://www.sysprof.com/)는 시스템 전체 성능 프로필러로 포함되어 있습니다. 또한 [Brendan Gregg](https://www.brendangregg.com/)이 추천하는 명령줄 도구도 포함되어 있습니다:

- `bcc`, `bpftrace`, `iproute2`, `nicstat`, `numactl`, `sysprof`, `sysstat`, `tiptop`, `trace-cmd`, 그리고 `util-linux`

Ubuntu와 Canonical의 [세부 규격](https://discourse.ubuntu.com/t/spec-include-performance-tooling-in-ubuntu/43134)과 근거에 감사합니다. 이 프로젝트는 성능 도구의 포함이 [더 나은 업스트림 소프트웨어로 이어질 것](https://blogs.gnome.org/chergert/2024/09/25/messaging-needs/)이라고 바랍니다.

### 삶의 질 개선

- 잘 선별된 monospace 폰트의 집합
- 자동화 작업을 위한 [Just](https://github.com/casey/just) 작업 실행기
- 선택적 쉘로 `fish`와 `zsh` 사용 가능

#### Pet Containers

Pet containers는 [distrobox](https://distrobox.it/)를 통해 인터티브 터미널로 제공됩니다. 이를 포함된 [DistroShelf](https://github.com/ranfdev/DistroShelf) 애플리케이션을 통해 관리하세요. 데스크톱 왼쪽 상단의 "Containers" 아래 logomenu에서 사용할 수 있습니다:

![image](/img/user-attachments/bdab71b0-c04a-4562-a73d-396d4b907060.png)

DistroShelf의 인터페이스를 사용해 목록에 있는 배포관에서 자신의 pet container를 만드세요:

![image](/img/user-attachments/2daf276d-2aed-47b9-9792-923d674ef226.png)

명줄 전사들을 위해 터미널의 내장 컨테이너 지원으로 컨테이너를 관리할 수 있습니다:

![image](/img/user-attachments/2a4dc4b5-f1a8-4781-80a4-92ea4dfeeb97.png)

포함된 [Terminal](https://gitlab.gnome.org/GNOME/ptyxis)에는 호스트 터미널이 있어 컨테이너와 호스트 간에 빠르게 전환할 수 있습니다.

- 기본 터미널은 [Ptyxis](https://gitlab.gnome.org/GNOME/ptyxis)로, distrobox 컨테이너의 내장 통합을 포함합니다. 메뉴에서 "Terminal"로 별칭이 붙습니다. 빠른 실행을 위해 기본적으로 <kbd>Ctrl</kbd>-<kbd>Alt</kbd>-<kbd>Enter</kbd>에 할당됩니다
- [Podman Desktop](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) — 개발자를 위한 컨테이너와 Kubernetes
- [Pods](https://flathub.org/apps/com.github.marhkb.Pods)도 컨테이너를 그래픽적으로 관리하는 훌륭한 방법입니다

## 다른 도구

### JetBrains

`ujust jetbrains-toolbox`는 [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app) 애플리케이션을 가져와 설치하며, 이는 JetBrains 도구 세트의 설치를 관리합니다. 이 애플리케이션은 제품의 설치, 제거, 업그레이드를 처리하며, 완전히 사용자 디렉토리에서 처리되어 운영체제 이미지와 독립적입니다. 우리는 JetBrains flatpaks의 사용을 권장하지 않습니다.

- [JetBrains 문서](https://www.jetbrains.com/help/idea/podman.html)를 통해 podman 런타임과 이러한 도구를 통합하는 방법을 확인하세요.
- [JetBrains를 devcontainers로 설정하는 방법](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html)을 확인하세요
- [제거 설명](https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270-How-to-uninstall-Toolbox-App-)

JetBrains 블로그에도 JetBrains Dev Containers 지원에 대한 더 많은 정보가 있습니다:

- [JetBrains IDE에서 Dev Containers 사용 – Part 1](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/)

### Neovim

`brew install neovim devcontainer` 후 devcontainer 설정을 위한 다음 지침을 따르세요:

- [Devcontainers에서 Neovim 실행](https://cadu.dev/running-neovim-on-devcontainers/)

### 가상화와 컨테이너 런타임

- [virt-manager](https://virt-manager.org/)과 관련 도구 (KVM, qemu)
- [Incus](https://linuxcontainers.org/incus/)는 시스템 컨테이너를 제공합니다

### 로컬 애플리케이션 개발

[GNOME Builder](https://developer.gnome.org/documentation/introduction/builder.html)는 애플리케이션 제작을 위한 권장 애플리케이션 스택입니다.

### Kubernetes

Homebrew를 통해 Kubernetes 관리자가 사용하는 도구의 일반적인 집합을 설치하세요 (`brew install <name>`):

| Name                                                     | Description                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [cdk8s](https://formulae.brew.sh/formula/cdk8s)          | 익숙한 프로그래밍 언어로 Kubernetes 애플리케이션과 재사용 가능한 추상화를 정의합니다                 |
| [dagger](https://formulae.brew.sh/formula/dagger)        | CI/CD 파이프라인을 위한 휴대용 devkit                                                                |
| [grype](https://formulae.brew.sh/formula/grype)          | 컨테이너 이미지와 파일시스템을 위한 취약점 스캐너                                                    |
| [helm](https://formulae.brew.sh/formula/helm)            | Kubernetes의 패키지 매니저                                                                           |
| [k0sctl](https://k0sproject.io/)                         | k0s Kubernetes 클러스터를 부팅하고 관리하는 명령줄 도구                                              |
| [k3sup](https://formulae.brew.sh/formula/k3sup)          | 로컬 또는 원격 VM에 k3s를 설치하는 경량 유틸리티                                                     |
| [k9s](https://formulae.brew.sh/formula/k9s)              | Kubernetes 클러스터와 상호작용하는 터미널 UI를 제공합니다                                            |
| [kind](https://formulae.brew.sh/formula/kind)            | Docker 컨테이너 "노드"를 사용하여 로컬 Kubernetes 클러스터를 실행하는 도구                           |
| [kubectl](https://kubernetes.io/docs/reference/kubectl/) | Kubernetes 명령줄 도구, Kubernetes 클러스터에 명령을 실행할 수 있습니다                              |
| [kubectx](https://formulae.brew.sh/formula/kubectx)      | kubectl에서 컨텍스트(클러스터) 간에 빠르게 전환하는 도구                                             |
| [pack](https://buildpacks.io/)                           | Cloud Native Buildpacks를 사용해 애플리케이션을 빌드하는 CLI 도구                                    |
| [syft](https://formulae.brew.sh/formula/syft)            | 컨테이너 이미지와 파일시스템에서 Software Bill of Materials (SBOM)을 생성하는 CLI 도구 및 라이브러리 |

#### CNCF 도구

[Cloud Native Computing Foundation](https://l.cncf.io)의 전체 도구 세트에 접근하려면, `ujust cncf`를 사용해 graduated, incubating, 그리고 sandbox 도구를 포함한 89개의 CNCF 프로젝트에서 폭넓은 컬렉션에서 탐색하고 설치하세요. 여기에는 Argo, Cilium, Envoy, Flux, Istio, Linkerd, Prometheus, 그리고 더 많은 것들이 포함됩니다.

### 폰트

Homebrew를 통해 선별된 개발자 폰트를 설치하세요 (`brew install --cask <font-name>`), 또는 포함된 [Embellish](https://flathub.org/en/apps/io.github.getnf.embellish) 도구를 사용하세요:

| Name                                                                                          |
| --------------------------------------------------------------------------------------------- |
| [CaskaydiaMono Nerd Font](https://formulae.brew.sh/cask/font-caskaydia-mono-nerd-font)        |
| [Comic Shanns Mono Nerd Font](https://formulae.brew.sh/cask/font-comic-shanns-mono-nerd-font) |
| [Droid Sans Mono Nerd Font](https://formulae.brew.sh/cask/font-droid-sans-mono-nerd-font)     |
| [Go Mono Nerd Font](https://formulae.brew.sh/cask/font-go-mono-nerd-font)                     |
| [Blex Mono Nerd Font](https://formulae.brew.sh/cask/font-blex-mono-nerd-font)                 |
| [Sauce Code Pro Nerd Font](https://formulae.brew.sh/cask/font-sauce-code-pro-nerd-font)       |
| [Source Code Pro](https://formulae.brew.sh/cask/font-source-code-pro)                         |
| [Ubuntu Nerd Font](https://formulae.brew.sh/cask/font-ubuntu-nerd-font)                       |
| [FiraCode Nerd Font](https://formulae.brew.sh/cask/font-fira-code-nerd-font)                  |
| [0xProto Nerd Font](https://formulae.brew.sh/cask/font-0xproto-nerd-font)                     |

## Finpilot로 커스텀 이미지 만들기

Bluefin을 기반으로 자신의 맞춤 부팅 가능한 `bootc` 운영체제 이미지를 만들고자 한다면:

- **[finpilot](https://github.com/projectbluefin/finpilot)**는 커스텀 Linux 이미지를 빌드하기 위한 공식 템플릿 저장소를 제공합니다.
- 레이어링된 패키지, 구성 파일, 데스크톱 커스텀을 위한 다단계 컨테이너 빌드 아키텍처를 구현합니다.
- 자동화 빌드를 위한 GitHub Actions 워크플로우, Cosign을 통한 keyless 이미지 서명, GitHub Container Registry (GHCR)로의 게시를 포함합니다.
- 커스텀 이미지를 배포하려면 다음으로 전환하세요:
  ```bash
  sudo bootc switch ghcr.io/<your-username>/<your-image>:latest --enforce-container-sigpolicy
  ```
