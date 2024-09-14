---
layout: page
title: AI and Machine Learning
permalink: /ai
---

# AI and Machine Learning

> Note: We want Bluefin to be the best developer environment for AI enthusiasts, help wanted!

## Local AI

[Ollama](https://ollama.ai/) allows the running of open-source large language models, such as Llama 3, locally. It bundles model weights, configuration, and data into a single package, defined by a Modelfile, and optimizes setup and configuration details, including GPU usage.

Bluefin-dx supports the installation of Ollama in different ways, for example by using the following `ujust` commands:

- `ujust ollama install` installs the CLI-version as a container.
- `ujust ollama install-open-webui` installs [Open Web UI](https://docs.openwebui.com/) & Ollama as a container.

During the installation process, there is the choice to install either a GPU or CPU-enabled version. Additionally, installation through Homebrew (`brew install ollama`) is required.

Homebrew will suggest you to start Ollama now using `brew services start ollama`: *do not run this command*, as it will interfer with the systemd services below.

`systemd` does not autostart the containers; instead, the user needs to activate the script manually by using `systemctl --user start ollama` or `systemctl --user start ollama-web`. The first time the `ollama` service is started, it pulls the [Ollama Docker image](https://hub.docker.com/r/ollama/ollama), which is why the service may seem to be hanging (you can view logs using `journalctl --user -xeu ollama.service`). The `systemd` scripts are saved under: `~/.config/containers/systemd`. The scripts are:

- `ollama.container` - which starts the CLI under port: 11434
- `ollama-web.container` - which starts the Open Web UI under port: 8080 ([http://localhost:11434](http://localhost:11434))
- `ollama.network`, the network name is set as "ollama"

To cross-check if the containers are launched correctly, you can use `podman ps --all`.

### Running the ollama open-webui

`ujust ollama-web` will set up ollama with the webui as a service unit in your user space: 

- Status: `systemctl status --user ollama-web`
- Restart:  `systemctl restart --user ollama-web`

You can also `start`, `stop`, and `disable` and `enable` the service unit. Open `localhost:8080` in your browser, then make yourself an account:

![image](https://github.com/user-attachments/assets/a9db5693-99d0-4cdc-b342-8f09610f2b66)


### Running ollama 

`ujust ollama` to get started! This will setup an ollama service unit in your user space. Use this one if you just want ollama without the web ui: 

- Status: `systemctl status --user ollama`
- Restart:  `systemctl restart --user ollama`

You can also `start`, `stop`, and `disable` and `enable` the service unit. 

### Desktop integration

[Install alpaca](https://flathub.org/apps/com.jeffser.Alpaca) to use a native desktop application. Alpaca supports Nvidia and AMD acceleration natively and includes ollama. If you prefer an all-GUI solution just use Alpaca and manage your models from within the application.

![image](https://github.com/user-attachments/assets/9fd38164-e2a9-4da1-9bcd-29e0e7add071)

If you use ollama via the command line regularly use `http://localhost:11434` in the settings to connect to your local setup: 

![image](https://github.com/user-attachments/assets/01a34931-1154-4272-b509-e78b6788ddc6)


### Terminal Integration

We recommend using [mods](https://github.com/charmbracelet/mods) to use  the provided ollama instance as an interface to your command line: 

![image](https://github.com/user-attachments/assets/639323cc-5e72-42bd-b8c7-7bccedf91bf2)

- Install mods: `brew install mods`
- Open the config file for mods: `mods --settings`
- Modify the config file with the model you've pulled with ollama:

![image](https://github.com/user-attachments/assets/0ee1f56d-1dd3-4075-bf90-5a551239e338)

and then make sure the ollama section in the config file matches the same thing:

![image](https://github.com/user-attachments/assets/dee94d87-522c-4e0e-b9b5-56da675f5219)

Save the file and then try it: 

![image](https://github.com/user-attachments/assets/784ad450-3754-4e2b-9b3e-4efd1f5621e3)


## Pytorch

Bluefin and Aurora include a NGC container that includes the latest [stable PyTorch from Nvidia](https://catalog.ngc.nvidia.com/orgs/nvidia/containers/pytorch) on top of Ubuntu LTS. It includes `python3`, `pip3` , `pandas`, `matplotlib`, and `scikit-learn`. 

> The additional `pip` packages are commonly used but not comprehensive. Only `pip` is used and `mamba` or `conda` are not currently tested.

### Pre-requisites

You must already be using `bluefin-dx-nvidia` as it's meant for those GPUs and has nvidia container toolkit support. If you want to test before downloading the larger nvidia container run `nvidia-smi`
inside a regular Ubuntu box (`distrobox create --nvidia -i ubuntu`) to check that everything works correctly. 

To create the box use the following command. **Note** that this container is large (20+ GB!):

```bash
ujust distrobox-mlbox
```

To enter the working environment:

```bash
distrobox enter mlbox
```

Then the init-hooks will run once. After which, you should be able to run:

```bash
nvidia-smi
```

To check if GPUs are seen and enter the python repo run:

```bash
import torch;torch.cuda.is_available()
```

Various tests can be run to test a transformers inference or training job, or to git clone a pytorch benchmarks repo and run single or multi gpu commands: E.g. to test multi-gpu setup on two 3090s:

```bash
git clone https://github.com/aime-team/pytorch-benchmarks.git
cd pytorch-benchmarks
python3 main.py --num_gpus 2 --compile --model bert-large-uncased --data_name squad --global_batch_size 24
```

On other operating systems, use [this .ini file](https://github.com/ublue-os/bluefin/blob/730f39caae21e48fb91f00010cf0cf8d32ee44bd/dx/usr/share/ublue-os/distrobox/pytorch-nvidia.ini) and run:

```bash
distrobox assemble create --file /path/to/your/mlbox.ini
```


Doc credits: @axelquack
