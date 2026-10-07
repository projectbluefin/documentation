---
slug: /bluefin-dx
---

# Entwicklermodus

Die Bluefin Developer Experience (`bluefin-dx`) ist ein dediziertes Entwickler-Image mit gebündelten Tools. Im Gegensatz zu herkömmlichen Linux-Systemen sind Betriebssystem und Entwicklungsumgebung explizit und absichtlich getrennt. Das bedeutet, dass Tooling nicht auf dem Host installiert wird, sondern containerisiert ist, in einer virtuellen Maschine oder auf das Home-Verzeichnis des Nutzers beschränkt. Es ist darauf ausgelegt, diese Anwendungsfälle zu erfüllen:

Bluefin ist bestrebt, Folgendes auszuliefern:

- Die leistungsstärkste [cloud-native Entwicklungsumgebung](https://landscape.cncf.io/) der Welt
- Volle Virtualisierungsunterstützung rund um QEMU/KVM sowie Unterstützung für Docker und Incus

:::info[Gemeinsam stärker]

Es gibt [15,6 Millionen Cloud-Native-Entwickler](https://www.cncf.io/announcements/2025/11/11/cncf-and-slashdata-survey-finds-cloud-native-ecosystem-surges-to-15-6m-developers/) auf der Welt. Unser Workflow basiert auf den Entwicklungslehren aus diesen Techniken

:::

## Der Cloud-Native-Entwicklungsansatz

Bluefin geht „all in“ auf Cloud-Native-Entwicklung und wird anders verwendet als eine traditionelle Distribution wie Ubuntu:

- Entwicklung erfolgt in Containern; gängige Container-Muster sind:
  - [Devcontainer](https://containers.dev/) mit VSCode, JetBrains oder Neovim
  - [Podman Desktop](https://podman-desktop.io/docs/intro) für Container-Entwicklung mit grafischer (GUI-)Oberfläche. Hier ist [ein Beispiel für ein Podman/VSCode-Setup](https://podman-desktop.io/blog/2025/05/05/vs-code-with-podman-desktop) — diese Erweiterungen sind in Bluefin enthalten
  - [Podman](https://podman.io/docs) oder [Docker](https://docs.docker.com/reference/cli/docker/) Befehlszeilen-Container-Verwaltung.
- Befehlszeilen-Anwendungen werden mit [Homebrew](https://brew.sh) installiert
- Vorkonfigurierte Ad-hoc-Container für Ubuntu, Fedora und Wolfi sind enthalten. Verwende die Distribution, die du möchtest.

Dies unterscheidet sich von traditionellen Distributionen, indem es den Entwicklungsprozess betriebssystemagnostisch macht. Es gibt auf Bluefin kein Äquivalent zu `apt install php`; Entwicklung erfolgt mit `podman` oder `docker` direkt über eine IDE.

Wir glauben auch an einfachen Zugang zu anderen florierenden Ökosystemen wie Python via `uv`. Wir werfen das Handtuch auf „ein Linux-System-Paketmanager, um sie alle zu beherrschen“, weil diese Ökosysteme selbst Giganten sind. Kritiker werden sagen, dass wir zu viele Paketmanager ausliefern; wir sagen, dass wir keine Paketmanager ausliefern, sondern _Ökosysteme, die Nutzer wollen_. Und diese modernen Paketmanager sind für eine Welt gebaut, die auf Containern läuft, weil das tatsächlich stimmt. Und wir wollen sie out of the box auf unseren Desktops.

:::tip[Warum Cloud Native?]

Wir haben das Cloud-Native-Muster gewählt, weil lokale Entwicklung in Containern die Bereitstellung von Containern auf moderner Infrastruktur ermöglicht.

:::

![image](/img/user-attachments/51415b6c-b7fe-45e9-af74-c01694b26fbe.png)

Das Muster in `bluefin-dx` (und `aurora-dx`) dreht sich um [Devcontainer](https://containers.dev). Da Devcontainer im Git-Repository des Projekts leben, können sie auf jedem Betriebssystem bereitgestellt werden: Linux, macOS oder Windows (via WSL). Dies ermöglicht „von Natur aus verteilte“ Entwicklung und vermeidet, dass Linux-Nutzer „die Außenseiter“ sind, wenn sie mit Teamkollegen auf anderen Betriebssystemen arbeiten.

Jedes Projekt enthält eine deklarative Umgebung, die den Nutzer mit einem „Best Practice“-Cloud-Native-Workflow out of the box starten lassen soll. Der [Ultimate Guide to Dev Containers](https://web.archive.org/web/20260313112015/https://www.daytona.io/dotfiles/ultimate-guide-to-dev-containers) hat einen guten Beitrag über die Vorteile der Verwendung von Devcontainern. Das bedeutet, dass die Entwicklungsumgebung in der Versionsverwaltung gehalten wird, statt an den Host gekoppelt zu sein.

Homebrew kann auch verwendet werden, um Entwicklungstools zu installieren. Es wird jedoch empfohlen, dies zu vermeiden und die Abhängigkeiten des Projekts in der Versionsverwaltung zu deklarieren. Es ist manchmal so bequem, [it's okay](https://www.youtube.com/shorts/lKwavoyaaFA).

Mise ist ein Tool, mit dem du bestimmte Versionen von Anwendungen für ein Projekt installieren kannst (zum Beispiel Node 20 in einem Projekt und Node 21 in einem anderen). Du kannst die `mise.toml`-Datei in deinem Repository verwenden, um festzuhalten, welche bestimmten Tools du benötigst. [Diese können auch global installiert werden](https://mise.jdx.dev/configuration.html#global-config-config-mise-config-toml). Dies kann ähnlich wie Devcontainer verwendet werden, erfordert aber nicht, dass du in einen Container wechselst, um es zu verwenden.

Du kannst immer verwenden, was du willst. Du musst nicht alles hier verwenden, um produktiv zu sein — am Ende des Tages ist es dein Computer und dies ist ein Satz von Standards.

## Entwicklermodus aktivieren

Das Aktivieren des Entwicklermodus ist ein zweistufiger Prozess:

### Schritt 1: Aktivieren

`ujust devmode` zum Aktivieren oder Deaktivieren des dx-Modus, dann neu starten:

![image](/img/user-attachments/76df5201-da02-42d0-bec9-fad259df9b0d.png)

### Schritt 2: Füge dich den richtigen Gruppen hinzu

`ujust dx-group` — um deinen Benutzer-Account den richtigen Gruppen hinzuzufügen. Dann neu starten. Dieser Schritt muss nur einmal durchgeführt werden.

Wie bei allen Universal-Blue-Images ist der Wechsel atomar, was ein sauberes Umschalten zwischen den Modi je nach Anwendungsfall ermöglicht.

## Funktionen

### Visual Studio Code mit Docker

[Visual Studio Code](https://code.visualstudio.com/) ist im Image als Standard-IDE enthalten. Es kommt mit der bereits installierten [Devcontainer-Erweiterung](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers). Es ist die empfohlene Entwicklererfahrung, also starte hier, wenn du neu in der containerisierten Entwicklung bist!

- [Dev Containers-Dokumentation](https://code.visualstudio.com/docs/devcontainers/containers) — du kannst die meisten Installationsanweisungen überspringen und direkt zum [Tutorial](https://code.visualstudio.com/docs/devcontainers/tutorial#_install-the-extension) gehen
- [Dev Containers-Spezifikation](https://containers.dev/)
- [Beginner's Series to: Dev Containers](https://www.youtube.com/watch?v=b1RavPr_878) — großartiges Einführungs-Tutorial vom [VS Code YouTube-Kanal](https://www.youtube.com/@code/videos)

Die aktuellste [Docker Engine](https://docs.docker.com/engine/) ist standardmäßig enthalten und ist als Standard-Container-Runtime für VSCode eingerichtet. [docker compose](https://danielquinn.org/blog/developing-with-docker/) zu verwenden ist auch eine großartige Möglichkeit, in die Container-Entwicklung einzusteigen, und ist eine Option, wenn Devcontainer nicht zu deinem Stil passen. Beachte, dass Docker Desktop nicht verfügbar ist; verwende Podman Desktop für grafische Container-Verwaltung.

#### Podman mit Dev Containern verwenden

Die Dev-Containers-Erweiterung verwendet standardmäßig Docker. Um sie auf Podman umzustellen, füge diese Einstellungen zu VS Code hinzu:

```json
"dev.containers.dockerComposePath": "podman-compose"
"dev.containers.dockerPath": "podman"
"dev.containers.dockerSocketPath": "/run/user/1000/podman/podman.sock"
```

Führe `systemctl --user status podman.socket` aus, um den Socket-Pfad für deine Benutzer-ID zu bestätigen. Für rootful Podman verwende `/run/podman/podman.sock`.

**SELinux-Fehlerbehebung:** Wenn dein Devcontainer mit SELinux-Zugriffsfehlern nicht startet (prüfe `ausearch -m avc -ts recent`), führe `restorecon -R -v $HOME/.local/share` aus. Für Volume-Mount-Fehler führe `restorecon -R -v /path/to/your/project` aus. Als letztes Mittel kannst du die SELinux-Beschriftung für einen bestimmten Container in `.devcontainer/devcontainer.json` deaktivieren:

```json
{
  "runArgs": ["--security-opt", "label=disable"]
}
```

### Podman und Podman Desktop

![Podman Desktop](/img/user-attachments/69f64ed1-7fcc-4040-9a3d-12b71308da1b.png)

[Podman Desktop](https://podman-desktop.io/) ist enthalten, um Container-Verwaltung bereitzustellen. Sieh in die [Podman Desktop-Dokumentation](https://podman-desktop.io/docs/intro) für weitere Informationen. Alle Upstream-`podman`-Tools sind enthalten. Dies ist die Standard-System-Container-Runtime und ist die empfohlene Entwicklerkonfiguration für neue Nutzer.

### Eingebaute Performance-Tools

[Sysprof](https://www.sysprof.com/) ist als systemweiter Performance-Profiler enthalten. Sowie [Brendan Greggs](https://www.brendangregg.com/) empfohlene CLI-Tools:

- `bcc`, `bpftrace`, `iproute2`, `nicstat`, `numactl`, `sysprof`, `sysstat`, `tiptop`, `trace-cmd` und `util-linux`

Dank an Ubuntu und Canonical für die [detaillierte Spezifikation](https://discourse.ubuntu.com/t/spec-include-performance-tooling-in-ubuntu/43134) und Begründung. Das Projekt hofft, dass die Aufnahme von Performance-Tools zu [besserer Upstream-Software führen wird](https://blogs.gnome.org/chergert/2024/09/25/messaging-needs/).

### Quality-of-Life-Verbesserungen

- Eine Sammlung gut kuratierter Monospace-Schriften
- [Just](https://github.com/casey/just) Task-Runner für Automatisierungsaufgaben
- `fish` und `zsh` als optionale Shells verfügbar

#### Pet-Container

Pet-Container sind als interaktive Terminals via [Distrobox](https://distrobox.it/) verfügbar. Verwalte diese über die enthaltene [DistroShelf](https://github.com/ranfdev/DistroShelf)-Anwendung, verfügbar über das Logomenü oben links auf deinem Desktop unter „Container“:

![image](/img/user-attachments/bdab71b0-c04a-4562-a73d-396d4b907060.png)

Verwende die DistroShelf-Oberfläche, um deine eigenen Pet-Container aus der in der Liste enthaltenen Distribution zu erstellen:

![image](/img/user-attachments/2daf276d-2aed-47b9-9792-923d674ef226.png)

Für CLI-Krieger kannst du deine Container mit der eingebauten Container-Unterstützung des Terminals verwalten:

![image](/img/user-attachments/2a4dc4b5-f1a8-4781-80a4-92ea4dfeeb97.png)

Das enthaltene [Terminal](https://gitlab.gnome.org/GNOME/ptyxis) enthält ein Host-Terminal, sodass du schnell zwischen Containern und dem Host wechseln kannst.

- Das Standard-Terminal ist [Ptyxis](https://gitlab.gnome.org/GNOME/ptyxis), das eingebaute Integration von Distrobox-Containern enthält. Es ist im Menü als „Terminal“ aliasiert. Es ist standardmäßig auf <kbd>Strg</kbd>-<kbd>Alt</kbd>-<kbd>Eingabe</kbd> zum Schnellstart gebunden
- [Podman Desktop](https://flathub.org/apps/io.podman_desktop.PodmanDesktop) — Container und Kubernetes für Anwendungsentwickler
- [Pods](https://flathub.org/apps/com.github.marhkb.Pods) ist auch eine großartige Möglichkeit, deine Container grafisch zu verwalten

## Andere Tools

### JetBrains

`ujust jetbrains-toolbox` holt und installiert die [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app)-Anwendung, die die Installation der JetBrains-Tool-Sammlung verwaltet. Diese Anwendung übernimmt Installation, Entfernung und Upgrade der JetBrains-Produkte und wird vollständig in deinem Home-Verzeichnis gehandhabt, unabhängig vom Betriebssystem-Image. Wir empfehlen nicht, die JetBrains-Flatpaks zu verwenden.

- Sieh in die [JetBrains-Dokumentation](https://www.jetbrains.com/help/idea/podman.html) zur Integration dieser Tools mit der Podman-Runtime.
- Sieh dir an, wie du [JetBrains mit Devcontainern einrichtest](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html)
- [Deinstallationsanweisungen](https://toolbox-support.jetbrains.com/hc/en-us/articles/115001313270-How-to-uninstall-Toolbox-App-)

Der JetBrains-Blog hat auch weitere Informationen zur JetBrains-Dev-Containers-Unterstützung:

- [Dev Containers in JetBrains-IDEs verwenden — Teil 1](https://blog.jetbrains.com/idea/2024/07/using-dev-containers-in-jetbrains-ides-part-1/)

### Neovim

`brew install neovim devcontainer` und folge dann diesen Anweisungen für ein Devcontainer-Setup:

- [Neovim mit Devcontainern ausführen](https://cadu.dev/running-neovim-on-devcontainers/)

### Virtualisierung und Container-Runtimes

- [virt-manager](https://virt-manager.org/) und zugehörige Tools (KVM, qemu)
- [Incus](https://linuxcontainers.org/incus/) stellt System-Container bereit

### Lokale Anwendungsentwicklung

[GNOME Builder](https://developer.gnome.org/documentation/introduction/builder.html) ist der empfohlene Anwendungs-Stack zum Erstellen von Anwendungen.

### Kubernetes {#kubernetes}

Installiere einen gemeinsamen Satz von Tools, die von Kubernetes-Administratoren verwendet werden, via Homebrew (`brew install <name>`):

| Name                                                     | Beschreibung                                                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [cdk8s](https://formulae.brew.sh/formula/cdk8s)          | Definiert Kubernetes-Anwendungen und wiederverwendbare Abstraktionen mit vertrauten Programmiersprachen                      |
| [dagger](https://formulae.brew.sh/formula/dagger)        | Ein portables Devkit für CI/CD-Pipelines                                                                                     |
| [grype](https://formulae.brew.sh/formula/grype)          | Ein Vulnerability-Scanner für Container-Images und Dateisysteme                                                              |
| [helm](https://formulae.brew.sh/formula/helm)            | Der Paketmanager für Kubernetes                                                                                              |
| [k0sctl](https://k0sproject.io/)                         | Ein Befehlszeilen-Tool zum Bootstrappen und Verwalten von k0s-Kubernetes-Clustern                                            |
| [k3sup](https://formulae.brew.sh/formula/k3sup)          | Ein leichtgewichtiges Utility, um k3s auf jeder lokalen oder Remote-VM zu installieren                                       |
| [k9s](https://formulae.brew.sh/formula/k9s)              | Stellt eine Terminal-UI zur Interaktion mit deinen Kubernetes-Clustern bereit                                                |
| [kind](https://formulae.brew.sh/formula/kind)            | Ein Tool zum Ausführen lokaler Kubernetes-Cluster mit Docker-Container-„Knoten“                                              |
| [kubectl](https://kubernetes.io/docs/reference/kubectl/) | Das Kubernetes-Befehlszeilen-Tool, mit dem du Befehle gegen Kubernetes-Cluster ausführen kannst                              |
| [kubectx](https://formulae.brew.sh/formula/kubectx)      | Ein Tool zum schnelleren Wechseln zwischen Kontexten (Clustern) in kubectl                                                   |
| [pack](https://buildpacks.io/)                           | Ein CLI-Tool zum Erstellen von Apps mit Cloud-Native Buildpacks                                                              |
| [syft](https://formulae.brew.sh/formula/syft)            | Ein CLI-Tool und eine Bibliothek zum Erzeugen einer Software Bill of Materials (SBOM) aus Container-Images und Dateisystemen |

#### CNCF-Tools

Für Zugriff auf die vollständige Suite von [Cloud Native Computing Foundation](https://l.cncf.io)-Tools verwende `ujust cncf`, um aus einer umfangreichen Sammlung von 89 CNCF-Projekten zu browsen und zu installieren, einschließlich graduierter, inkubierender und Sandbox-Tools. Dies umfasst Argo, Cilium, Envoy, Flux, Istio, Linkerd, Prometheus und viele mehr.

### Fonts {#fonts}

Installiere kuratierte Entwickler-Fonts via Homebrew (`brew install --cask <font-name>`) oder verwende das enthaltene [Embellish](https://flathub.org/en/apps/io.github.getnf.embellish)-Tool:

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

## Benutzerdefinierte Images mit Finpilot bauen

Wenn du dein eigenes angepasstes, boot-fähiges `bootc`-Betriebssystem-Image basierend auf Bluefin erstellen möchtest:

- **[finpilot](https://github.com/projectbluefin/finpilot)** stellt ein offizielles Template-Repository zum Bauen benutzerdefinierter Linux-Images bereit.
- Implementiert eine mehrstufige Container-Build-Architektur für gelayerte Pakete, Konfigurationsdateien und Desktop-Anpassungen.
- Enthält GitHub-Actions-Workflows für automatisierte Builds, schlüsselloses Image-Signing via Cosign und Veröffentlichung in der GitHub Container Registry (GHCR).
- Um dein benutzerdefiniertes Image bereitzustellen, wechsle mit:
  ```bash
  sudo bootc switch ghcr.io/<your-username>/<your-image>:latest --enforce-container-sigpolicy
  ```
