---
title: AI and Machine Learning
slug: /ai
---

# AI and Machine Learning

GPU Acceleration for both Nvidia and AMD are included out of the box and usually do not require any extra setup. 

### Ollama GUI

[Install Alpaca](https://flathub.org/apps/com.jeffser.Alpaca) to manage and chat with your LLM models from within a native desktop application. Alpaca supports Nvidia and AMD acceleration natively and *includes ollama*. 

![image](https://github.com/user-attachments/assets/9fd38164-e2a9-4da1-9bcd-29e0e7add071)

### Ollama API

Since Alpaca doesn't expose any API, if you need other applications than Alpaca to interact with your ollama instance (for example an IDE) you should consider installing it [in a docker container](https://hub.docker.com/r/ollama/ollama).

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

> **NOTE:** if you still want to use Alpaca as one of the way of interacting with Ollama, you can open the application, then go to *Preferences*, toggle the option *Use the Remote Connection to Ollama*, specify the endpoint above (`http://127.0.0.1:11434`) as *Server URL* (leave *Bearer Token* empty) in the dialog that will pop up and then press *Connect*.
> This way you should be able to manage the models installed on your ollama container and chat with them from the Alpaca GUI. 
