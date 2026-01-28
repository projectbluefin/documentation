---
title: AI and Machine Learning
slug: /ai
---

## Methodology

Bluefin was created by engineers, but was brought to life by [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions) and [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales). The artwork is free for you to use and will always be made by humans. It is there to remind us that open source is an ecosystem that needs to be sustained. The software we make has an effect on the world. Bluefin's AI integration will always be user controlled, with a focus on open source models and tools. 

:::tip[AI is an extension of cloud native]

Bluefin's focus in AI is providing a generic API endpoint to the operating system that is controlled by the user. Just as Bluefin's operating system is built with [CNCF](https://cncf.io) tech like `bootc` and `podman`, this experience is powered by [Agentic AI Foundation](https://aaif.io/) tech like `goose`. With a strong dash of the open source components that power [RHEL Lightspeed](https://www.redhat.com/en/lightspeed). 

:::

## Bluespeed

"Bluespeed" is our collection of Bluefin's [developer experience](/bluefin-dx) tools and support for AI development workflows. We do this via community managed set of tool recommendations and configuration. We believe that the operating system should have more API endpoints for AI.

- Accelerate open standards in AI by shipping tools from the [Agentic AI Foundation](https://aaif.io/), [CNCF](https://cncf.io), and other foundations
- Make it easy to run and manage local LLM
   - Model management via `ramalama` and Docker Model, your choice
   - GPU Acceleration for both Nvidia and AMD are included out of the box and usually do not require any extra setup
- "Bring your own LLM" approach, it should be easy to switch between local models and hosted ones
   - [Goose](https://block.github.io/goose/) as the primary interface for local and hosted models
   - [OpenCode](https://opencode.ai) as coding-focused agent, available in TUI & Desktop versions
   - Provide access to various AI command-line tools installable via Brew
   - Highlight great AI/ML applications on FlatHub in our curated section in the App Store
- Forming **Bluespeed** presents us great [swag possibilities](https://store.projectbluefin.io) in the future

We work closely with the [RHEL Lightspeed team](https://github.com/rhel-lightspeed) by shipping their code, giving feedback, and pushing the envelope where we can. 

## Setup Your Local LLM

### AI Lab with Podman Desktop

The [AI Lab extension](https://developers.redhat.com/products/podman-desktop/podman-ai-lab) can be installed inside the included Podman Desktop to provide a graphical interface for managing local models:

![image](/img/user-attachments/e5557952-3e62-499e-93a9-934c4d452be0.png)

### Ramalama

Install [Ramalama](https://github.com/containers/ramalama) via `brew install ramalama`: manage local models and is the preferred default experience. It's for people who work with local models frequently and need advanced features. It offers the ability to pull models from [HuggingFace](https://huggingface.co/models), [Ollama](https://ollama.com), and any container registry. By default it pulls from ollama.com, check the [Ramalama documentation](https://github.com/containers/ramalama/tree/main/docs) for more information.

Ramalama's command line experience is similar to Podman. Bluefin sets `rl` as an alias for `ramalama`, for brevity. Examples include:

```
rl pull nemotron-3-nano:latest
rl run nemotron-3-nano
rl run gpt-oss:20b
```

You can also serve the models locally:

```
rl serve deepseek-v3.2
```

Then go to `http://127.0.0.0:8080` in your browser.

Ramalama will automatically pull in anything your host needs to do the workload. The images are also stored in the same container storage as your other containers. This allows for centralized management of the models and other podman images:

```
❯ podman images
REPOSITORY                                 TAG         IMAGE ID      CREATED        SIZE
quay.io/ramalama/rocm                      latest      8875feffdb87  5 days ago     6.92 GB
```
#### Integrating with Existing Tools

`ramalama serve` will serve an OpenAI compatible endpoint at `http://0.0.0.0:8080`, you can use this to configure tools that do not support ramalama directly:

![Newelle](/img/user-attachments/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe.png)

#### Other Ramalama tips

- Force Vulkan instead of ROCm: `ramalama serve --image quay.io/ramalama/ramalama gpt-oss:latest`
- Strix Halo users: `ramalama serve --image docker.io/kyuz0/amd-strix-halo-toolboxes:vulkan-radv gpt-oss:latest`
  - Check out [AMD Strix Halo Llama.cpp Toolboxes](https://github.com/kyuz0/amd-strix-halo-toolboxes) and [Donato Capitella's channel](https://www.youtube.com/@donatocapitella) for more information
 
### Running AI Agents in VS Code

Here is an example of using devcontainers to run agents inside containers for isolation: 

<iframe width="560" height="315" src="https://www.youtube.com/embed/w3kI6XlZXZQ?si=5pygGs5E_Qedf-S8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

### Docker Model Runner

Developer Mode (`ujust toggle-devmode`) came with Docker Engine and Docker Model Runner, letting you pull large language models from [Docker Hub](https://hub.docker.com/catalogs/models) and [HuggingFace](https://huggingface.co/models). Choose between llama.cpp and vLLM inference engines, with support for CUDA (NVIDIA) and Vulkan backend (AMD and Intel).

Check and test the capability:
```
docker model version
docker model run ai/smollm2
```

Pull a model to cache it locally:
```
docker model pull ai/devstral-small-2  # from Docker Hub
docker model pull hf.co/noctrex/GLM-4.7-MXFP4_MOE-GGUF # from HuggingFace
```

### LM Studio (WIP)

```
brew tap ublue-os/tap
brew install ublue-os/tap/lm-studio-linux
```

## Use with AI Command Line Tools

The following AI-focused command-line tools are available via homebrew, install individually or use this command to install them all: `ujust bbrew` and choose the `ai` menu option:

| Name                                                                | Description                                                      |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | All-in-one AI-Powered CLI Chat & Copilot                         |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol AI agent CLI                                      |
| [claude-code](https://formulae.brew.sh/cask/claude-code)            | Claude coding agent with desktop integration                     |
| [codex](https://formulae.brew.sh/cask/codex)                        | Code editor for OpenAI's coding agent that runs in your terminal |
| [copilot-cli](https://formulae.brew.sh/cask/copilot-cli)            | GitHub Copilot CLI for terminal assistance                       |
| [crush](https://github.com/charmbracelet/crush)                     | AI coding agent for the terminal, from charm.sh                  |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Command-line interface for Google's Gemini API                   |
| [kimi-cli](https://formulae.brew.sh/formula/kimi-cli)               | CLI for Moonshot AI's Kimi models                                |
| [llm](https://formulae.brew.sh/formula/llm)                         | Access large language models from the command line               |
| [lm-studio](https://lmstudio.ai/)                                   | Desktop app for running local LLMs                               |
| [mistral-vibe](https://formulae.brew.sh/formula/mistral-vibe)       | CLI for Mistral AI models                                        |
| [mods](https://formulae.brew.sh/formula/mods)                       | AI on the command-line, from charm.sh                            |
| [opencode](https://formulae.brew.sh/formula/opencode)               | AI coding agent for the terminal                                 |
| [qwen-code](https://formulae.brew.sh/formula/qwen-code)             | CLI for Qwen3-Coder models                                       |
| [ramalama](https://formulae.brew.sh/formula/ramalama)               | Manage and run AI models locally with containers                 |
| [whisper-cpp](https://formulae.brew.sh/formula/whisper-cpp)         | High-performance inference of OpenAI's Whisper model             |


## Use with AI Desktop Apps

### Alpaca

For light chatbot usage with local models, we recommend that users [install Alpaca](https://flathub.org/apps/com.jeffser.Alpaca) to manage and chat with your LLM models within a native GNOME desktop application. Alpaca supports Nvidia and AMD[^1] acceleration natively.

:::tip[Only a keystroke away]

Bluefin binds `Ctrl`-`Alt`-`Backspace` as a quicklaunch for Alpaca automatically after you install it!

:::

#### Configuration

![Alpaca](/img/user-attachments/104c5263-5d34-497a-b986-93bb0a41c23e.png)

![image](/img/user-attachments/9fd38164-e2a9-4da1-9bcd-29e0e7add071.png)

### Goose Desktop (WIP)

- Established desktop experience, recently ported as Brew cask
- Come with built-in tools as extensions, extendable using MCP
- Let you use existing CLI instances of Claude Code, Cursor Agent, Codex or Gemini CLI, in addition to inferences from Ollama and many cloud providers
- Available in Flathub soon!

```
brew tap ublue-os/tap
brew install ublue-os/tap/goose-linux
```

### OpenCode Desktop (WIP)

- Fresh from the oven, desktop version is currently in beta
- Focused on agentic coding experiences and easy access to switch between models from multiple providers when needed
- Coming with its own server instance, but you can connect to any instances of OpenCode, including your homelab or VPS, easily.

```
brew tap ublue-os/experimental-tap
brew install ublue-os/experimental-tap/opencode-desktop-linux
```

### Newelle (WIP)

[Install Newelle](https://flathub.org/en/apps/io.github.qwersyk.Newelle) 

## Automated Troubleshooting (WIP)

Bluefin ships with automated troubleshooting tools:

- [Work in progress](https://docs.projectbluefin.io/troubleshooting/)
