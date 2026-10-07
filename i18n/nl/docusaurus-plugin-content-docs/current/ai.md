---
title: AI en machine learning
slug: /ai
---

## Methodiek

Bluefin is gemaakt door ingenieurs, maar tot leven gebracht door [Jacob Schnurr](https://www.etsy.com/shop/JSchnurrCommissions) en [Andy Frazer](https://www.etsy.com/uk/shop/dragonsofwales). Het artwork is gratis om te gebruiken en zal altijd door mensen worden gemaakt. Het is er om ons te herinneren dat open source een ecosysteem is dat in stand gehouden moet worden. De software die we maken heeft een effect op de wereld. Bluefin's AI-integratie zal altijd door de gebruiker worden bestuurd, met focus op open source-modellen en -tools.

:::tip[AI is een uitbreiding van cloud native]

Bluefin's focus in AI is het bieden van een generieke API-endpoint aan het besturingssysteem dat door de gebruiker wordt bestuurd. Net zoals Bluefin's besturingssysteem is opgebouwd met [CNCF](https://cncf.io)-technologie zoals `bootc` en `podman`, wordt deze ervaring aangedreven door [Agentic AI Foundation](https://aaif.io/)-technologie zoals `goose`, met een sterke dosis open source-componenten die [RHEL Lightspeed](https://www.redhat.com/en/lightspeed) aandrijven.

:::

## AI-architectuur en -tools

Bluefin biedt open, door de gebruiker bestuurde API-endpoints aan het besturingssysteem voor AI-workflows. We doen dit via een door de community beheerde set aan toolaanbevelingen en -configuratie:

- “Bring your own LLM”-aanpak, het moet makkelijk zijn om tussen lokale en gehoste modellen te wisselen
  - [Goose](https://block.github.io/goose/) als primaire interface naar gehoste en lokale modellen
- Versnelling van open standaarden in AI door tools te leveren van de [Agentic AI Foundation](https://aaif.io/), [CNCF](https://cncf.io), en andere stichtingen
- Lokale LLM-servicebeheer
  - Modelbeheer via `llmman` en Docker Model Runner, jouw keuze
- GPU-versnelling voor zowel Nvidia als AMD is standaard meegeleverd en vereist doorgaans geen extra setup
- Uitstekende AI/ML-toepassingen op Flathub belichten in onze samengestelde sectie in de App Store
- Een goede reden om meer [merch te verkopen](https://store.projectbluefin.io)

Voor het deployen van reproduceerbare homelab- en multi-node AI/observability-infrastructuur, zie [Bluespeed](https://github.com/projectbluefin/bluespeed), Bluefin's homelab-fabriek aangedreven door KubeStellar, Flatcar, en [Knuckle](https://github.com/projectbluefin/knuckle).

We werken nauw samen met het [RHEL Lightspeed-team](https://github.com/rhel-lightspeed) door hun code te leveren, feedback te geven en waar we kunnen de grens op te schuiven.

## AI Lab met Podman Desktop

De [AI Lab-extentie](https://developers.redhat.com/products/podman-desktop/podman-ai-lab) kan worden geïnstalleerd binnen de meegeleverde Podman Desktop om een grafische interface te bieden voor het beheer van lokale modellen:

![image](/img/user-attachments/e5557952-3e62-499e-93a9-934c4d452be0.png)

## AI-commandoregeltools

De volgende AI-gerichte commandoregeltools zijn beschikbaar via Homebrew (`brew install <name>`):

| Naam                                                                | Beschrijving                                                     |
| ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [aichat](https://formulae.brew.sh/formula/aichat)                   | All-in-one AI-gedreven CLI Chat & Copilot                        |
| [block-goose-cli](https://formulae.brew.sh/formula/block-goose-cli) | Block Protocol AI agent CLI                                      |
| [claude-code](https://formulae.brew.sh/cask/claude-code)            | Claude coding agent met desktopintegratie                        |
| [codex](https://formulae.brew.sh/cask/codex)                        | Code-editor voor OpenAI's coding agent die in je terminal draait |
| [copilot-cli](https://formulae.brew.sh/cask/copilot-cli)            | GitHub Copilot CLI voor terminalassistent                        |
| [crush](https://github.com/charmbracelet/crush)                     | AI coding agent voor de terminal, van charm.sh                   |
| [gemini-cli](https://formulae.brew.sh/formula/gemini-cli)           | Commandoregelinterface voor Google's Gemini API                  |
| [kimi-cli](https://formulae.brew.sh/formula/kimi-cli)               | CLI voor Moonshot AI's Kimi-modellen                             |
| [llm](https://formulae.brew.sh/formula/llm)                         | Grote taalmodellen benaderen vanaf de commandoregel              |
| [lm-studio](https://lmstudio.ai/)                                   | Desktop-app om lokale LLM's te draaien                           |
| [mistral-vibe](https://formulae.brew.sh/formula/mistral-vibe)       | CLI voor Mistral AI-modellen                                     |
| [opencode](https://formulae.brew.sh/formula/opencode)               | AI coding agent voor de terminal                                 |
| [qwen-code](https://formulae.brew.sh/formula/qwen-code)             | CLI voor Qwen3-Coder-modellen                                    |
| [llmman](https://github.com/llmmanorg/llmman)                       | Beheer en draai AI-modellen lokaal met containers                |
| [whisper-cpp](https://formulae.brew.sh/formula/whisper-cpp)         | Prestatiegericht infereren van OpenAI's Whisper-model            |

## llmman

Installeer [llmman](https://github.com/llmmanorg/llmman) via `brew install llmmanorg/tap/llmman`: beheer lokale modellen en is de bij voorkeur standaardervaring. Het is voor mensen die vaak met lokale modellen werken en geavanceerde functies nodig hebben. Het biedt de mogelijkheid om modellen te trekken van huggingface, ollama, en elke containerregistry. Zie de [llmman-documentatie](https://github.com/llmmanorg/llmman#readme) voor meer information.

Gebruik het volledige `llmman`-command in Bluefin, overeenkomstig de upstream llmman-documentatie.

De commandoregelervaring van llmman omvat:

```
llmman pull llama3.2:latest
llmman run llama3.2
llmman run deepseek-r1
```

Je kan de modellen ook lokaan serveren:

```
llmman serve
```

Ga daarna naar `http://127.0.0.1:17434` in je browser.

### Integreren met bestaande tools

`llmman serve` servert een OpenAI-compatible endpoint op `http://127.0.0.1:17434`, je kan dit gebruiken om tools te configureren die llmman niet rechtstreeks ondersteunen:

![Newelle](/img/user-attachments/ff079ed5-43af-48fb-8e7b-e5b9446b3bfe.png)

### AI-agents draaien in VS Code

Hier is een voorbeeld van het gebruik van devcontainers om agents binnen containers te draaien voor isolatie:

<iframe width="560" height="315" src="https://www.youtube.com/embed/w3kI6XlZXZQ?si=5pygGs5E_Qedf-S8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

## Docker Model Runner

[Docker Model Runner](https://docs.docker.com/model-runner/) is Docker's ingebouwde lokale LLM-service, meegeleverd in Bluefin naast llmman. Het draait modellen uit [Docker Hub's AI catalogus](https://hub.docker.com/u/ai) en biedt aan een OpenAI-compatible API — geen aparte serversetup nodig.

### Basisgebruik

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

### API-endpoint

Docker Model Runner servert een OpenAI-compatible endpoint op `http://localhost:12434` dat je met elke tool kan gebruiken die de OpenAI-API-formaat ondersteunt — Goose, aichat, VSCode-extenties, en meer.

### llmman vs Docker Model Runner

Beide bieden een lokale OpenAI-compatible API. Kies op basis van je workflow:

|              | llmman                             | Docker Model Runner     |
| ------------ | ---------------------------------- | ----------------------- |
| Modelbronnen | OCI-registers, Ollama, HuggingFace | Docker Hub AI catalogus |
| Engine       | Podman                             | Docker Engine           |
| Snelle comm. | `llmman`                           | `docker model`          |

Zie de [Docker Model Runner-documentatie](https://docs.docker.com/model-runner/) voor de volledige modelcatalogus en configuratieopties.

## Alpaca grafische client

Voor licht chatbot-gebruik aanbevolen we dat gebruikers [Alpaca installeren](https://flathub.org/en/apps/com.jeffser.Alpaca) om hun LLM-modellen te beheeren en te chatten vanuit een native desktop-app. Alpaca ondersteunt Nvidia en AMD[^1]-versnelling natively.

:::tip[Alleen een toetsdruk verwijderd]

Bluefin bindt `Ctrl`-`Alt`-`Backspace` als quicklaunch voor Alpaca automatisch nadat je het geïnstalleerd hebt!

:::

### Configuratie

![Alpaca](/img/user-attachments/104c5263-5d34-497a-b986-93bb0a41c23e.png)

![image](/img/user-attachments/9fd38164-e2a9-4da1-9bcd-29e0e7add071.png)

[^1]: Voor volledige AMD-ondersteuning moet ook de Flatpak-extensie `com.jeffser.Alpaca.Plugins.AMD` geïnstalleerd zijn.

## Geautomatiseerd probleemoplossen (WIP)

Bluefin levert geautomatiseerde probleemoplossingstools:

- [In ontwikkeling](https://docs.projectbluefin.io/troubleshooting/)
