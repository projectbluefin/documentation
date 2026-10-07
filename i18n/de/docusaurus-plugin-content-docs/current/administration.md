---
title: Administrator-Handbuch
slug: /administration
---

#### Täglicher Betrieb

Bluefin ist dafür ausgelegt, für die Lebensdauer der Hardware ohne Neuinstallation installiert zu werden. Im Gegensatz zu herkömmlichen Betriebssystemen ist das Image immer unverändert und „sauber", wodurch Upgrades weniger problematisch sind. Updates sind standardmäßig automatisch und still.

Das bedeutet in der Regel, dass du dein System einmal einrichten kannst und es dann so bleibt. Dann musst du wahrscheinlich nie mehr hierher zurückkommen. 🙂

:::tip

I want that "defaults lifestyle".

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin-Desktop-Umgebung-Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## Anwendungen installieren

Verwende [Bazaar](https://github.com/kolunmi/bazaar), um [Anwendungen aus Flathub zu installieren](https://flathub.org/). System-Updates und Upgrades werden nicht von dieser Anwendung verwaltet; ihr Umfang wurde auf die Installation von Flatpaks aus Flathub reduziert. Zwei Flatpak-Verwaltungswerkzeuge sind enthalten:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) bietet Anwendungsverwaltung.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal) ist ebenfalls für die Berechtigungsverwaltung enthalten.

## System-Updates

Bluefin ist so konzipiert, dass es „ohne Zutun" funktioniert. Das System prüft alle sechs (6) Stunden auf Updates. Dies umfasst System-Updates, Flatpaks, Pet-Container und Homebrew.

- Die meisten Images werden wöchentlich veröffentlicht, wir können aber jederzeit ein neues Update herausgeben.

Updates werden beim Neustart des Systems angewendet. Daher wird empfohlen, dein Gerät regelmäßig auszuschalten, wenn es nicht benutzt wird, um sicherzustellen, dass Kernel-Updates angewendet werden. Anwendungs-Updates (wie der Browser) erfolgen unabhängig davon und erfordern keinen Neustart.

Maschinen-Firmware-Updates werden über die Firmware-Anwendung bereitgestellt.

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### Updates verwalten

Gehe in **Einstellungen** → **Netzwerk** → einer Netzwerkeinstellung und setze **Metered Connection: has data limits or can incur charges**, um Bluefin-Updates zu pausieren:

![Einstellungen → Netzwerk → einer Netzwerkeinstellung - `Metered Connection: has data limits or can incur charges` Hervorhebung](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## Streams und Drosselungseinstellungen

Bluefin bietet Images basierend auf der aktuellen Fedora-Version. Damit haben Nutzer die Wahl, wie aggressiv sie ihre Updates wünschen. Diese werden als „Streams" bezeichnet.

### Bluefin

`stable`: Dies ist der Standard-Stream für Bluefin und richtet sich an die meisten Nutzer. Er ist immer ein Alias auf die aktuelle Fedora-Version, folgt aber dem Fedora-CoreOS-Veröffentlichungszeitplan. Das bedeutet, dass Kernel-Upgrades etwa 2 Wochen nach dem Erscheinen in Fedora kommen, was nützlich sein kann, um Kernel-Regressionen zu vermeiden, da das Bluefin-Team in diesen Fällen auf einen bestimmten Kernel pinnen kann. Wir nennen dies „Gating" des Kernels. `stable-daily` ist für diejenigen verfügbar, die tägliche Builds möchten.

:::note[Latest (Für Tester)]
`latest`: Für Nutzer, die das Neueste wollen, was Fedora zu bieten hat — einen ungegateten Linux-Kernel, tägliche Updates, voller offener Gasfuß. 🔥 Dieser Stream bleibt absichtlich ungebrandet und ist nicht für den allgemeinen Gebrauch bestimmt.
:::

Du kannst aus drei Rolling-Tags wählen oder auf eine bestimmte Fedora-Version festlegen. Sieh in die [Release Notes](https://github.com/projectbluefin/bluefin/releases) für versionsspezifische Informationen:

|                     | `stable` (Standard) oder `stable-daily` | `latest`        |
| ------------------- | --------------------------------------- | --------------- |
| Fedora-Version:     | 43                                      | 43              |
| GNOME-Version:      | 49                                      | 49              |
| Zielnutzer:         | Alle Nutzer                             |                 |
| System-Updates:     | Wöchentlich oder täglich                | Täglich         |
| Anwendungs-Updates: | Zweimal täglich                         | Zweimal täglich |
| Kernel:             | Gegatet                                 | Ungegatet       |

Der Hauptunterschied zwischen `latest` und `stable` ist die Kernel-Kadenz und wann sie ein großes Upgrade durchführen. `latest` aktualisiert auf die nächste Fedora-Hauptversion, sobald sie verfügbar ist, und baut täglich. `stable` aktualisiert, wenn CoreOS sein Userspace-Upgrade durchführt, was normalerweise einige Wochen danach ist, und baut wöchentlich oder täglich. Nutzer können das `stable-daily`-Image für tägliche stabile Updates wählen oder bei `stable` für wöchentliche Builds bleiben.

#### Gegateter Kernel

Das `stable`-Tag hat einen gegateten Kernel. Dieser Kernel folgt der gleichen Version wie der [Fedora-CoreOS-Stable-Stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable), was eine langsamere Kadenz als das Standard-Fedora-Silverblue ist. Das Universal-Blue-Team kann vorübergehend auf einen bestimmten Kernel pinnen, um Regressionen zu vermeiden, die Nutzer betreffen könnten.

Hinzufügen und Bearbeiten von Kernel-Boot-Argumenten wird von `bootc kargs` gehandhabt. Sieh in die [Upstream-Dokumentation](https://bootc.dev/bootc/building/kernel-arguments.html) für weitere Informationen.

:::info[Es ist einfach Bluefin]

Bluefins Komponenten werden über alle Images geteilt; betrachte es nicht als separate „Edition" oder „Spin". Bluefin ist bestrebt, über alle Images hinweg gleich zu sein; wir glauben, dass die Aggressivität von Updates eine „Einstellung" sein kann. Idealerweise nutzt du „Bluefin" und musst dich nicht um deinen Update-Stream kümmern.

:::

### Zwischen Streams wechseln {#switching-between-streams}

Verwende den Befehl `ujust rebase-helper`, um ein Rebase auszuwählen und einen bestimmten Stream zu wählen:

![`ujust rebase-helper` - Kanal](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

Oder wähle `date` und ein älteres Image.

![`ujust rebase-helper` - Datum](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### Manuell zwischen Streams wechseln

Bluefin verwendet [`bootc`](https://bootc.dev/bootc/), um das Betriebssystem-Image zu verwalten. Um deine aktuellen und gestagten Deployments zu inspizieren, führe aus:

```sh
sudo bootc status
```

Dies zeigt dein gebootetes Image, gestagedes Update (falls vorhanden) und Rollback-Ziel:

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

Die Referenz `ghcr.io/projectbluefin/bluefin:stable` gibt das Image und das Stream-Tag an. Suche nach `:stable`, `:latest` oder gepinnten Datums-Tags.

Wenn du lokal gelayerte Pakete hast, setze sie vor dem Stream-Wechsel zurück:

```sh
rpm-ostree reset
```

**Profi-Tipp**: Bluefins [Release Notes](https://github.com/projectbluefin/bluefin/releases) enthalten Stream-Wechsel-Anweisungen für jede Veröffentlichung.

Verwende den Befehl `bootc switch`, um zu einem anderen Stream zu wechseln:

#### Beispiele für manuelle Wechsel

<details>

<summary>Wechsel zu `:stable`. Das `--enforce-container-sigpolicy`-Flag stellt die Signaturprüfung für das Ziel-Image sicher:</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

Wechsel zu `:testing`:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

Wechsel zu NVIDIA-Hardware-Images:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Auf ein bestimmtes Datums-Tag pinnen:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

Auf das vorherige Deployment zurückrollen:

```sh
sudo bootc rollback
```

Verwende `skopeo inspect`, um Image-Metadaten und verfügbare Tags abzufragen:

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

Dies zeigt alle verfügbaren Tags und nützliche Metadaten wie Image- und Kernel-Versionen.

Sieh in die [bootc-Dokumentation](https://bootc.dev/bootc/) für weitere Informationen.

## Virtuelle Private Netzwerke (VPN)

[Tailscale](https://tailscale.com) ist standardmäßig enthalten, um VPN-Dienste sowohl für Desktop- als auch für Entwicklungs-Anwendungsfälle bereitzustellen. [Tailscale ist ziemlich nützlich](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Tailscale mit Mullvad verwenden](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) - bietet die beste Out-of-the-Box-Erfahrung
- [Tailscale mit Docker verwenden](https://tailscale.com/docs/features/containers/docker) - für die Entwicklung
- [Den Systray mit Tailscale verwenden](https://tailscale.com/docs/features/client/linux-systray) - folge dies, um das Tailscale-Symbol im Systray einzurichten. Beachte, dass `wl-clipboard` bereits im System enthalten ist, du musst es also nicht installieren.
- Tailscales [YouTube-Kanal](https://www.youtube.com/@Tailscale) hat viele großartige Tipps und Tricks
- Gute VPN-Anbieter stellen Wireguard-Konfigurationen bereit, die direkt in den Network Manager importiert werden können; sieh in deren Dokumentation für weitere Informationen:
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

Es gibt auch VPN-Anbieter auf Flathub, die eine gute Erfahrung bieten:

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([Spenden](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN-Client](https://flathub.org/apps/com.protonvpn.www) - auf Flathub verfügbar

Andere VPN-Anbieter, die hier nicht explizit erwähnt werden, bieten möglicherweise eine schlechte Paketierungserfahrung und werden nicht empfohlen. Wenn dein VPN-Anbieter in diese Kategorie fällt, ist möglicherweise der Export der Wireguard-Konfiguration und der manuelle Import der beste Ansatz.

## Lokales Layering

Das direkte Hinzufügen von Paketen zum Host-Image wird in Bluefin nicht empfohlen. Das Betriebssystem ist so konzipiert, dass es unverändert und reproduzierbar als von `bootc` verwaltetes OCI-Image bleibt.

Workloads sollten in Containern isoliert werden (via Distrobox oder Devcontainers), CLI-Tools über Homebrew installiert und grafische Anwendungen aus Flathub installiert werden.

Wenn du vorübergehend ein Host-Paket layern musst:

```sh
rpm-ostree install <package>
```

Um alle gelayerten Pakete zu entfernen und zur reinen Image-Basis zurückzukehren:

```sh
rpm-ostree reset
```

Zum Anwenden neu starten.

| Empfohlene Alternative | Vermeide Layering auf dem Host |
| ---------------------- | ------------------------------ |
| Flatpak-Apps           | Grafische Desktop-Apps         |
| Homebrew-CLI-Tools     | Host-Utilities                 |
| Distrobox / Container  | Developer-Runtimes             |

## System-Standardeinstellungen überschreiben

Bluefin-Systemstandards werden auf dem Basis-Image zusammen mit der Fedora-Konfiguration in `/usr/etc` ausgeliefert. Die meisten davon können überschrieben werden, indem eine Datei in `/etc` abgelegt wird.

Zum Beispiel befindet sich die Distrobox-Konfiguration in `/usr/etc/distrobox/distrobox.ini`. Deine Anpassungsoptionen werden in `/etc/distrobox/distrobox.ini` abgelegt. Dies ist nützlich, wenn du eine Kopie der Originaldatei als Referenz benötigst.

Sieh in die [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) für weitere Informationen zu Konfigurationsoptionen, insbesondere `~/.local` und `~/.config`.

## Community-Aliase und Workarounds

[just](https://just.systems) wird als Task-Runner auf Bluefin verwendet. Dies sind üblicherweise Community-Bequemlichkeits-Aliase oder komplexere Skripte, die helfen, einige Aufgaben oder Ersteinrichtung zu automatisieren. Dies ist als `ujust` aliasiert, damit du `just` selbst für deine anderen Projekte verwenden kannst.

### Erste Schritte mit ujust

- `ujust --choose` - Zeigt jeden Befehl und das Skript, das ausgeführt wird, wenn dieser Befehl gewählt wird. Nützlich, um die verfügbaren Befehle zu durchsuchen
- `ujust -n $command` - Das `-n` führt einen Befehl im Dry-Run-Modus aus, was nützlich ist, um die ausgeführten Befehle zu inspizieren

:::tip

Profi-Tipp: Halte deine eigenen Tasks und Aliase in `~/.Justfile`, und sie eignen sich auch gut, um sie im Stammverzeichnis deiner Projektdateien abzulegen, um gängige Tasks zu automatisieren; sieh dir dieses von [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads) an.

:::

### Kuratierte Tool-Bundles

Bluefin enthält kuratierte CLI-Tool-Sammlungen. Diese Befehle installieren kuratierte Sammlungen von Tools via Homebrew:

| Befehl              | Beschreibung                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | Moderne CLI-Tools: atuin, bat, chezmoi, direnv, eza, fd, gh, glab, ripgrep, starship, tealdeer, television, zoxide und mehr |

### Systembefehle

| Befehl                         | Beschreibung                                                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | System, Flatpaks und Brew-Formeln manuell aktualisieren                                                                                                                                                                                              |
| `ujust toggle-updates`         | Automatische System-Updates aktivieren oder deaktivieren                                                                                                                                                                                             |
| `ujust changelogs`             | Changelogs für jedes Paket seit dem letzten Update anzeigen                                                                                                                                                                                          |
| `ujust bios`                   | Den PC neu starten und in das BIOS/UEFI wechseln. Nützlich für Dual-Boot-Systeme mit unabhängigen Festplatten                                                                                                                                        |
| `ujust bios-info`              | BIOS/UEFI-Informationen anzeigen (Hersteller, Produktname, Version, Veröffentlichungsdatum)                                                                                                                                                          |
| `ujust device-info`            | Sendet den Status, die Flatpak-Liste und Systeminformationen an den CentOS-Pastebin und gibt die URL im Terminal aus. Dies ermöglicht es dem Endnutzer, die URL mit seinen Informationen bequem einzufügen, damit andere beim Debuggen helfen können |
| `ujust rebase-helper`          | Interaktiver Assistent zum Wechseln zwischen Streams, Rebase auf andere Images oder Zurückrollen auf eine frühere Version                                                                                                                            |
| `ujust clean-system`           | Nicht verwendete Container, Volumes und Flatpak-Runtimes aufräumen                                                                                                                                                                                   |
| `ujust check-idle-power-draw`  | Leerlaufleistungsaufnahme deines Systems mit powerstat messen                                                                                                                                                                                        |
| `ujust check-local-overrides`  | Dateien anzeigen, die sich zwischen `/usr/etc` und `/etc` unterscheiden, um lokale Anpassungen zu identifizieren                                                                                                                                     |
| `ujust logs-this-boot`         | Alle System-Logmeldungen vom aktuellen Boot anzeigen                                                                                                                                                                                                 |
| `ujust logs-last-boot`         | Alle System-Logmeldungen vom vorherigen Boot anzeigen                                                                                                                                                                                                |
| `ujust enroll-secure-boot-key` | Den Nvidia-Treiber- & KMOD-Signierschlüssel für Secure Boot enrollen (Passwort: „universalblue")                                                                                                                                                     |
| `ujust toggle-user-motd`       | Anzeige der „Message of the Day" im Terminal umschalten                                                                                                                                                                                              |
| `ujust toggle-tpm2`            | Automatisches LUKS-Disk-Unlock via TPM umschalten (aktivieren/deaktivieren mit optionaler PIN)                                                                                                                                                       |
| `ujust toggle-iwd`             | Zwischen iwd und wpa_supplicant für WLAN-Netzwerke wechseln (iwd kann Durchsatz verbessern und Latenz reduzieren)                                                                                                                                    |
| `ujust benchmark`              | Einen einminütigen System-Benchmark mit stress-ng ausführen                                                                                                                                                                                          |
| `ujust powerwash`              | Diesen Rechner auf den Anfangszustand zurücksetzen (experimentelles Feature)                                                                                                                                                                         |

### Developer-Experience-Befehle

| Befehl                 | Beschreibung                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ujust devmode`        | Zwischen Bluefin und der Developer Experience (bluefin-dx) umschalten                                                                |
| `ujust dx-group`       | Deinen Benutzer zu den Gruppen docker, incus-admin, libvirt und dialout für vollen Entwicklerzugriff hinzufügen                      |
| `ujust bluefin-cli`    | Bluefins kuratiertes Command-Line-Erlebnis mit modernen Tools installieren (atuin, bat, eza, fd, ripgrep, starship, zoxide und mehr) |
| `ujust toggle-devmode` | Alias für `ujust devmode`                                                                                                            |

### Befehle zur Anwendungsinstallation

| Befehl                                | Beschreibung                                                                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`             | [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/) zur Verwaltung von JetBrains-IDEs installieren                        |
| `ujust install-opentabletdriver`      | [OpenTabletDriver](https://opentabletdriver.net/), einen Open-Source-Treiber für Grafiktabletts, installieren oder deinstallieren |
| `ujust install-system-flatpaks`       | Die Standard-System-Flatpaks installieren (nützlich nach einem Rebase)                                                            |
| `ujust install-system-flatpaks-extra` | Zusätzliche empfohlene Flatpak-Anwendungen installieren                                                                           |

Generell versucht Bluefin, die System-Justfiles fein abzugrenzen; die meisten davon sind Workarounds und keine vollwertigen Befehle. Sie können entfernt oder geändert werden, je nachdem, welches Problem sie ursprünglich lösen sollten.

## Erweiterungen verwalten

Bluefin verwendet den [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) von Matthew Jakeman zur Verwaltung der Desktop-Erweiterungen. Die Anwendung ist standardmäßig enthalten. Du kannst sie über das [Logo-Menü](https://github.com/Aryan20/Logomenu) aufrufen (danke Aryan Kaushik!)

![GNOME-Erweiterungsmenü-Option (öffnet Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

Dies ist nützlich, wenn du entscheidest, dass du einige der mit Bluefin gebündelten Erweiterungen nicht verwenden möchtest.

![Extension Manager - Systemerweiterungen Hervorhebung](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

In dem unwahrscheinlichen Fall, dass deine Session abstürzt, werden alle deine Erweiterungen deaktiviert. In dem seltenen Fall, dass dies passiert, musst du möglicherweise alle im Erweiterungs-Manager wieder aktivieren.

:::

## Fernverwaltung

:::note[Helfer gesucht]

Dieses Feature ist unvollständig und benötigt Mitwirkende, um es Realität werden zu lassen

:::

Bluefin und Aurora enthalten Cockpit zur Maschinenverwaltung. Wir hoffen, weitere Out-of-the-Box-Verwaltungsvorlagen aufzunehmen; bitte [sieh dir dieses Issue an](https://github.com/projectbluefin/bluefin/issues), wenn du dich freiwillig beteiligen möchtest.

## Verifizierung

Diese Images sind mit sigstores [cosign](https://docs.sigstore.dev/cosign/) signiert. Bluefin Classic verwendet schlüsselbasierte Signierung, also verifiziere es mit dem `cosign.pub`-Schlüssel aus [ublue-os/bluefin](https://github.com/ublue-os/bluefin):

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

Dakota und Utah sind stattdessen schlüssellos signiert — siehe [Supply Chain Security](/supply-chain) für deren Verifizierungsbefehle.
