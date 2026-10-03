---
title: Administratorshandleiding
slug: /administration
---

#### Dagelijkse bediening

Bluefin is ontworpen om het leven lang van de hardware te installeren zonder herinstallatie. In tegenstelling tot traditionele bestelsystemen is de image altijd schoon en “puur”, wat upgrades minder problematisch maken. Updates zijn standaard automatisch en onopvallend.

Dit betekent doorgaans dat je je systeem één keer opzet en het daarna zo laat blijven. Waarschijnlijk kom je hier nooit meer terug. 🙂

:::tip

Ik wil dat “defaults-lifestyle”.

-- [Matt Ray](https://www.softwaredefinedtalk.com/hosts/matt)

:::

![Bluefin Desktop Environment Illustration](/img/user-attachments/229f3763-c876-4402-8249-e631303e722b.png)

## Apps installeren

Gebruik [Bazaar](https://github.com/kolunmi/bazaar) om [toepassingen te installeren uit Flathub](https://flathub.org/). Systeemupdates en -upgrades worden niet door deze applicatie afgehandeld; het scala is beperkt tot het installeren van Flatpaks uit Flathub. Twee Flatpak-beheertools zijn meegeleverd:

- [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) biedt toepassingsbeheer.
- [Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal) is ook meegeleverd voor rechtenbeheer.

## Systeemupdates

Bluefin is ontworpen om “hands off” te zijn. Het systeem controleert elke zes(6) uur op updates. Dit omvat systeemupdates, flatpaks, pet-containers en homebrew.

- De meeste images worden wekelijks gepubliceerd, maar het kan op elk moment een nieuwe update duwen.

Updates worden toegepassan wanneer het systeem herstart. Daarom wordt aanbevolen om je apparaat regelmatig uit te zetten als het niet wordt gebruikt, ervoor te zorgen dat kernelupdates worden toegepassan. Toepassingsupdates (zoals de browser) gebeuren onafhankelijk hiervan en vereisen geen herstart.

Machinefirmware-updates worden geboden via de Firmware-toepassing.

![Firmware](/img/user-attachments/701d18b2-a40a-432a-ae22-0e3ac29fe191.png)

### Updates beheren

Selecteer in **Instellingen** → **Netwerk** → een netwerkinstelling **Gemeten verbinding: heeft datalimieten of kan kosten veroorzaken** om Bluefin-updates te pauzeren:

![Instellingen → Netwerk → Een netwerkinstelling - `Gemeten verbinding: heeft datalimieten of kan kosten veroorzaken` Gemarkeerd](/img/user-attachments/00d04190-3a68-4fd1-8e03-7e97ef3193f2.png)

## Stromen en throttle-instellingen

Bluefin biedt images op basis van de huidige versie van Fedora. Dit doet ze om gebruikers flexibiliteit te geven over hoe agressief hun updates mogen zijn. Deze worden “stromen” genoemd.

### Bluefin

`stable`: Dit is de standaardstream voor Bluefin, gericht op de meeste gebruikers. Het wordt altijd gealiaseerd naar de huidige versie van Fedora maar volgt het release-schema van Fedora CoreOS. Dit betekent dat kernelupgrades ongeveer 2 weken na hun landing in Fedora verschijnen, wat nuttig kan zijn om kernelregressies te vermijden omdat het Bluefin-team kan pinnen naar een specifieke kernel in die omstandigheden. We noemen dit de kernel “gaten”. `stable-daily` is beschikbaar voor wie wekelijkse builds wil.

:::note[Latest (voor testers)]
`latest`: Voor gebruikers die alléén het nieuwste van Fedora willen, een ongegate Linux-kernel, dagelijkse updates, een volledig open throttle. 🔥 Deze stream is met opzet onbranding en niet bedoeld voor algemeen gebruik.
:::

Je kan kiezen uit drie rolling-tags, of pinnen op een specifieke versie van Fedora. Zie de [release-notities](https://github.com/projectbluefin/bluefin/releases) voor specifieke versie-informatie:

|                     | `stable` (standaard) of `stable-daily` | `latest`          |
| ------------------- | -------------------------------------- | ----------------- |
| Fedora-versie:      | 43                                     | 43                |
| GNOME-versie:       | 49                                     | 49                |
| Doelgroep:          | Alle gebruikers                        |                   |
| Systeemupdates:     | Wekelijkse of dagelijkse builds        | Dagelijks         |
| Toepassingsupdates: | Twee keer per dag                      | Twee keer per dag |
| Kernel:             | Gated                                  | Ungated           |

Het grote verschil tussen `latest` en `stable` is de kernelcadans en wanneer ze een grote upgrade doen. `latest` upgradet naar de volgende grote Fedora-release zodra deze beschikbaar is en bouwt dagelijks. `stable` upgradet wanneer CoreOS zijn userspace-upgrade doet, meestal een paar weken later, en bouwt wekelijkse of dagelijkse builds. Gebruikers kunnen de `stable-daily`-image kiezen voor dagelijkse stable-updates, of blijven bij `stable` voor wekelijkse builds.

#### Gated kernel

De `stable`-tag heeft een gated kernel. Deze kernel volgt dezelfde versie als de [Fedora CoreOS stable-stream](https://fedoraproject.org/coreos/release-notes?arch=x86_64&stream=stable), wat een langzamere cadans is dan standaard Fedora Silverblue. Het Universal Blue-team kan tijdelijk pinnen naar een specifieke kernel om regressies te vermijden die gebruikers kunnen treffen.

Het toevoegen en bewerken van kernel-bootargumenten wordt afgehandeld door `bootc kargs`. Zie de [upstream-documentatie](https://bootc.dev/bootc/building/kernel-arguments.html) voor meer informatie.

:::info[Het is alles just Bluefin]

De componenten van Bluefin worden gedeeld over alle images; denk er niet aan als een aparte “Editie” of “Spin”. Bluefin streeft naar hetzelfde over alle images; we vinden dat de aggressiviteit van updates “een instelling” kan zijn. Ideaal gebruik je “Bluefin” en hoef je geen zorgen te maken over je updatestream.

:::

### Tussen stromen wisselen {#switching-between-streams}

Gebruik het commando `ujust rebase-helper` om rebase te selecteren en een specifieke stream te kiezen:

![`ujust rebase-helper` - kanaal](/img/user-attachments/5ac60808-1e15-4c80-9592-e41fd2b52917.png)

Of selecteer `date` en kies een oudere image.

![`ujust rebase-helper` - datum](/img/user-attachments/567061da-036d-4779-873e-154a5a833e67.png)

#### Tussen stromen wisselen (handmatig)

Bluefin gebruikt [`bootc`](https://bootc.dev/bootc/) om de systeemimage te beheren. Om je huidige en geplande deployments te inspecteren, draai:

```sh
sudo bootc status
```

Dit toont je gebootte image, geplande update (indien aanwezig) en rollback-doel:

```
Current staged image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260901.0
    Image digest: sha256:...
Current booted image: ghcr.io/projectbluefin/bluefin:stable
    Image version: 43.20260825.0
    Image digest: sha256:...
```

De referentie `ghcr.io/projectbluefin/bluefin:stable` geeft de image en de stream-tag aan. Zoek naar `:stable`, `:latest`, of gepinde datatags.

Als je lokaal gelayerde pakketten hebt, reset ze dan voordat je tussen stromen wisselt:

```sh
rpm-ostree reset
```

**Pro-tip**: Bluefin's [release-notities](https://github.com/projectbluefin/bluefin/releases) bevatten instructies voor het wisselen tussen stromen voor elke release.

Gebruik het commando `bootc switch` om naar een andere stream te bewegen:

#### Voorbeelden van handmatig wisselen

<details>

<summary>Wisselen naar `:stable`. Het vlag `--enforce-container-sigpolicy` garandeert handtekeningvalidatie voor de doelimage:</summary>

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable --enforce-container-sigpolicy
```

Wisselen naar `:testing`:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:testing --enforce-container-sigpolicy
```

Wisselen naar NVIDIA-hardwareimages:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin-nvidia:stable --enforce-container-sigpolicy
```

Pinnen op een specifieke datatag:

```sh
sudo bootc switch ghcr.io/projectbluefin/bluefin:stable-20260825 --enforce-container-sigpolicy
```

Rollback naar de vorige deployment:

```sh
sudo bootc rollback
```

Gebruik `skopeo inspect` om image-metadata en beschikbare tags op te vragen:

```sh
skopeo inspect docker://ghcr.io/projectbluefin/bluefin:stable
```

</details>

Dit toont alle beschikbare tags en nuttige metadata zoals image- en kernelversies.

Zie de [bootc-documentatie](https://bootc.dev/bootc/) voor meer informatie.

## Virtuele particuliere netwerken (VPN)

[Tailscale](https://tailscale.com) is standaard meegeleverd om VPN-diensten te bieden voor zowel desktop- als ontwikkelingsgebruik. [Tailscale is heel nuttig](https://blog.6nok.org/tailscale-is-pretty-useful/).

- [Tailscale gebruiken met Mullvad](https://tailscale.com/docs/features/exit-nodes/mullvad-exit-nodes) — biedt de beste kant-en-klare ervaring
- [Tailscale gebruiken met Docker](https://tailscale.com/docs/features/containers/docker) — voor ontwikkeling
- [Systeemtray gebruiken met tailscale](https://tailscale.com/docs/features/client/linux-systray) — volg dit voor het opzetten van de tailscale-pictogram in de systeemtray. Merk op dat `wl-clipboard` al op het systeem zit, dus je hoeft dat niet te installeren.
- Tailscale's [YouTube-kanaal](https://www.youtube.com/@Tailscale) heeft veel geweldige tips en trucs
- Goede VPN-providers kunnen Wireguard-configuraties bieden die rechtstreeks in het Netwerkbeheer kunnen worden geïmporteerd; zie hun documentatie voor meer informatie:
  - [NordVPN](https://support.nordvpn.com/hc/en-us/articles/20347784574097-Connecting-to-NordVPN-Linux-Network-Manager)

Er zijn ook VPN-providers op Flathub die een goede ervaring bieden:

- [Mozilla VPN](https://flathub.org/apps/org.mozilla.vpn) ([Donate](https://foundation.mozilla.org/en/?form=donate&gad_source=1))
- [ProtonVPN-client](https://flathub.org/apps/com.protonvpn.www) — beschikbaar op Flathub

Andere VPN-providers die hier niet expliciet worden genoemd, kunnen een minder verpakkingservaring hebben en worden niet aanbevolen. Als je VPN-provider onder deze categorie valt, kan het exporteren van de wireguard-configuratie en deze handmatig importeren de beste aanpak zijn.

## Lokaal layeren

Het rechtstreeks toevoegen van pakketten op de host-image wordt niet aanbevolen in Bluefin. Het besturingssysteem is ontworpen om puur en reproduceerbaar te blijven als een OCI-image beheerd door `bootc`.

Werklasten moeten geïsoleerd zijn in containers (via Distrobox of Devcontainers), CLI-tools geïnstalleerd via Homebrew, en grafische toepassingen geïnstalleerd uit Flathub.

Als je tijdelijk een hostpakket moet layeren:

```sh
rpm-ostree install <package>
```

Om alle gelayerde pakketten te verwijderen en terug te keren naar de pure image-baseline:

```sh
rpm-ostree reset
```

Herstart om toe te passen.

| Aanbevolen alternatief | Niet layeren op host    |
| ---------------------- | ----------------------- |
| Flatpak-apps           | Grafische desktop-apps  |
| Homebrew CLI-tools     | Host-utiliteiten        |
| Distrobox / Containers | Ontwikkelingstijdranden |

## Standaardwaarden overschrijven

Bluefin-systeemstandaarden worden op the base-image geleverd samen met Fedora-configuratie in `/usr/etc`. De meeste hiervan kunnen worden overschreven door een bestand in `/etc` te plaatsen.

Bijvoorbeeld: de Distrobox-configuratie zit in `/usr/etc/distrobox/distrobox.ini`. Je aanpassingsopties worden in `/etc/distrobox/distrobox.ini` geplaatst. Dit is nuttig in situaties waarin je een kopie van het originele bestand als referentie nodig hebt.

Zie de [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir/latest/) voor meer informatie over configuratieopties, in het bijzonder `~/.local` en `~/.config`.

## Communityaliasen en -workarounds

[just](https://just.systems) wordt op Bluefin gebruikt als taskrunner. Dit zijn doorgaans community-hulpaliasen of meer complexe scripts die helpen om sommige taken of initiële opzet te automatiseren. Dit wordt gealiaseerd als `ujust`, zodat je `just` zelf voor je andere projecten kan gebruiken.

### Aan de slag met ujust

- `ujust --choose` — toont elk commando en het script dat wordt uitgevoerd wanneer dat commando wordt gekozen. Nuttig voor het doorbladeren van de beschikbare commando's
- `ujust -n $command` — de `-n` draait een commando in dry-run-modus, nuttig voor het inspecteren van de uitgevoerde commando's

:::tip

Pro-tip, bewaar je eigen taken en aliasen in `~/.Justfile`, en ze zijn ook handig om in de root van je projectbestanden te zetten voor het automatiseren van veelgebruikte taken, zie dit voorbeeld van [Fedora Kinoite](https://gitlab.com/fedora/ostree/ci-test/-/blob/main/justfile?ref_type=heads).

:::

### Samengestelde toolbundels

Bluefin bevat samengestelde CLI-toolcollecties. Deze commando's installeeren samengestelde collecties van tools via Homebrew:

| Commando            | Description                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ujust bluefin-cli` | Moderne CLI-tools: atuin, bat, chezmoi, direnv, eza, fd, gh, glab, ripgrep, starship, tealdeer, television, zoxide, en meer |

## Systeemcommando's

| Commando                       | Description                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ujust update`                 | Manueel het systeem, flatpaks en brew-formules bijwerken                                                                                                                                                                                 |
| `ujust toggle-updates`         | Automatische systeemupdates in- of uitschakelen                                                                                                                                                                                          |
| `ujust changelogs`             | Toont de changelogs voor elk pakket sinds de laatste update                                                                                                                                                                              |
| `ujust bios`                   | Herstart de PC en betreed de BIOS/UEFI. Nuttig voor het draaien van dual-boot-systemen van onafhankelijke schijven                                                                                                                       |
| `ujust bios-info`              | Toont BIOS/UEFI-informatie (fabrikant, productnaam, versie, releasedatum)                                                                                                                                                                |
| `ujust device-info`            | Stuurt de status, flatpak-lijst en systeeminfo naar het CentOS-pastebin en geeft de URL terug naar de terminal. Hiermee kan het eindgebruiker de URL handmatig aankoppelen met hun info zodat anderen hen kunnen helpen bij het debuggen |
| `ujust rebase-helper`          | Interatieve assistent om tussen stromen te wisselen, te rebase naar andere images, of te rollback naar een vorige versie                                                                                                                 |
| `ujust clean-system`           | Ruim ongebruikte containers, volumes en flatpak-tijdranden op                                                                                                                                                                            |
| `ujust check-idle-power-draw`  | Meet het idle-powerverbruik van je systeem met powerstat                                                                                                                                                                                 |
| `ujust check-local-overrides`  | Toont bestanden die verschillen tussen `/usr/etc` en `/etc` om lokale aanpassingen te identificeren                                                                                                                                      |
| `ujust logs-this-boot`         | Toont alle systeemlogboeken van de huidige boot                                                                                                                                                                                          |
| `ujust logs-last-boot`         | Toont alle systeemlogboeken van de vorige boot                                                                                                                                                                                           |
| `ujust enroll-secure-boot-key` | Rol de Nvidia-driver & KMOD-handtekeningkey in voor secure boot (wachtwoord: "universalblue")                                                                                                                                            |
| `ujust toggle-user-motd`       | Schakel de weergave van de message of the day in terminal in of uit                                                                                                                                                                      |
| `ujust toggle-tpm2`            | Schakel automatisch LUKS-schijvenloten via TPM in of uit (in- of uitschakelen met optionele PIN)                                                                                                                                         |
| `ujust toggle-iwd`             | Wissel tussen iwd en wpa_supplicant voor Wi-Fi-netwerk (iwd kan doorstroom verbeteren en latentie verlagen)                                                                                                                              |
| `ujust benchmark`              | Draait een eenminutige systembenchmark met stress-ng                                                                                                                                                                                     |
| `ujust powerwash`              | Fabrieksmatig reset dit apparaat naar zijn initiële staat (experimentele functie)                                                                                                                                                        |

## Developer Experience-commando's

| Commando               | Description                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `ujust devmode`        | Wissel tussen Bluefin en de Developer Experience (bluefin-dx)                                                                        |
| `ujust dx-group`       | Voeg je gebruiker toe aan docker, incus-admin, libvirt en dialout-groepen voor volledige developer-toegang                           |
| `ujust bluefin-cli`    | Installeer Bluefin's samengestelde commandoregelervaring met moderne tools (atuin, bat, eza, fd, ripgrep, starship, zoxide, en meer) |
| `ujust toggle-devmode` | Alias voor `ujust devmode`                                                                                                           |

## Apps-installatiecommando's

| Commando                              | Description                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `ujust jetbrains-toolbox`             | Installeer [JetBrains Toolbox](https://www.jetbrains.com/toolbox-app/) voor het beheer van JetBrains-IDEs |
| `ujust install-opentabletdriver`      | Installeer of verwijder [OpenTabletDriver](https://opentabletdriver.net/), een open source-tabletdriver   |
| `ujust install-system-flatpaks`       | Installeer de standaard systeemflatpaks (nuttig na een rebase)                                            |
| `ujust install-system-flatpaks-extra` | Installeer extra aanbevolen Flatpak-apps                                                                  |

Merk op dat Bluefin doorgaans probeert de systeem-Justfiles smal af te bakenen; de meeste hiervan zijn workarounds en geen volledig uitgeruste commando's. Ze kunnen worden verwijderd of gewijzigd afhankelijk van het probleem waarvoor ze oorspronkelijk waren bedoeld.

## Extensies beheren

Bluefin gebruikt de [Extension Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager) van Matthew Jakeman om de desktopextensies te beheren. De toepassing is standaard meegeleverd. Je kan er toegang toe via het [Logo Menu](https://github.com/Aryan20/Logomenu) (bedankt Aryan Kaushik!)

![GNOME Extension Menu Option (opens Extension Manager)](/img/user-attachments/c5ad1637-95c9-4692-8b25-e8ca6248e575.png)

Dit is nuttig als je besluit dat je sommige van de met Bluefin meegeleverde niet wilt gebruiken.

![Extension Manager - System Extensions Highlight](/img/user-attachments/31255d26-580e-4179-a748-635bfa540e9a.png)

:::note

In het onwaarschijnlijke geval dat je sessie crasht, worden al je extensies uitgeschakeld. In het zeldige geval dat dit gebeurt, moet je ze mogelijk allemaal weer inschakelen in de extensiebeheer.

:::

## Beheer op afstand

:::note[Help Gewenst]

Deze functie is onvolledig en nodig bijdragers om het een werkelijkheid te maken.

:::

Bluefin en Aurora bevatten Cockpit voor machinebeheer. We hopen meer kant-en-klare beheervorlagen mee te leveren, zie [deze issue](https://github.com/projectbluefin/bluefin/issues) als je geïnteresseerd bent om te volunteeren.

## Verificatie

Deze images zijn getekend met sigstore's [cosign](https://docs.sigstore.dev/cosign/). Bluefin Classic gebruikt key-based signing, verify het dus met de `cosign.pub`-key van [ublue-os/bluefin](https://github.com/ublue-os/bluefin):

```sh
cosign verify --key https://raw.githubusercontent.com/ublue-os/bluefin/main/cosign.pub \
  ghcr.io/ublue-os/bluefin:stable
```

Dakota en Utah zijn keyless getekend — zie [Supply Chain Security](/supply-chain) voor hun verificatiecommando's.
