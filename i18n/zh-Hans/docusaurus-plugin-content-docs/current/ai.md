---
title: AI 与机器学习
slug: /ai
---

## 方法论

Bluefin 由工程师创建，但由 [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions) 和 [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales) 赋予生命。这些 artwork 供你免费使用，并且将始终由人类创作。它们的存在提醒我们：开源是一个需要持续滋养的生态系统。我们制作的软件会对世界产生影响。Bluefin 的 AI 整合将始终由用户控制，聚焦于开源模型和工具。

:::tip[AI 是云原生的延伸]

Bluefin 在 AI 上的焦点，是为用户可控的操作系统提供一个通用的 API 端点。正如 Bluefin 的操作系统使用 [CNCF](https://cncf.io) 技术（如 `bootc` 和 `podman`）构建，这一体验由 [Agentic AI Foundation](https://aaif.io/) 技术（如 `goose`）驱动，并融入了为 [RHEL Lightspeed](https://www.redhat.com/en/lightspeed) 提供动力的开源组件。

:::

## AI 架构与工具

Bluefin 为操作系统的 AI 工作流提供开放、用户可控的 API 端点。我们通过一套社区管理的工具推荐和配置来实现：

- "Bring your own LLM" Approach，在本地模型和托管模型之间切换应当很容易
  - [Goose](https://block.github.io/goose/) 作为访问托管模型和本地模型的主要接口
- 通过发布 [Agentic AI Foundation](https://aaif.io/)、[CNCF](https://cncf.io) 及其他基金会推出的工具来加速 AI 中的开放标准
- 本地 LLM 服务管理
  - 通过 `llmman` 和 Docker Model Runner 管理模型，由你选择
- Nvidia 和 AMD 的 GPU 加速开箱即用，通常无需额外设置
- 在应用商店的精选版块中高展示 Flathub 上优秀的 AI/ML 应用
- 一个促使你[多卖周边](https://store.projectbluefin.io)的理由

对于部署可复现的 homelab 和多节点 AI/可观测性基础设施，参见 [Bluespeed](https://github.com/projectbluefin/bluespeed)，这是 Bluefin 由 KubeStellar、Flatcar 和 [Knuckle](https://github.com/projectbluefin/knuckle) 驱动的 homelab 工厂。

我们与 [RHEL Lightspeed 团队](https://github.com/rhel-lightspeed) 紧密合作，通过发布他们的代码、提供反馈，并在可行的范围内突破边界。

## 使用 Podman Desktop 的 AI Lab

[AI Lab extension](https://developers.redhat.com/products/podman-desktop/podman-ai-lab) 可以安装在附带的 Podman Desktop 中，为管理本地模型提供图形界面：

![image](/img/user-attachments/e5557952-3e62-499e-93a9-934c4d452be0.png)

## AI 命令行工具

以下面向 AI 的命令行工具可通过 Homebrew 安装（`brew install <name>`）：

| Name                                                                | Description                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | 一体化的 AI 驱动 CLI 聊天与 Copilot                         |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol AI agent CLI                                      |
| [claude-code](https://formulae.brew.sh/cask/claude-code)            | 带桌面集成的 Claude 编码 agent                     |
| [codex](https://formulae.brew.sh/cask/codex)                        | OpenAI 编码 agent 的编辑器，在你的终端中运行 |
| [copilot-cli](https://formulae.brew.sh/cask/copilot-cli)            | 用于终端协助的 GitHub Copilot CLI                       |
| [crush](https://github.com/charmbracelet/crush)                     | charm.sh 推出的面向终端的 AI 编码 agent                  |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Google Gemini API 的命令行界面                   |
| [kimi-cli](https://formulae.brew.sh/formula/kimi-cli)               | Moonshot AI 的 Kimi 模型的 CLI                                |
| [llm](https://formulae.brew.sh/formula/llm)                         | 从命令行访问大语言模型               |
| [lm-studio](https://lmstudio.ai/)                                   | 运行本地 LLM 的桌面应用                               |
| [mistral-vibe](https://formulae.brew.sh/formula/mistral-vibe)       | Mistral AI 模型的 CLI                                        |
| [opencode](https://formulae.brew.sh/formula/opencode)               | 面向终端的 AI 编码 agent                                 |
| [qwen-code](https://formulae.brew.sh/formula/qwen-code)             | Qwen3-Coder 模型的 CLI                                       |
| [llmman](https://github.com/llmmanorg/llmman)                       | 用容器管理和运行本地 AI 模型                 |
| [whisper-cpp](https://formulae.brew.sh/formula/whisper-cpp)         | 高性能运行 OpenAI Whisper 模型             |

## llmman

通过 `brew install llmmanorg/tap/llmman` 安装 [llmman](https://github.com/llmmanorg/llmman) —— 管理本地模型，是推荐的默认体验。它面向经常使用本地模型且需要高级功能的人。它提供从 huggingface、ollama 以及任何容器仓库拉取模型的能力。查看 [llmman documentation](https://github.com/llmmanorg/llmman#readme) 了解更多信息。

在 Bluefin 中使用与上游 llmman 文档匹配的完整 `llmman` 命令。

llmman 的命令行体验包括：

```
llmman pull llama3.2:latest
llmman run llama3.2
llmman run deepseek-r1
```

你也可以在本地提供模型服务：

```
llmman serve
```

然后在浏览器中打开 `http://127.0.0.1:17434`。

### 与现有工具集成

`llmman serve` 会在 `http://127.0.0.1:17434` 提供一个兼容 OpenAI 的端点，你可以用它来配置那些不支持直接接入 llmman 的工具：

![Newelle](/img/user-attachments/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe.png)

### 在 VS Code 中运行 AI Agent

下面是一个使用 devcontainers 在容器内运行 agent 以实现隔离的示例：

<iframe width="560" height="315" src="https://www.youtube.com/embed/w3kI6XlZXZQ?si=5pygGs5E_Qedf-S8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Docker Model Runner

[Docker Model Runner](https://docs.docker.com/model-runner/) 是 Docker 内置的本地 LLM 服务，与 llmman 一并包含在 Bluefin 中。它从 [Docker Hub 的 AI catalog](https://hub.docker.com/u/ai) 运行模型，并暴露一个兼容 OpenAI 的 API —— 无需单独的服务器设置。

### 基本用法

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

### API 端点

Docker Model Runner 在 `http://localhost:12434` 提供一个兼容 OpenAI 的端点，可用于任何支持 OpenAI API 格式的工具 —— Goose、aichat、VSCode 扩展等。

### llmman 与 Docker Model Runner

两者都提供本地的兼容 OpenAI 的 API。根据你的工作流选择：

|               | llmman                              | Docker Model Runner   |
| ------------- | ----------------------------------- | --------------------- |
| Model sources | OCI registries, Ollama, HuggingFace | Docker Hub AI catalog |
| Engine        | Podman                              | Docker Engine         |
| Quick command | `llmman`                            | `docker model`        |

查看 [Docker Model Runner documentation](https://docs.docker.com/model-runner/) 获取完整的模型目录和配置选项。

## Alpaca 图形客户端

对于轻量的聊天机器人使用，我们建议用户[安装 Alpaca](https://flathub.org/en/apps/com.jeffser.Alpaca)，在原生桌面应用中管理和与你的 LLM 模型聊天。Alpaca 原生支持 Nvidia 和 AMD[^1] 加速。

:::tip[只需一键]

安装 Alpaca 后，Bluefin 会自动将 `Ctrl`-`Alt`-`Backspace` 绑定为 Alpaca 的快速启动键！

:::

### 配置

![Alpaca](/img/user-attachments/104c5263-5d34-497a-b986-93bb0a41c23e.png)

![image](/img/user-attachments/9fd38164-e2a9-4da1-9bcd-29e0e7add071.png)

[^1]: 要获得完整的 AMD 支持，还需要安装 Flatpak 扩展 `com.jeffser.Alpaca.Plugins.AMD`。

## 自动故障排查（WIP）

Bluefin 附带自动故障排查工具：

- [Work in progress](https://docs.projectbluefin.io/troubleshooting/)
