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

[Ramalama](https://github.com/containers/ramalama) is included to manage local models and is the prefered default experience. It's for people who work with local models frequently and need advanced features. It offers the ability to pull models from huggingface, ollama, and any container registry. By default it pulls from ollama.com, check the [Ramalama documentation](https://github.com/containers/ramalama/tree/main/docs) for more information.

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

## Alpaca Graphical Client

For light chatbot usage we recommend that users [install Alpaca](https://flathub.org/apps/com.jeffser.Alpaca) to manage and chat with your LLM models from within a native desktop application. Alpaca supports Nvidia and AMD[^1] acceleration natively.

:::tip[Only a keystroke away]

Bluefin binds `Ctrl`-`Alt`-`Backspace` as a quicklaunch for Alpaca automatically after you install it!

:::

### Configuration

![Alpaca](https://github.com/user-attachments/assets/104c5263-5d34-497a-b986-93bb0a41c23e)

![image](https://github.com/user-attachments/assets/9fd38164-e2a9-4da1-9bcd-29e0e7add071)

## Running Ollama as a Service

Ollama can also be used for people who prefer to use that tool. If you want third party tools to integrate with it, (for example an IDE) you should consider installing it [in a docker container](https://hub.docker.com/r/ollama/ollama).

To do so, first configure docker to use the nvidia drivers (that come preinstalled with Bluefin) with:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Then, choose a folder where to install the ollama container (for example `~/Containers/ollama`) and inside it create a new file named `docker-compose.yaml` with the following content:

```yaml
---
services:
  ollama:
    image: ollama/ollama
    container_name: ollama
    restart: unless-stopped
    ports:
      - 11434:11434
    volumes:
      - ./ollama_v:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities:
                - gpu
```

Finally, open a terminal in the folder containing the file just created and start the container with

```bash
docker compose up -d
```

and your ollama instance should be up and running at `http://127.0.0.1:11434`!

> **NOTE:** if you still want to use Alpaca to interact with Ollama, you can open the application, then go to _Preferences_, toggle the option _Use the Remote Connection to Ollama_, specify the endpoint above (`http://127.0.0.1:11434`) as _Server URL_ (leave _Bearer Token_ empty) in the dialog that will pop up and then press _Connect_.
> This way you should be able to manage the models installed on your ollama container and chat with them from the Alpaca GUI.
