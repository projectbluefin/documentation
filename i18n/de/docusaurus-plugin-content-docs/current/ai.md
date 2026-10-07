---
title: KI und Maschinelles Lernen
slug: /ai
---

## Methodik

Bluefin wurde von Ingenieuren entwickelt, aber zum Leben erweckt von [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions) und [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales). Die Grafiken stehen dir kostenlos zur Verfügung und werden immer von Menschen gemacht. Sie sollen uns daran erinnern, dass Open Source ein Ökosystem ist, das gepflegt werden muss. Die Software, die wir machen, hat eine Wirkung auf die Welt. Bluefins KI-Integration wird immer nutzergesteuert sein, mit Fokus auf Open-Source-Modelle und -Tools.

:::tip[KI ist eine Erweiterung von Cloud Native]

Bluefins Fokus in der KI liegt darauf, einen generischen API-Endpunkt zum Betriebssystem bereitzustellen, der vom Nutzer kontrolliert wird. Genau wie Bluefins Betriebssystem mit [CNCF](https://cncf.io)-Technologie wie `bootc` und `podman` gebaut ist, wird diese Erfahrung durch Technologie der [Agentic AI Foundation](https://aaif.io/) wie `goose` betrieben. Mit einer kräftigen Prise der Open-Source-Komponenten, die [RHEL Lightspeed](https://www.redhat.com/en/lightspeed) antreiben.

:::

## KI-Architektur und Tooling

Bluefin stellt offene, nutzergesteuerte API-Endpunkte zum Betriebssystem für KI-Workflows bereit. Wir tun dies über einen von der Community verwalteten Satz von Tool-Empfehlungen und Konfiguration:

- „Bring your own LLM“-Ansatz, es sollte einfach sein, zwischen lokalen und gehosteten Modellen zu wechseln
  - [Goose](https://block.github.io/goose/) als primäre Schnittstelle zu gehosteten und lokalen Modellen
- Beschleunigung offener Standards in der KI durch das Ausliefern von Tools von der [Agentic AI Foundation](https://aaif.io/), [CNCF](https://cncf.io) und anderen Stiftungen
- Verwaltung lokaler LLM-Dienste
  - Modellverwaltung via `llmman` und Docker Model Runner, deine Wahl
- GPU-Beschleunigung für sowohl Nvidia als auch AMD ist standardmäßig enthalten und erfordert normalerweise keine zusätzliche Einrichtung
- Hervorhebung großartiger KI/ML-Anwendungen auf Flathub in unserem kuratierten Bereich im App Store
- Ein großartiger Grund, [mehr Swag zu verkaufen](https://store.projectbluefin.io)

Für die Bereitstellung reproduzierbarer Homelab- und Multi-Node-KI/Observability-Infrastruktur siehe [Bluespeed](https://github.com/projectbluefin/bluespeed), Bluefins Homelab-Factory, betrieben mit KubeStellar, Flatcar und [Knuckle](https://github.com/projectbluefin/knuckle).

Wir arbeiten eng mit dem [RHEL-Lightspeed-Team](https://github.com/rhel-lightspeed) zusammen, indem wir deren Code ausliefern, Feedback geben und die Grenzen ausloten wo wir können.

## KI-Lab mit Podman Desktop

Die [AI-Lab-Erweiterung](https://developers.redhat.com/products/podman-desktop/podman-ai-lab) kann im enthaltenen Podman Desktop installiert werden, um eine grafische Oberfläche zur Verwaltung lokaler Modelle bereitzustellen:

![image](/img/user-attachments/e5557952-3e62-499e-93a9-934c4d452be0.png)

## KI-Befehlszeilen-Tools

Die folgenden KI-fokussierten Befehlszeilen-Tools sind via Homebrew verfügbar (`brew install <name>`):

| Name                                                                | Beschreibung                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | All-in-One-KI-gestützte CLI-Chat- und Copilot-App                  |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol KI-Agent-CLI                                        |
| [claude-code](https://formulae.brew.sh/cask/claude-code)            | Claude-Coding-Agent mit Desktop-Integration                        |
| [codex](https://formulae.brew.sh/cask/codex)                        | Code-Editor für OpenAIs Coding-Agent, der in deinem Terminal läuft |
| [copilot-cli](https://formulae.brew.sh/cask/copilot-cli)            | GitHub-Copilot-CLI für Terminal-Unterstützung                      |
| [crush](https://github.com/charmbracelet/crush)                     | KI-Coding-Agent für das Terminal, von charm.sh                     |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Befehlszeilen-Schnittstelle für Googles Gemini-API                 |
| [kimi-cli](https://formulae.brew.sh/formula/kimi-cli)               | CLI für Moonshot AIs Kimi-Modelle                                  |
| [llm](https://formulae.brew.sh/formula/llm)                         | Zugriff auf große Sprachmodelle von der Befehlszeile               |
| [lm-studio](https://lmstudio.ai/)                                   | Desktop-App zum Ausführen lokaler LLMs                             |
| [mistral-vibe](https://formulae.brew.sh/formula/mistral-vibe)       | CLI für Mistral-AI-Modelle                                         |
| [opencode](https://formulae.brew.sh/formula/opencode)               | KI-Coding-Agent für das Terminal                                   |
| [qwen-code](https://formulae.brew.sh/formula/qwen-code)             | CLI für Qwen3-Coder-Modelle                                        |
| [llmman](https://github.com/llmmanorg/llmman)                       | KI-Modelle lokal mit Containern verwalten und ausführen            |
| [whisper-cpp](https://formulae.brew.sh/formula/whisper-cpp)         | Hochleistungs-Inferenz von OpenAIs Whisper-Modell                  |

## llmman

Installiere [llmman](https://github.com/llmmanorg/llmman) via `brew install llmmanorg/tap/llmman`: verwalte lokale Modelle und ist die bevorzugte Standarderfahrung. Es ist für Leute, die häufig mit lokalen Modellen arbeiten und erweiterte Funktionen benötigen. Es bietet die Möglichkeit, Modelle von Huggingface, Ollama und jeder Container-Registry zu pullen. Sieh in die [llmman-Dokumentation](https://github.com/llmmanorg/llmman#readme) für weitere Informationen.

Verwende den vollständigen `llmman`-Befehl in Bluefin, passend zur Upstream-llmman-Dokumentation.

llmmans Befehlszeilen-Erfahrung umfasst:

```
llmman pull llama3.2:latest
llmman run llama3.2
llmman run deepseek-r1
```

Du kannst die Modelle auch lokal bereitstellen:

```
llmman serve
```

Gehe dann in deinem Browser zu `http://127.0.0.1:17434`.

### Integration mit bestehenden Tools

`llmman serve` stellt einen OpenAI-kompatiblen Endpunkt unter `http://127.0.0.1:17434` bereit; du kannst dies verwenden, um Werkzeuge zu konfigurieren, die llmman nicht direkt unterstützen:

![Newelle](/img/user-attachments/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe.png)

### KI-Agenten in VS Code ausführen

Hier ist ein Beispiel für die Verwendung von Devcontainern, um Agenten innerhalb von Containern zur Isolierung auszuführen:

<iframe width="560" height="315" src="https://www.youtube.com/embed/w3kI6XlZXZQ?si=5pygGs5E_Qedf-S8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Docker Model Runner

[Docker Model Runner](https://docs.docker.com/model-runner/) ist Dockers eingebauter lokaler LLM-Dienst, der in Bluefin neben llmman enthalten ist. Er führt Modelle aus dem [AI-Katalog von Docker Hub](https://hub.docker.com/u/ai) aus und stellt eine OpenAI-kompatible API bereit — keine separate Server-Einrichtung erforderlich.

### Grundlegende Verwendung

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

### API-Endpunkt

Docker Model Runner stellt einen OpenAI-kompatiblen Endpunkt unter `http://localhost:12434` bereit, den du mit jedem Tool verwenden kannst, das das OpenAI-API-Format unterstützt — Goose, aichat, VSCode-Erweiterungen und mehr.

### llmman vs. Docker Model Runner

Beide bieten eine lokale OpenAI-kompatible API. Wähle basierend auf deinem Workflow:

|               | llmman                              | Docker Model Runner   |
| ------------- | ----------------------------------- | --------------------- |
| Modellquellen | OCI-Registries, Ollama, HuggingFace | Docker Hub AI-Katalog |
| Engine        | Podman                              | Docker Engine         |
| Schnellbefehl | `llmman`                            | `docker model`        |

Sieh in die [Docker Model Runner-Dokumentation](https://docs.docker.com/model-runner/) für den vollständigen Modellkatalog und die Konfigurationsoptionen.

## Alpaca Grafischer Client

Für leichte Chatbot-Nutzung empfehlen wir, dass Nutzer [Alpaca installieren](https://flathub.org/en/apps/com.jeffser.Alpaca), um ihre LLM-Modelle aus einer nativen Desktop-Anwendung heraus zu verwalten und mit ihnen zu chatten. Alpaca unterstützt Nvidia- und AMD[^1]-Beschleunigung nativ.

:::tip[Nur einen Tastendruck entfernt]

Bluefin bindet `Ctrl`-`Alt`-`Backspace` als Schnellstart für Alpaca, nachdem du es installiert hast!

:::

### Konfiguration

![Alpaca](/img/user-attachments/104c5263-5d34-497a-b986-93bb0a41c23e.png)

![image](/img/user-attachments/9fd38164-e2a9-4da1-9bcd-29e0e7add071.png)

[^1]: Für vollständige AMD-Unterstützung muss zusätzlich die Flatpak-Erweiterung `com.jeffser.Alpaca.Plugins.AMD` installiert werden.

## Automatisierte Fehlerbehebung (WIP)

Bluefin wird mit automatisierten Fehlerbehebungs-Tools ausgeliefert:

- [In Arbeit](https://docs.projectbluefin.io/troubleshooting/)
