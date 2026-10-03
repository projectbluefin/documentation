---
title: Anwendungen & Befehlszeile
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin ist dafür gemacht, von normalen Menschen benutzt zu werden, aber die Befehlszeile ist unsere _**Leidenschaft**_. Deshalb investieren wir sowohl in die grafische Desktop-Erlebniswelt als auch in den Terminal-Workflow. Slay out.

## Grafische Anwendungen

Bluefin verfolgt einen **Flatpak-first**-Ansatz für Desktop-Software. Anwendungen laufen isoliert vom Host-Betriebssystem und werden aus [Flathub](https://flathub.org) bezogen.

- **[Bazaar](https://github.com/kolunmi/bazaar)** — der Standard-Anwendungsstore. Er filtert verlassene Anwendungen und solche, die auf veralteten Flatpak-Runtimes basieren.
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** — Flatpak-Lebenszyklen verwalten, installierte Runtimes inspizieren, Reste aufräumen und Versionen pinnen oder downgraden.
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** — grafischer Berechtigungsmanager für feingranulare Steuerung von Flatpak-Dateisystem-, Netzwerk- und Gerätezugriff.

## Befehlszeilen-Anwendungen & Homebrew

[brew](https://brew.sh/) (Homebrew) ist der primäre Package-Manager, um Befehlszeilen-Anwendungen und Developer-Utilities zu installieren, ohne das Basis-Betriebssystem-Image zu verschmutzen.

- [Homebrew-Dokumentation](https://docs.brew.sh/)
- [Homebrew-Pakete](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

Darauf achten, dass die Homebrew-Cask-Funktionalität macOS-spezifisch ist und in Bluefin nicht funktioniert; für GUI-Anwendungen wird Flatpak verwendet. Andere Werkzeuge wie [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/) und [mise](https://github.com/jdx/mise) laufen reibungslos, wenn sie über Homebrew installiert werden.

:::info[Kreuzt die Streams nicht]

Im Allgemeinen gilt: Brauchst du ein CLI-Tool oder eine Utility, verwende Homebrew. Brauchst du eine Library und Dependencies für Entwicklungsarbeit, verwende einen Container. Das hält alles sauber und reproduzierbar.

:::

### Message of the Day und `fastfetch`

Das Projekt mag funktionale Spielereien, die schick aussehen und trotzdem einen Zweck erfüllen. Neue Terminals (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) zeigen eine Message of the Day mit Systeminformationen an:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

Die `bluefin-dx:beta`-Zeile ist der Name des OS-Images und erinnert dich daran, ob du auf einem gepinnten Image bist, mit Schnellzugriff auf gängige Befehle. Ein- und ausschalten mit `ujust toggle-user-motd`.

Wir zeigen gerne unsere Maschinen. Führe `fastfetch` aus:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

Dieser Screen zeigt Hardware-Informationen, Benutzernamen, Maschinenname und Kernel-Version. Jedes Bluefin-Image hat ein „Forged On“-Datum, das an die Erstinstallation der Maschine erinnert:

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## Terminal-Konfiguration

### Standard-Terminal-Shell ändern

Bluefin verwendet standardmäßig [bash](https://www.gnu.org/software/bash/) und liefert zur Bequemlichkeit auch [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) und [zsh](https://www.zsh.org/) auf dem Image aus.

Bluefin liefert [Ptyxis](https://devsuite.app/ptyxis/) als Standard-Terminal (`Terminal` im App-Launcher). Es wird **dringend empfohlen**, die Shell über den Terminal-Emulator statt systemweit zu ändern ([Warum nicht systemweit](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/)). Installiere zuerst die gewünschte Shell mit `brew install zsh` oder `brew install fish`. Klicke auf die Terminal-Einstellungen und bearbeite dein Profil:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

Wähle „Use Custom Command“ und trage deine Shell hinzu:

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## Maintainer-empfohlene GNOME-Erweiterungen

Hier sind GNOME-Erweiterungen, die die Maintainer empfehlen, um deine Desktop-Erlebniswelt abzurunden. Unterstütze die Autor*innen der Erweiterungen, indem du an die, die du magst, spendest!

<div className={styles.extensionsGrid}>

<GnomeExtensions extensionId={5724} />
<GnomeExtensions extensionId={6670} />
<GnomeExtensions extensionId={6325} />
<GnomeExtensions extensionId={8834} />
<GnomeExtensions extensionId={3843} />
<GnomeExtensions extensionId={2236} />
<GnomeExtensions extensionId={5964} />
<GnomeExtensions extensionId={6000} />
<GnomeExtensions extensionId={7065} />

Für eine Tailscale-GUI empfehlen wir die [official systray application](https://tailscale.com/docs/features/client/linux-systray): `tailscale configure systray --enable-startup=systemd` und neu starten.

</div>

## Fonts

Homebrew wird auch zum Installieren von Fonts verwendet. Stöbere in [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/) und installiere deine liebsten Fonts in `~/.local/share/fonts`.

### Microsoft-Fonts

Wenn du Microsoft-Fonts für die Dokumentenkompatibilität brauchst:

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
