---
title: Toepassingen & commandoregel
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin is ontworpen om door normale mensen te gebruiken, maar de commandoregel is onze _**passie**_. Daarom investeren we zowel in de grafische desktopervaring als de terminalworkflow. Houd je mes scherp.

## Grafische toepassingen

Bluefin volgt een **Flatpak-first**-aanpak voor desktopsoftware. Toepassingen draaien geïsoleerd van het gaststelsel en worden gehaald uit [Flathub](https://flathub.org).

- **[Bazaar](https://github.com/kolunmi/bazaar)** — de standaard toepassingswinkel. Het filtert verlaten toepassingen en die afhankelijk zijn van verouderde Flatpak-tijdranden.
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** — beheren van Flatpak-levenscycli, geïnstalleerde tijdranden inspecteren, restanten opruimen, en versies pinnen of downgraden.
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** — grafisch rechtenbeheer voor fijnmazige bestandsystem-, netwerk- en apparaattoegang tot Flatpak.

## Commandoregeltoappen & Homebrew

[brew](https://brew.sh/) (Homebrew) is de primaire pakketbeheerder om commandoregeltoepassingen en ontwikkelaarsutils te installeren zonder het basis-OS-image te vervuilen.

- [Homebrew-documentatie](https://docs.brew.sh/)
- [Homebrew-pakketten](https://formulae.brew.sh/)
- [Cheatsheet](https://devhints.io/homebrew)

Merk op dat Homebrew Cask-functionaliteit macOS-specifiek is en niet functioneel in Bluefin; Flatpak wordt in plaats daarvan gebruikt voor GUI-toepassingen. Andere tools zoals [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/), en [mise](https://github.com/jdx/mise) werken soepel wanneer ze via Homebrew geïnstalleerd zijn.

:::info[Overschrijd niet de sporen]

Kort gezegd: heb je een CLI-tool of utility nodig? Gebruik Homebrew. Heb je een library en afhankelijkheden nodig voor ontwikkelingswerk? Gebruik een container. Dit houdt alles schoon en reproduceerbaar.

:::

### Message of the Day en `fastfetch`

Het project geeft de voorkeur aan functionele versiering die er strak uitziet maar ook een doel dient. Nieuwe terminals (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) tonen een message of the day met systeeminformation:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

De `bluefin-dx:beta`-regel is de naam van de OS-image, een herinnering of je op een pinned image zit, met een snelle verwijzing naar veelgebruikte commando's. Schakel het aan en uit met `ujust toggle-user-motd`.

We laten onze machines graag zien. Draai `fastfetch`:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

Dit scherm toont systeeminformation, gebruikersnaam, machinenaam en kernelversie. Elke Bluefin-image heeft een datum “Gesmeid op” ter herdenking van de initiële installatie van de machine:

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## Terminalconfiguratie

### De standaardterminalshell wijzigen

Bluefin gebruikt [bash](https://www.gnu.org/software/bash/) als standaard maar wordt ook geleverd met [fish](https://fishshell.com/) ([Donate](https://github.com/sponsors/fish-shell)) en [zsh](https://www.zsh.org/) op de image voor gemak.

Bluefin levert [Ptyxis](https://devsuite.app/ptyxis/) als standaardterminal (naam `Terminal` in de startapplicatie). Het is **sterk aanbevolen** om je shell [via de terminal-emulator te wijzigen in plaats van systeemwide](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). Installeer eerst de shell die je wilt met `brew install zsh` of `brew install fish`. Klik op de terminalinstellingen en bewerk je profiel:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

Selecteer “Custom Command gebruiken” en voeg je shell toe:

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## Door onderhouders aanbevolen GNOME-extenties

Hier zijn GNOME-extenties die onderhouders aanbevolen om je desktopervaring compleet te maken. Ondersteun extentieauteurs door te doneren aan die je leuk vindt!

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

Voor een Tailscale-GUI aanbevolen we de [officiële systray-toepassing](https://tailscale.com/docs/features/client/linux-systray): `tailscale configure systray --enable-startup=systemd` en herstarten.

</div>

## Fonts

Homebrew wordt ook gebruikt voor het installeren van fonts. Blader door [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/) en installeer je favoriete fonts in `~/.local/share/fonts`.

### Microsoft-fonts

Als je Microsoft-fonts nodig hebt voor documentcompatible:

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
