---
title: AI and Machine Learning
slug: /ai
---

Bluefin's [developer experience](/bluefin-dx) fully supports local AI development workflows. GPU Acceleration for both Nvidia and AMD are included out of the box and usually do not require any extra setup.

## Methodology

Bluefin was brought to life by [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions) and [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales). The artwork is free for you to use. It represents the delicate balance of life and is there to remind us that open source is an ecosystem that needs to be sustained. The software we make has an effect on the world: Bluefin might be put together by technology nerds, but it took two humans to show us the importance of the creativity of the human mind.

:::tip[AI is an extension of cloud native]

Bluefin's focus in AI is providing a generic API endpoint to the operating system that is controlled by the user. Similar to how Bluefin ships `podman`, we feel that `ramalama` and other great open source tools can be used for many useful purposes. Bluefin's AI integration will always be local-first and user controlled.

:::

## AI Lab with Podman Desktop

The [AI Lab extension](https://developers.redhat.com/products/podman-desktop/podman-ai-lab) can be installed inside the included Podman Desktop to provide a graphical interface for managing local models:

![image](https://github.com/user-attachments/assets/e5557952-3e62-499e-93a9-934c4d452be0)

## Ramalama

Install [Ramalama](https://github.com/containers/ramalama) via `brew install ramalama`: manage local models and is the prefered default experience. It's for people who work with local models frequently and need advanced features. It offers the ability to pull models from huggingface, ollama, and any container registry. By default it pulls from ollama.com, check the [Ramalama documentation](https://github.com/containers/ramalama/tree/main/docs) for more information.

Ramalama's command line experience is similar to Podman. Bluefin sets `rl` as an alias for `ramalama`, for brevity. Examples include:

```
rl pull llama3.2:latest
rl run llama3.2
rl run deepseek-r1
```

You can also serve the models locally:

```
rl serve deepseek-r1
```

Then go to `http://127.0.0.0:8080` in your browser.

Ramalama will automatically pull in anything your host needs to do the workload. The images are also stored in the same container storage as your other containers. This allows for centralized management of the models and other podman images:

```
❯ podman images
REPOSITORY                                 TAG         IMAGE ID      CREATED        SIZE
quay.io/ramalama/rocm                      latest      8875feffdb87  5 days ago     6.92 GB
```

### Integrating with Existing Tools

`ramalama serve` will serve an OpenAI compatible endpoint at `http://0.0.0.0:8080`, you can use this to configure tools that do not support ramalama directly:

![Newelle](https://github.com/user-attachments/assets/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe)

## AI Command Line Tools

The following AI-focused command-line tools are available via homebrew, install individually or use this command to install them all: `ujust bluefin-ai`

| Name                                                                | Description                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------ |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | All-in-one AI-Powered CLI Chat & Copilot               |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol AI agent CLI                            |
| [clio](https://formulae.brew.sh/formula/clio)                       | AI assistant for the command line powered by GPTScript |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Command-line interface for Google's Gemini API         |
| [mods](https://formulae.brew.sh/formula/mods)                       | AI on the command-line                                 |

## Alpaca Graphical Client

For light chatbot usage we recommend that users [install Alpaca](https://flathub.org/apps/com.jeffser.Alpaca) to manage and chat with your LLM models from within a native desktop application. Alpaca supports Nvidia and AMD[^1] acceleration natively.

:::tip[Only a keystroke away]

Bluefin binds `Ctrl`-`Alt`-`Backspace` as a quicklaunch for Alpaca automatically after you install it!

:::

### Configuration

![Alpaca](https://github.com/user-attachments/assets/104c5263-5d34-497a-b986-93bb0a41c23e)

![image](https://github.com/user-attachments/assets/9fd38164-e2a9-4da1-9bcd-29e0e7add071)
