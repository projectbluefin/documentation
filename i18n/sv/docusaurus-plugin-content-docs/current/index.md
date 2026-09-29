---
title: Välkommen till Bluefin
slug: /
pagination_next: downloads
---

# Välkommen till Bluefin

För slutanvändare är ett system så tillförlitligt som en Chromebook med nästan noll underhåll, samtidigt som det ger utvecklare ett kraftfullt [molnnativt utvecklingsläge](/bluefin-dx). Byggd med teknologi från nästa generation, för människor som behöver sina maskiner till att göra jobbet.

![Bluefin desktop screenshot](/img/bluefin-hero.webp)

## Är Bluefin rätt för dig?

Bluefin är ett Linux-skrivbord från nästa generation som lutar mot progressiv förbättring. Vi rör oss strikt och aggressivt bort från legacy-teknik så snart som möjligt för att ge bästa möjliga upplevelse.

:::tip

Vissa kan vara så benägna att säga att Bluefin tjänar bäst utvecklare eller erfarna Linux-användare, men jag skulle argumentera för att det är en lika stark utmanare för nya användare på grund av hur tillförlitligt det är och hur välkonfigurerat det kommer ur boxen.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin är:

- **Flatpak först** - Applikationsmodellen i Bluefin kretsar kring isolerade appar som underhålls i Flathub. Appar som inte fungerar bra med moderna komponenter såsom Wayland, Pipewire, Flatpak-portalar osv. kan ge en dålig upplevelse och rekommenderas inte.
- **Medvetet osynlig** - Bluefin är inte en distribution. Din relation är med Flathub, Homebrew och det du lägger i dina behållare.
- **Optimerad för 96%** - Inte 4% - Bluefin tar ett "starkare tillsammans"-upplägg mot funktioner. Du kan alltid göra vad du vill, men värdet kommer från att dela bästa praxis. Vi spenderar inte mycket tid på kantfall.
- **Bevisad utvecklingsmodell** - Utvecklarfokus runt behållare och som exponerar nya Linux-användare för [verktygen som används i molnnativ](https://www.cncf.io/). Se sidorna [Uppdrag](/mission) och [Värderingar](/values) för mer information.
- **Medvetet fokuserad på utmärkt hårdvara** - Bluefin kör bäst på Linux-vänlig hårdvara för att ge så mycket av en legacy-fri upplevelse som möjligt för användare. Bluefin vill också stödja OEM:ar som säljer Linux-bärbara och stationära datorer, så den strävar att köras med bästa kombinationen av mjukvara och hårdvara. Vi gör inte extra ansträngningar för att dokumentera eller kringgå saker som försämrar användarupplevelsen, så i vissa fall är ett annat operativsystem rätt val.

Om dina krav är utanför detta område, så är **Bluefin kanske inte rätt val för dig**. Bluefin kan orsaka obehag och allvarliga skador [när den hålls felaktigt](/troubleshooting/#am-i-holding-bluefin-wrong). Vi erkänner att för att göra ett bättre skrivbord kommer många delar av den traditionella Linux-skrivbordsupplevelsen inte med oss.

## Skrivbordsupplevelse och funktioner

Bluefin har ett GNOME ([Donera](https://www.gnome.org/donate/)) skrivbord konfigurerat av vår gemenskap. Det är designat för att vara hands-off och hålla sig ur vägen så du kan fokusera på dina appar.

Systemuppdatering är bildbaserade och automatiska. Applikationer är logiskt åtskilda från systemet genom att använda Flatpak för grafiska appar och `brew` för kommandoradsprogram.

:::tip

Bluefin är "En tolkning av Ubuntu-andan byggd på Fedora-teknik"—en återkoppling till en era av Ubuntu historia som många open source-entusiaster växte upp med, likt de klassiska X-Men. Vi strävar att ta med samma vibe här; tänk på oss som rebooten. Lugna vibbar.

:::

- **Ubuntu-liknande GNOME-layout** som integrerar kuraterade tillägg:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - för en bekant dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - för ikoner i systemfältet i övre högra hörnet
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integrera din mobila enhet med din dator
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donera](https://github.com/sponsors/aunetx)) - för den där glitset
  - [Search Light](https://github.com/icedman/search-light) - erbjuder sökfunktion och ett macOS Spotlight-liknande arbetsflöde bundet till <kbd>Super</kbd>-<kbd>Space</kbd> som standard
- **[Utvecklingsläge](/bluefin-dx)** - dedikerade utvecklingsverktygen som förvandlar Bluefin till en kraftfull molnnativ arbetsstation
- **[Ptyxis-terminal](https://devsuite.app/ptyxis/)** för behållarfokusarbetsflöden
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donera](https://github.com/sponsors/ranfdev)) för behållarhantering
- **[Tailscale](https://tailscale.com)** inkluderat för VPN tillsammans med `wireguard-tools` och systray-stöd
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Donera](https://github.com/sponsors/mjakeman)) inkluderat
- **[Bazaar Appbutik](https://github.com/kolunmi/bazaar)** med [Flathub](https://flathub.org):
  - Bekant programcentergränssnitt för att installera grafiska appar
  - Övergivna appar och utdaterade runtime är olistade
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donera](https://ko-fi.com/heliguy)) inkluderat för Flatpakhantering
- **Bekvämlighetsfunktioner**:
  - [Starship](https://starship.rs) terminalprompt aktiverad som standard
  - [Solaar](https://github.com/pwr-Solaar/Solaar) för Logitech-möss tillsammans med `libratbagd`
  - [rclone](https://rclone.org/overview/) och [restic](https://restic.net/) för molnlagringsmontering och moderna filbackuppar
  - `zsh` och `fish` inkluderat som valfria skal
  - [Switcheroo-stöd](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) för bärbara datorer med dubbla GPU:er
- **Universal Blue-grund**:
  - Extra udev-regler för spelkontroller och annan hårdvara direkt ur lådan
  - Alla multimediacodec inkluderade
  - Stegvis automatiska uppdatering: använd din dator som vanligt och stäng av den när du är klar

## Distrolöst fokus

Bluefin levererar medvetet upstream-verktyg i stället för egna applikationer. Idén om en "distribution app store" har visat sig vara ohållbar för desktop-applikationsförfattare, så Bluefin shippar verktygen som [Bazaar](https://github.com/kolunmi/bazaar) och [Homebrew](https://brew.sh) istället. Arbetsflöden förblir inte bara distributionagnostiska, utan operativsystemagnostiska.

:::info[Det är en plattformsoberoende värld]

Arbetsflöden i Bluefin är medvetet fokuserade på upstream -- vi tror på en konsekvent Linux-upplevelse för alla, oavsett om det är WSL på Windows, Podman/Docker på en Mac eller vilken Linux-system som helst. Det [molnnativa ekosystemet](http://cncf.io) har visat att denna modell fungerar. Detta låter miljoner befintliga utvecklare onboarda med ett arbetsflöde som de redan känner till, och låter Linux tävla där det betyder mest.

:::

## Nästa steg

- **[Nedladdningar](/downloads)** — hämta en officiell Bluefin-ISO eller torrent
- **[Installationsguide](/installation)** — hårdvaruplanering och installationssteg
- **[Användarguide](/administration)** — daglig administration, uppdatering och appar
- **[Utvecklingsguide](/bluefin-dx)** — behållare, devcontainers och AI-verktygen

Den [annonseringsbloggen](https://www.ypsidanger.com/announcing-project-bluefin/) har också lite extra bakgrundsinformation.

## Introduktionsvideor och podcastar

Titta på vår [lista av videor och recensioner](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) för mer information.

:::tip

"Utveckling är en process av konstant grenbildning och expansion."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
