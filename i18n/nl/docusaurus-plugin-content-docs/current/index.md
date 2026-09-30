---
title: Welkom bij Bluefin
slug: /
pagination_next: downloads
---

# Welkom bij Bluefin

Voor eindgebruikers een systeem dat zo betrouwbaar is als een Chromebook met nauwelijks onderhoud, terwijl het ontwikkelaars een krachtige [cloud-native ontwikkelmodus](/bluefin-dx) biedt. Gebouwd met technologie van de volgende generatie, voor mensen die hun machines willen gebruiken om werk te doen.

![Bluefin-desktop screenshot](/img/bluefin-hero.webp)

## Is Bluefin iets voor jou?

Bluefin is een Linux-desktop van de volgende generatie die richting progressieve verbetering evolueert. We keren zo mogelijk zo snel mogelijk rigoureus en effectief de rug naar verouderde technologieën toe, om de best mogelijke ervaring te bieden.

:::tip

Sommige mensen neigen er misschien toe te zeggen dat Bluefin ontwikkelaars of ervaren Linux-gebruikers het beste zou dienen, maar ik zou argueeren dat het een even sterke kandidaat is voor nieuwe gebruikers, vanwege de betrouwbaarheid en de goede configuratie vanuit de doos.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin is:

- **Flatpak First** - De applicatiemodel in Bluefin draait rond geïsoleerde apps die in Flathub worden onderhouden. Applicaties die niet goed werken met moderne componenten zoals Wayland, PipeWire, Flatpak-portalen, enz. kunnen een slecht resultaat geven en worden niet aanbevolen.
- **Doelbewust onzichtbaar** - Bluefin is geen distributie. Je relatie is met Flathub, Homebrew en wat je in je containers stopt.
- **Geoptimaliseerd voor de 96%** - Niet de 4% - Bluefin volgt een "sterker samen"-benadering bij functies. Alles kan, maar de waarde komt van het delen van best practices. We brengen weinig tijd door met randgevallen.
- **Bewezen ontwikkelmodel** - Developer experience gefokust op containers en nieuwe Linux-gebruikers blostellen aan de [tools die in cloud native worden gebruikt](https://www.cncf.io/). Zie de [Mission Statement](/mission) en [Values](/values)-pagina's voor meer informatie.
- **Doelbewust gefokust op grote hardware** - Bluefin loopt het beste op linux-vriendelijke hardware, om de gebruikers een zo mogelijk legacy-vrije ervaring te bieden. Bluefin wil ook OEMs ondersteunen die linux-laptops en -desktops verkopen, dus het doet zijn best om de beste combinatie van software en hardware te draaien. We doen niet onze best om dingen die de gebruikerservaring aantassen bewust te documenteren of te omzeilen, dus in sommige gevallen is een ander besturingssysteem de juiste keuze.

Als je buiten deze scope valt, dan **is Bluefin misschien niet de juiste keuze voor jou**. Bluefin kan ongemak en lichamelijke schade veroorzaken [als het verkeerd wordt vastgehouden](/troubleshooting/#am-i-holding-bluefin-wrong). We erkennen dat veel delen van de traditionele linux-desktop-ervaring niet met ons meekomen om een betere desktop te bouwen.

## Desktop-ervaring & functies

Bluefin biedt een GNOME ([Donatie](https://www.gnome.org/donate/))-desktop, die door onze community wordt geconfigureerd. Het is zo ontworpen dat het ongecompliceerd is en je uit de weg blijft, zodat je je op je applicaties kan focussen.

Systeemupdates zijn gebaseerd op images en automatisch. Applicaties worden logisch gescheiden van het systeem door flatpaks te gebruiken voor grafische applicaties en `brew` voor commandozeile-applicaties.

:::tip

Bluefin is "een interpretatie van de Ubuntu-spiritualiteit, gebouwd op Fedora-technologie" — een terugverwijzing naar een tijdperk van de Ubuntu-geschiedenis waarin veel open source-enthousiasten groot zijn geworden, net als de Classic X-Men. We willen dezelfde vibe hier brengen; denk aan ons als de reboot. Chill vibes.

:::

- **Ubuntu-gelijke GNOME-lay-out** met gecureerde extensies:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - voor een vertrouwde dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - voor tray-gelijke pictogrammen in de rechterbovenhoek
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - jouw mobiele apparaat integreren met je desktop
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donatie](https://github.com/sponsors/aunetx)) - voor een beetje glans
  - [Search Light](https://github.com/icedman/search-light) - biedt functionaliteit voor zoeken en een macOS-Spotlight-gelijke workflow, standaard gebonden aan <kbd>Super</kbd>-<kbd>Space</kbd>
- **[Developer Mode](/bluefin-dx)** - gedetailleerde developer-tooling die Bluefin verandert in een krachtige cloud-native workstation
- **[Ptyxis-Terminal](https://devsuite.app/ptyxis/)** voor container-gefokuste workflows
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donatie](https://github.com/sponsors/ranfdev)) voor containerbeheer
- **[Tailscale](https://tailscale.com)** meegeleverd voor VPN samen met `wireguard-tools` en systray-ondersteuning
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Donatie](https://github.com/sponsors/mjakeman)) meegeleverd
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** met [Flathub](https://flathub.org):
  - vertrouwde interface van het softwarecentrum om grafische applicaties te installeren
  - verlaten applicaties en verouderde runtimes worden niet opgelijst
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donatie](https://ko-fi.com/heliguy)) meegeleverd voor Flatpak-beheer
- **Praktijkgerichte functies**:
  - [Starship](https://starship.rs)-commandozeile-prompt standaard ingeschakeld
  - [Solaar](https://github.com/pwr-Solaar/Solaar) voor Logitech-muizen samen met `libratbagd`
  - [rclone](https://rclone.org/overview/) en [restic](https://restic.net/) voor cloud-opslag-mounts en moderne data-backups
  - `zsh` en `fish` meegeleverd als optionele shells
  - [Switcheroo-ondersteuning](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) voor laptops met een dubbel GPU
- **Bluefin-grondslag door Universal Blue**:
  - extra udev-regels voor game-controllers en andere hardware uit de doos
  - alle multimedia-codecs meegeleverd
  - gefaseerde automatische updates: gebruik je computer normaal en schak hem uit als je klaar bent

## Distroless-fokus

Bluefin levert bewust upstream-tools in plaats van eigen applicaties. Het idee van een "distributie-app-store" is blijvend onhoudbaar voor desktop-applicatie-auteurs, dus Bluefin levert tools zoals [Bazaar](https://github.com/kolunmi/bazaar) en [Homebrew](https://brew.sh) in plaats van. Workflows blijven niet alleen distributie-agnostisch, maar ook besturingssysteem-agnostisch.

:::info[Het is een platformoverstijgende wereld]

De workflows in Bluefin zijn bewust upstream-gefokust -- we geloven in een consistente linux-ervaring voor iedereen, of het nu WSL op Windows is, Podman/Docker op een Mac, of een willekeurig linux-systeem. Het [cloud-native ecosysteem](http://cncf.io) heeft bewezen dat dit model werkt. Dit laat miljoenen bestaande ontwikkelaars toe om in te stappen met een workflow die ze al kennen, en laat linux toe om te concurreren waar het meest uitmaakt.

:::

## Volgende stappen

- **[Downloads](/downloads)** — haal een officiële Bluefin-ISO of torrent
- **[Installation Runbook](/installation)** — hardware-planning en setup-stappen
- **[User Guide](/administration)** — daglijk beheer, updates en apps
- **[Developer Guide](/bluefin-dx)** — containers, devcontainers en AI-tooling

Het blogbericht over de aankondiging heeft bovendien wat achtergrondinformatie.

## Inleidende video's en podcasts

Bekijk onze [lijst van video's en reviews](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) voor meer informatie.

:::tip

"Evolutie is een proces van voortdurende vertakking en expansie."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor-dinosaurus"
  width="1120"
  height="630"
  loading="lazy"
/>
