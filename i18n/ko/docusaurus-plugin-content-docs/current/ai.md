---
title: AI 및 머신러닝
slug: /ai
---

## 방법론

Bluefin은 엔지니어들에 의해 만들어졌지만, [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions)와 [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales)에 의해 생명을 얻었습니다. 이 artwork는 자유롭게 사용할 수 있으며 항상 사람에 의해 만들어질 것입니다. 이것은 오픈 소스가 유지되어야 하는 하나의 생태계라는 것을 우리에게 상기시켜 주기 위한 것입니다. 우리가 만드는 소프트웨어는 세계에 영향을 줍니다. Bluefin의 AI 통합은 항상 사용자가 제어하며, 오픈 소스 모델과 도구에 초점을 맞춥니다.

:::tip[AI는 클라우드 네이티브의 확장입니다]

Bluefin의 AI에서의 초점은 사용자가 제어하는 운영체제에 일반적인 API 엔포인트를 제공하는 것입니다. 마치 Bluefin의 운영체제가 `bootc`와 `podman`과 같은 [CNCF](https://cncf.io) 기술로 만들어지듯, 이 경험은 `goose`와 같은 [Agentic AI Foundation](https://aaif.io/) 기술에 의해 구동되며, [RHEL Lightspeed](https://www.redhat.com/en/lightspeed)를 구동하는 오픈 소스 구성 요소의 강한 한 방울이 더해집니다.

:::

## AI 아키텍처와 도구

Bluefin은 AI 워크플로우를 위해 운영체제로 개방적이고 사용자가 제어하는 API 엔포인트를 제공합니다. 우리는 이를 커뮤니티가 관리하는 도구 추천과 구성의 집합을 통해 수행합니다:

- "가져다 쓴다(Bring your own LLM)" 접근법으로, 로컬 모델과 호스팅된 모델 간에 전환하기 쉬워야 합니다
  - [Goose](https://block.github.io/goose/) — 호스팅된 로컬 모델에 대한 주요 인터페이스
- [Agentic AI Foundation](https://aaif.io/), [CNCF](https://cncf.io), 그리고 다른 재단들의 도구를 출시하여 AI의 오픈 소스 표준을 가속화하세요
- 로컬 LLM 서비스 관리
  - `llmman`과 Docker Model Runner를 통한 모델 관리, 사용자 선택
- Nvidia와 AMD 양쪽 모두의 GPU 가속은 기본으로 포함되어 있으며 보통 추가 설정이 필요 없습니다
- 앱 스토어의 선별된 섹션에서 Flathub의 훌륭한 AI/ML 애플리케이션을 소개하세요
- [더 많은 스래를 파세요](https://store.projectbluefin.io)

Reproducible 홈랩 및 멀티 노드 AI/관측 인프라를 배포하려면 [Bluespeed](https://github.com/projectbluefin/bluespeed)를 참고하세요 — KubeStellar, Flatcar, [Knuckle](https://github.com/projectbluefin/knuckle)에 의해 구동되는 Bluefin의 홈랩 팩토리입니다.

우리는 [RHEL Lightspeed 팀](https://github.com/rhel-lightspeed)과 밀접하게 협력하며, 그들의 코드를 출시하고, 피드백을 주고, 우리가 할 수 있는 곳에서는 한계를 넓혀갑니다.

## Podman Desktop으로 하는 AI Lab

[AI Lab extension](https://developers.redhat.com/products/podman-desktop/podman-ai-lab)를 포함된 Podman Desktop 안에 설치하여 로컬 모델을 관리하는 그래픽 인터페이스를 제공할 수 있습니다:

![image](/img/user-attachments/e5557952-3e62-499e-93a9-934c4d452be0.png)

## AI 명령줄 도구

다음의 AI 특화 명령줄 도구는 Homebrew(`brew install <name>`)를 통해 사용할 수 있습니다:

| Name                                                                | Description                                              |
| ------------------------------------------------------------------- | -------------------------------------------------------- |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | 올인원 AI 기반 CLI 채팅 및 코파일럿                      |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol AI 에이전트 CLI                           |
| [claude-code](https://formulae.brew.sh/cask/claude-code)            | 데스크톱 통합이 있는 Claude 코딩 에이전트                |
| [codex](https://formulae.brew.sh/cask/codex)                        | 터미널에서 실행되는 OpenAI의 코딩 에이전트용 코드 편집기 |
| [copilot-cli](https://formulae.brew.sh/cask/copilot-cli)            | 터미널 원조를 위한 GitHub Copilot CLI                    |
| [crush](https://github.com/charmbracelet/crush)                     | charm.sh의 터미널용 AI 코딩 에이전트                     |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Google의 Gemini API용 명령줄 인터페이스                  |
| [kimi-cli](https://formulae.brew.sh/formula/kimi-cli)               | Moonshot AI의 Kimi 모델용 CLI                            |
| [llm](https://formulae.brew.sh/formula/llm)                         | 명령줄에서 대규모 언어 모델에 접근                       |
| [lm-studio](https://lmstudio.ai/)                                   | 로컬 LLM을 실행하는 데스크톱 앱                          |
| [mistral-vibe](https://formulae.brew.sh/formula/mistral-vibe)       | Mistral AI 모델용 CLI                                    |
| [opencode](https://formulae.brew.sh/formula/opencode)               | 터미널용 AI 코딩 에이전트                                |
| [qwen-code](https://formulae.brew.sh/formula/qwen-code)             | Qwen3-Coder 모델용 CLI                                   |
| [llmman](https://github.com/llmmanorg/llmman)                       | 컨테이너로 로컬 AI 모델을 관리하고 실행                  |
| [whisper-cpp](https://formulae.brew.sh/formula/whisper-cpp)         | OpenAI의 Whisper 모델의 고성능 추론                      |

## llmman

[llmman](https://github.com/llmmanorg/llmman)를 `brew install llmmanorg/tap/llmman`을 통해 설치하세요: 로컬 모델을 관리하며 선호하는 기본 경험입니다. 로컬 모델을 자주 다루고 고급 기능이 필요한 사람들을 위한 것입니다. huggingface, ollama, 모든 컨테이너 레지스트리에서 모델을 가져오는 기능을 제공합니다. 자세한 내용은 [llmman 문서](https://github.com/llmmanorg/llmman#readme)를 참고하세요.

Bluefin에서 전체 `llmman` 명령을 사용하세요. 이는 업스트림 llmman 문서와 일치합니다.

llmman의 명령줄 경험은 다음과 같습니다:

```
llmman pull llama3.2:latest
llmman run llama3.2
llmman run deepseek-r1
```

모델을 로컬에서 제공할 수도 있습니다:

```
llmman serve
```

그런 다음 브라우저에서 `http://127.0.0.1:17434`로 가세요.

### 기존 도구와의 통합

`llmman serve`는 `http://127.0.0.1:17434`에서 OpenAI 호환 엔포인트를 제공하며, 이를 통해 llmman을 직접 지원하지 않는 도구를 구성할 수 있습니다:

![Newelle](/img/user-attachments/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe.png)

### VS Code에서 AI 에이전트 실행

여기는 devcontainers를 사용해 격리를 위해 컨테이너 안에서 에이전트를 실행하는 예시입니다:

<iframe width="560" height="315" src="https://www.youtube.com/embed/w3kI6XlZXZQ?si=5pygGs5E_Qedf-S8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Docker Model Runner

[Docker Model Runner](https://docs.docker.com/model-runner/)는 Docker의 내장 로컬 LLM 서비스로, llmman과 함께 Bluefin에 포함되어 있습니다. [Docker Hub의 AI 카탈로그](https://hub.docker.com/u/ai)에서 모델을 실행하고 OpenAI 호환 API를 노출합니다 — 별도의 서버 설정이 필요 없습니다.

### 기본 사용법

```bash
# Pull a model from Docker Hub
docker model pull ai/llama3.2

# Run a model interactively
docker model run ai/llama3.2

# List downloaded models
docker model ls

# Remove a model
docker model rm ai/llama3.2
```

### API 엔포인트

Docker Model Runner는 OpenAI 호환 엔포인트 `http://localhost:12434`를 제공하며, 이를 통해 OpenAI API 형식을 지원하는 모든 도구(Goose, aichat, VSCode 확장 등)와 함께 사용할 수 있습니다.

### llmman vs Docker Model Runner

두 도구 모두 로컬 OpenAI 호환 API를 제공합니다. 당신의 워크플로우에 따라 선택하세요:

|               | llmman                              | Docker Model Runner   |
| ------------- | ----------------------------------- | --------------------- |
| Model sources | OCI registries, Ollama, HuggingFace | Docker Hub AI catalog |
| Engine        | Podman                              | Docker Engine         |
| Quick command | `llmman`                            | `docker model`        |

전체 모델 카탈로그와 구성 옵션은 [Docker Model Runner 문서](https://docs.docker.com/model-runner/)를 참고하세요.

## Alpaca 그래픽 클라이언트

가벼운 채팅 사용의 경우, 사용자가 네이티브 데스크톱 애플리케이션 안에서 자신의 LLM 모델과 대화하고 관리할 수 있도록 [Alpaca](https://flathub.org/en/apps/com.jeffser.Alpaca)를 설치할 것을 권장합니다. Alpaca는 Nvidia와 AMD[^1] 가속을 기본적으로 지원합니다.

:::tip[키 한 번으로 접속]

Bluefin은 Alpaca를 설치한 후 `Ctrl`-`Alt`-`Backspace`를 Alpaca의 quicklaunch로 자동으로 지정합니다!

:::

### 구성

![Alpaca](/img/user-attachments/104c5263-5d34-497a-b986-93bb0a41c23e.png)

![image](/img/user-attachments/9fd38164-e2a9-4da1-9bcd-29e0e7add071.png)

## 자동 문제 해결 (WIP)

Bluefin은 자동 문제 해결 도구를 함께 제공합니다:

- [작업 중](https://docs.projectbluefin.io/troubleshooting/)
