---
title: Witamy w Bluefin
slug: /
pagination_next: downloads
---

# Witamy w Bluefin

Dla użytkowników końcowych Bluefin to system tak niezawodny jak Chromebook, niemal bezobsługowy, jednocześnie oferujący deweloperom potężny [tryb deweloperski cloud-native](/bluefin-dx). Zbudowany z technologii nowej generacji dla osób, które potrzebują niezawodnego komputera do pracy.

![Bluefin desktop screenshot](/img/bluefin-hero.webp)

## Czy Bluefin jest dla Ciebie?

Bluefin to desktop nowej generacji, który dąży do stopniowej poprawy. Surowo i agresywnie odchodzimy od przestarzej technologii tak szybko, jak to możliwe, aby zapewnić najlepsze możliwe doświadczenie.

:::tip

Niektorzy mogliby powiedzieć, że Bluefin najlepiej sprawi się deweloperom lub doświadczonym użytkownikom Linuxa, ale ja twierdzę, że równie dobrze sprawdza się nowym użytkownikom — dzięki niezawodności i temu, jak dobrze skonfigurowany wychodzi z fabryki.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin to:

- **Flatpak First** - Model aplikacji w Bluefin koncentruje się na kontenerowych aplikacjach utrzymanych w Flathub. Aplikacje, które źle współpracują z nowoczesnymi komponentami tak jak Wayland, Pipewire, Flatpak Portals itp., mogą dać słabe doświadczenie i nie są zalecane.
- **Celowo niewidoczny** - Bluefin to nie dystrybucja. Twoja relacja jest z Flathub, Homebrew i wszystkim, co umieścisz w swoich kontenerach.
- **Optymalizowany pod 96%** - Nie pod 4% - Bluefin przywiązuje wagę do podejścia "silniejsi razem". Zawsze możesz zrobić tak, jak chcesz, ale wartość płynie z dzielenia się najlepszymi praktykami. Nie tracimy czasu na przypadki brzegowe.
- **Dowodzony model deweloperski** - Doświadczenie dewelopera skupione na kontenerach i otwierający nowym użytkownikom Linuxa [narzędzia używane w cloud native](https://www.cncf.io/). Zobacz strony [Oświadczenie misji](/mission) i [Wartości](/values), aby dowiedzieć się więcej.
- **Celowo skupiony na świetnym sprzęcie** - Bluefin działa najlepiej na sprzęcie przyjaznym Linuxowi, aby zapewnić użytkownikom możliwie najlepsze doświadczenie bez starzełych technologii. Bluefin chce też wspierać OEM sprzedające laptopy i komputery z Linuxem, dąży więc do działania z najlepszą kombinacją oprogramowania i sprzętu. Nie robimy dodatkowych kroków, aby dokumentować albo obejść rzeczy, które kompromitują doświadczenie użytkownika, tak więc w niektórych przypadkach inny system operacyjny jest właściwym wyborem.

Jeśli Twoje wymagania wychodzą poza ten zakres, to **Bluefin może nie być najlepszym wyborem dla Ciebie**. Bluefin może powodować dyskomfort i [poważne uszkodzenia przy nieprawidłowym trzymaniu](/troubleshooting/#am-i-holding-bluefin-wrong).

## Doświadczenie pulpowe i funkcje

Bluefin oferuje pul GNOME ([Donate](https://www.gnome.org/donate/)) skonfigurowany przez naszą społeczność. Został zaprojektowany tak, by być bezobsługowym i nie szkodzić, żebyś mógł skupić się na swoich aplikacjach.

Aktualizacje systemu są oparte na obrazach i automatyczne. Aplikacje są logicznie oddzielone od systemu za pomocą Flatpaków dla aplikacji graficznych i `brew` dla aplikacji wiersza poleceń.

:::tip

Bluefin to "interpretacja ducha Ubuntu zbudowana na technologii Fedora" — powrót do ery historii Ubuntu, w której wychowało się wielu entuzjastów open source, tak samo jak klasyczne X-Men. Chcemy dowieść ten sam vibe tutaj; traktuj nas jako reboot. Spokojny klimat.

:::

- **Ubuntu-like układ GNOME** z kuratorowanymi rozszeniami:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - dla znajomego docka
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - dla ikon typu tray w prawym górnym rogu
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - zintegruj swój telefon z komputerem
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donate](https://github.com/sponsors/aunetx)) - dla tego blingu
  - [Search Light](https://github.com/icedman/search-light) - oferuje funkcję wyszukiwania i workflow podobny macOS Spotlight, powiązany z <kbd>Super</kbd>-<kbd>Space</kbd> domyślnie
- **[Developer Mode](/bluefin-dx)** - dedykowane narzędzia deweloperskie, które zamieniają Bluefin w potężny workstation cloud-native
- **[Ptyxis terminal](https://devsuite.app/ptyxis/)** dla workflow skupionych na kontenerach
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donate](https://github.com/sponsors/ranfdev)) dla zarządzania kontenerami
- **[Tailscale](https://tailscale.com)** wbudowany dla VPN wraz z `wireguard-tools` i wsparciem w trayu
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattJakeman.ExtensionManager)** ([Donate](https://github.com/sponsors/mJakeman)) wbudowany
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** z [Flathub](https://flathub.org):
  - Znajomy UI centrum oprogramowania do instalacji aplikacji graficznych
  - Zaniedbane aplikacje i przestarzałe runtime są wylistowane
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donate](https://ko-fi.com/heliguy)) wbudowany do zarządzania Flatpakami
- **Funkcje z kategorii quality of life**:
  - [Starship](https://starship.rs) prompt terminal włączony domyślnie
  - [Solaar](https://github.com/pwr-Solaar/Solaar) dla myszek Logitech wraz z `libratbagd`
  - [rclone](https://rclone.org/overview/) i [restic](https://restic.net/) dla montażu chmurowego i nowych kopii zapasowych
  - `zsh` i `fish` wbudowane jako opcjonalne powłoki
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) dla laptopów z podwójnymi kartami graficznymi
- **Fundament Universal Blue**:
  - Dodatkowe reguły udev dla kontrolerów gier i innego sprzętu z pudełka
  - Wszystkie kodeki multimedialne wbudowane
  - Stopniowane automatyzacje aktualizacji: używaj komputera normalnie i wyłączaj go, gdy skończysz

:::info[To cross-platformowy świat]

Workflow w Bluefin celowo skupia się na upstream -- wierzymy w spójne doświadczenie Linuxa dla wszystkich, czy to WSL na Windows, Podman/Docker na Macu, czy dowolny system Linux. [Ekosystem cloud native](http://cncf.io) udowodnił, że ten model działa. Pozwala milionom istniecych deweloperów na wejście z workflow, które już znają, i pozwala Linuxowi rywalizować tam, gdzie ma to największe znaczenie.

:::

## Następne kroki

- **[Downloads](/downloads)** — pobierz oficjalny ISO Bluefin albo torrent
- **[Installation Runbook](/installation)** — planowanie sprzętu i kroki konfiguracji
- **[User Guide](/administration)** — codzierna administracja, aktualizacje i aplikacje
- **[Developer Guide](/bluefin-dx)** — kontenery, devcontainers i narzędzia AI

[Post ogłoszeniowy](https://www.ypsidanger.com/announcing-project-bluefin/) zawiera też kilka dodatkowych informacji o tle.

## Filmy i podcasty wprowadzające

Zobacz nasz [listę filmów i recenzji](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) aby dowiedzieć się więcej.

:::tip

"Evolution to proces ciągłego rozgałęziania i rozszerzania się."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
