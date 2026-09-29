---
title: Willkommen bei Bluefin
slug: /
pagination_next: downloads
---

# Willkommen bei Bluefin

Für Endanwender ein System, das so zuverlässig ist wie ein Chromebook und kaum Wartung erfordert, während Entwicklern ein leistungsstarkes [cloud-natives Entwicklungsmodus](/bluefin-dx) geboten wird. Gebaut mit Technologie der nächsten Generation für Menschen, die ihre Maschinen zur Arbeit benutzen wollen.

![Bluefin-Desktop-Aufnahme](/img/bluefin-hero.webp)

## Ist Bluefin das Richtige für dich?

Bluefin ist ein Linux-Desktop der nächsten Generation, der sich hin zu fortschreitender Verbesserung entwickelt. Wir distanzieren schnellstmöglich rigoros und konsequent von veralteten Technologien, um das bestmögliche Erlebnis zu bieten.

:::tip

Manche neigen dazu zu sagen, dass Bluefin Entwicklern oder erfahrenen Linux-Nutzern am besten dienen würde, aber ich würde argumentieren, dass es ein ebenso starker Kandidat für neue Nutzer ist, wegen seiner Zuverlässigkeit und weil es aus der Box heraus gut konfiguriert ist.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin ist:

- **Flatpak First** - Das Anwendungsmodell in Bluefin kreist um isolierte Apps, die in Flathub gepflegt werden. Anwendungen, die nicht gut mit modernen Komponenten wie Wayland, Pipewire, Flatpak-Portalen etc. funktionieren, bieten möglicherweise eine schlechte Erfahrung und werden nicht empfohlen.
- **Mit gezielter Unsichtbarkeit** - Bluefin ist keine Distribution. Deine Beziehung ist mit Flathub, Homebrew und dem, was du in deine Container steckst.
- **Optimiert für die 96%** - Nicht die 4% - Bluefin verfolgt einen „stärker zusammen"-Ansatz bei Funktionen. Du kannst immer tun, was du willst, aber der Wert kommt vom Teilen bewährter Praktiken. Wir verbringen wenig Zeit mit Randfällen.
- **Bewährtes Entwicklungsmodell** - Developer Experience, fokussiert auf Container und das Einführen neuer Linux-Nutzer in die [in Cloud Native verwendeten Tools](https://www.cncf.io/). Siehe die [Mission Statement](/mission) und [Werte](/values)-Seiten für mehr Informationen.
- **Mit gezielter Fokussierung auf große Hardware** - Bluefin läuft am besten auf Linux-freundlicher Hardware, um den Nutzern ein möglichst legacy-freies Erlebnis zu bieten. Bluefin möchte auch OEMs unterstützen, die Linux-Laptop und -Desktop verkaufen, daher bemüht es sich, mit der besten Kombination aus Software und Hardware zu laufen. Wir dokumentieren oder umgehen gezielt Dinge, die das Nutzererlebnis beeinträchtigen,daher manchen Fällen ist ein anderes Betriebssystem die richtige Wahl.

Wenn deine Anforderungen außerhalb dieses Umfangs liegen, dann **ist Bluefin möglicherweise nicht das Richtige für dich**. Bluefin kann Unbehagen und körperlichen Schaden verursachen, [wenn es falsch gehalten wird](/troubleshooting/#am-i-holding-bluefin-wrong). Wir erkennen an, dass viele Teile des traditionellen Linux-Desktop-Erlebnisses nicht mit uns kommen, um einen besseren Desktop zu bauen.

## Desktop-Erlebnis & Funktionen

Bluefin bietet einen GNOME ([Spende](https://www.gnome.org/donate/))-Desktop, der von unserer Community konfiguriert wird. Er ist so ausgelegt, dass er unkompliziert ist und dir aus dem Weg bleibt, damit du dich auf deine Anwendungen fokussieren kannst.

System-Updates sind bilderbasiert und automatisch. Anwendungen werden logisch vom System getrennt, indem Flatpaks für grafische Anwendungen und `brew` für Befehlszeilen-Anwendungen verwendet werden.

:::tip

Bluefin ist „Eine Interpretation der Ubuntu-Spiritualität, gebaut auf Fedora-Technologie" — ein Rückbezug auf eine Ära der Ubuntu-Geschichte, mit der viele Open-Source-Enthusiasten groß geworden sind, ähnlich wie die Classic X-Men. Wir wollen dieselbe Vibez hierher bringen; sieh uns als Reboot an. Chill Vibes.

:::

- **Ubuntu-ähnliche GNOME-Layout** mit kuratierten Erweiterungen:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - für ein vertrautes Dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - für tray-ähnliche Symbole in der oberen rechten Ecke
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - dein mobiles Gerät mit deinem Desktop integrieren
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Spende](https://github.com/sponsors/aunetx)) - für etwas Glanz
  - [Search Light](https://github.com/icedman/search-light) - bietet Suchfunktionalität und einen macOS-Spotlight-ähnlichen Workflow, standardmäßig an <kbd>Super</kbd>-<kbd>Space</kbd> gebunden
- **[Developer Mode](/bluefin-dx)** - dedizierter Developer-Tooling, das Bluefin in eine leistungsstarke cloud-native Workstation verwandelt
- **[Ptyxis-Terminal](https://devsuite.app/ptyxis/)** für containerfokussierte Workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Spende](https://github.com/sponsors/ranfdev)) zur Container-Verwaltung
- **[Tailscale](https://tailscale.com)** für VPN inklusive, zusammen mit `wireguard-tools` und systray-Unterstützung
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Spende](https://github.com/sponsors/mjakeman)) inklusive
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** mit [Flathub](https://flathub.org):
  - Vertraute Software-Center-Oberfläche zur Installation grafischer Anwendungen
  - Verlassene Anwendungen und veraltete Runtimes werden nicht aufgelistet
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Spende](https://ko-fi.com/heliguy)) für die Flatpak-Verwaltung inklusive
- **Komfort-Funktionen**:
  - [Starship](https://starship.rs)-Befehlszeilen-Prompt standardmäßig aktiviert
  - [Solaar](https://github.com/pwr-Solaar/Solaar) für Logitech-Mäuse zusammen mit `libratbagd`
  - [rclone](https://rclone.org/overview/) und [restic](https://restic.net/) für Cloud-Speicher-Mounts und moderne Datenbackups
  - `zsh` und `fish` als optionale Shells inklusive
  - [Switcheroo-Unterstützung](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) für Laptops mit dualen GPUs
- **Universal-Blue-Grundlage**:
  - Zusätzliche udev-Regeln für Game-Controller und andere Hardware aus der Box
  - Alle Multimedia-Codecs inklusive
  - Gestaffelte automatische Updates: benutze deinen Computer normal und schalte ihn aus, wenn du fertig bist

## Distroless-Fokus

Bluefin liefert gezielt Upstream-Werkzeuge statt eigenen Anwendungen aus. Die Idee eines „Distributions-App-Stores" hat sich als nicht tragbar für Desktop-Anwendungsentwickler erwiesen, daher liefert Bluefin Werkzeuge wie [Bazaar](https://github.com/kolunmi/bazaar) und [Homebrew](https://brew.sh) statt. Workflows bleiben nicht nur distributions-agnostic, sondern auch betriebssystem-agnostic.

:::info[Es ist eine plattformübergreifende Welt]

Die Workflows in Bluefin sind gezielt auf Upstream fokussiert -- wir glauben an ein konsistentes Linux-Erlebnis für alle, egal ob WSL auf Windows, Podman/Docker auf einem Mac oder ein beliebiges Linux-System. Das [cloud-native Ökosystem](http://cncf.io) hat bewiesen, dass dieses Modell funktioniert. Dies erlaubt Millionen bestehender Entwickler, mit einem Workflow einzusteigen, den sie bereits kennen, und erlaubt es Linux, dort zu konkurrieren, wo es am meisten zählt.

:::

## Next Steps

- **[Downloads](/downloads)** — hole dir ein offizielles Bluefin-ISO oder Torrent
- **[Installation Runbook](/installation)** — Hardware-Planung und Setup-Schritte
- **[User Guide](/administration)** — tägliche Verwaltung, Updates und Anwendungen
- **[Developer Guide](/bluefin-dx)** — Container, DevContainer und AI-Tooling

Der [Ankunfts-Blogbeitrag](https://www.ypsidanger.com/announcing-project-bluefin/) hat außerdem etwas Hintergrundinformation.

## Einführende Videos und Podcasts

Sieh dir unsere [Liste von Videos und Reviews](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) für mehr Informationen an.

:::tip

„Evolution ist ein Prozess der ständigen Verzweigung und Expansion."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor-Dinosaurier"
  width="1120"
  height="630"
  loading="lazy"
/>
