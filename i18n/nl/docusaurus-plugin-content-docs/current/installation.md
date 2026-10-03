---
title: Installatie
slug: /installation
---

# Installatierunbook

Om jezelf op te zetten voor succes is het nuttig om je Bluefin-installatie in fasen te plannen, zodat je veelvoorkomende valkuilen en slecht ondersteunde configuraties kan vermijden. Op Linux-vriendelijke hardware is het opstarten in het installatieproces en door de aanbevolen installatiewaarde heen klikken doorgaans genoeg. Maar te zeker is te zeker—hier is de details voor het geval je ze nodig hebt.

:::info[💙 Stuur je dierbaren alsjeblieft niet naar deze pagina 💙]

Deze runbook is voor ervaren gebruikers die Bluefin voor iemand anders installeren. Het is bedoeld op een geavanceerd technische vaardigheidsniveau. Vergeet niet om een [good playlist te kiezen](/music) voor maximale immersie.

:::

Deze pagina is een kort [runbook](https://www.pagerduty.com/resources/learn/what-is-a-runbook/) voor het Bluefin-installatieproces. Lees de volledige inhoud van deze documentatie om overleving te garanderen (in geval van een raptor-aanval).

## Ondersteuningstappen

Bluefin is opzettelijk ontworpen om de staat van de kunst van Linux-ontwikkeling te volgen; het project optimaliseert een “golden path” om gebruikers de beste kans op succes te geven. Echter, soms heb je geluk (of pech). Deze sectie is geïnspireerd door Homebrew's [ondersteuningstappen](https://docs.brew.sh/Support-Tiers). Niet alle configuraties worden ondersteund. Hier is een snelle gids:

### Niveau 1 - De beste ervaring

Een Niveau 1-configuratie wordt als volledig ondersteund beschouwd. Deze configuraties ontvangen het hoogste niveau van dekking en worden geprioriteerd.

#### Vereisten

- Linux-vriendelijke hardware (geen externe kernelmodules vereist)
  - Linux-laptopfabrikanten kunnen al of niet onder deze trap vallen.
  - “Onze hardware wordt volledig ondersteund in de upstream Linux-kernel” ← goed
  - “We ondersteunen alleen Ubuntu 24.04” ← waarschijnlijk niet goed
- Software verpakt voor moderne Linuxes (Flatpak voor desktop-apps, containers voor ontwikkeling, enz.)

#### Gebruikers kunnen verwachten

- De meest betrouwbare en bedoelde Bluefin-ervaring

**Aanbeveling:** Bluefin

### Niveau 2 - Je zit waarschijnlijk wel goed

Een Niveau 2-configuratie is niet volledig ondersteund en kan compromissen bevatten als gevolg van hardware- of softwarekeuzes.
Het kan meestal werken maar kan configuratie na installatie nodig hebben. Enkele hiervan werken prima maar zijn hier geplaatst omdat de software wordt geleverd door de fabrikant en niet iets wat het team kan controleren zoals Nvidia-drivers.

#### Vereisten

- Nvidia-GPU's op desktops
- Enkele Linux-laptopfabrikanten kunnen onder deze trap vallen
  - Heeft mogelijk goede kernelondersteuning maar een externe module nodig voor een ventilatorcontroller of een ander component
- Lokaal gelayerde pakketten of andere softwareconfiguraties die niet in de documentatie worden behandeld
- ARM/aarch64-hardware — het kernteam heeft geen toegang tot deze hardware maar genereert images voor de community

#### Gebruikers kunnen verwachten

- Onbetrouwbare upgrades en handmatig systeemonderhoud
  - Het team neemt deze configuraties gewoonlijk niet in rekening bij het testen.
- Werkt doorgaans prima van dag tot dag

**Aanbeveling:** Probeer Bluefin en kijk hoe het loopt. Enkele mensen maken custom images, onderzoek kan nodig zijn.

### Niveau 3 - Wie weet?

Niveau 3 is meestal niet ondersteund — het kan perfect werken of een ramp zijn.

#### Vereisten

- Bekend problematicale hardware (Asus- en Apple-laptops). Voor Intel-Macs van 2018–2020 met de T2-beveiligingschip, zie de community [T2 Mac-installatiegids](/t2-mac).
- Dual-GPU-laptop met Nvidia-hardware
- Oude “geluk met dit!”-verpakkingsformaten
  - .run-bestanden, tarballs en Appimages
  - Alles waar de software om DKMS vraagt
- Exotic hardware in het algemeen — in bepaalde gevallen kan een Niveau 3-installatie worden gebruikt als opschepperij.

#### Gebruikers kunnen verwachten

- Onbetrouwbare upgrades en handmatig systeemonderhoud
  - Het team neemt deze configuraties gewoonlijk niet in rekening bij het testen.
- “Onbetrouwbare ondersteuning” — wifi kan al of niet af en toe werkt, suspend/resume-problemen, enz.

**Aanbeveling:** Ubuntu of een custom image.

## Systeemvereisten

Bekijk de volgende overwegingen voordat je Bluefin installeert:

- Gebruik de [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer) om installatiemedia te maken. Andere manieren om media te maken werken mogelijk niet correct
  - Gebruik van Ventoy is **niet ondersteund**
- Oudere BIOS-gebaseerde systemen zijn **niet ondersteund**; alleen UEFI-systemen worden ondersteund
- Dual-booten van dezelfde schijf is **niet ondersteund**; gebruik een toegewijde schijf voor een ander besturingssysteem en gebruik je BIOS om een ander OS te booten
  - Bluefin ondersteunt een [installatie op een externe schijf](#alternative-bluefin-to-go-external-drive) als je het op bare metal wilt uitproberen voordat je definitief kiest
- We **bevelen sterk aan** om geautomatiseerd partitioneren te gebruiken tijdens de installatie; handmatig partitioneren is onnodig tenzij je op een multischijfsysteem zit
- Een Bluefin-standaardinstallatie is ~12,4 GB (~17,4 GB met de ontwikkelingsmodus ingeschakeld)

### Snelle referentie

| Component   | Minimum                                 | Aanbevolen                                       |
| ----------- | --------------------------------------- | ------------------------------------------------ |
| **CPU**     | 64-bit x86_64                           | Zo veel als je kunt uitgeven                     |
| **RAM**     | 16 GB                                   | 32 GB+ / Zo veel als je kunt uitgeven bij ZFS    |
| **Opslag**  | 128 GB (alleen SSD, HDDs zijn te traag) | Zo veel als je kunt uitgeven                     |
| **Grafiek** | Elke moderne Intel/AMD-GPU              | Elke moderne GPU behalve Nvidia Maxwell en ouder |
| **Boot**    | UEFI (BIOS niet ondersteund)            | UEFI met Secure Boot                             |

### Schijfruimte

Dit is hoeveel schijfruimte elke image van Bluefin standaard inneemt, inclusief de Flatpak-apps (die kunnen worden verwijderd):

#### Bluefin

~12,4 GB / ~17,4 GB met de ontwikkelingsmodus ingeschakeld

### Waarom 16 GB RAM-minimum?

Bluefin wordt geleverd met een uitgebreide cloud-native ontwikkelstack. Deze werklasten schalen doorgaans uit om volledige clusters van computers te repliceren en vragen om meer resources dan typische werklasten.

_Deze vereisten zorgen voor een vlotte werking van Bluefin's geïntegreerde ontwikkelworkflow en container-eerste architectuur._

## Alternatief: Bluefin to Go (Externe Schijf) {#alternative-bluefin-to-go-external-drive}

Je kan Bluefin op een externe schijf installeren om een draagbare Bluefin-installatie te krijgen:

![bluefin-drive](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**Vergeet niet om volledige schijfversleuteling te selecteren tijdens de installatie!**

Gebruiksscenario's:

- Een geweldige manier om Linux te uitproberen; als het je bevalt, zet de schijf in je hoofdmachine zonder te herinstalleren.
- Of koop een nieuwe schijf voor je PC en zet je bestaande OS in een externe behuizing als backup.
- Tijdelijk herbestemmen van een machine of uitproberen van hardware voordat je koopt.
- Een PC delen zonder te ruziën over Linux.
- Homelab- en draagbare ontwikkelopstellingen.
- Voeg een Bluefin DX-schijf toe aan een aangekoppelde [Bazzite-gedreven](https://bazzite.gg) handheld.

### Windows to Go

Je kan ook het omgekeerde doen: gebruik [Rufus](https://rufus.ie) om Windows te installeren op een externe schijf in [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go)-modus voor firmware-upgrades of zeldzame Windows-only software.

## Dag 0: Planning

De meeste pijnpunten kunnen direct worden aangepakt met vooraf planning. Merk op dat de term “Dag” een abstract is—installeer Bluefin alstublieft niet over de loop van drie dagen. Doorgaans duurt een installatie ongeveer twintig minuten.

### Alle Gebruikers

- Is je hardware Linux-vriendelijk?
  - Begrijp je de beperkingen van het hebben van een Nvidia-GPU (indien van toepassing)?
    - Nvidia Optimus-laptops zijn bijzonder moeilijk
  - Vereist de hardware een out-of-tree kernelmodule? Dit kan leiden tot langetermijnonderhoudsproblemen
  - Vereist de software die je gebruikt een out-of-tree kernelmodule?
    - VirtualBox en VMware worden niet ondersteund
    - Nvidia, Xbox One-controllerondersteuning, wl-drivers en v4l2loopback worden ondersteund (dit is “best effort”; in bepaalde gevallen kunnen we derde-partijsoftware die breekt met nieuwere versies van de Linux-kernel niet controleren)
    - [openzfs](https://github.com/openzfs/zfs) is meegeleverd vanaf het begin. Het wordt regelmatig gebruikt door onderhouders en is nog niet achter geraakt bij de kernels die Bluefin levert. Echter, we kunnen dit nog niet garanderen omdat het een out-of-tree kernelmodule is
  - Wordt je wireless-kaart ondersteund door Linux?
    - Slecht ondersteunde kaarten om Broadcom
    - Check [USB-Wifi](https://github.com/morrownr/USB-WiFi) als je niet zeker bent
  - Wordt je printer/scanner goed ondersteund in Linux?
    - [Driverless printers](https://openprinting.github.io/printers/) worden sterk aanbevolen; we kunnen niet garanderen dat elke printer zal werken
    - [Scannerondersteuning](http://www.sane-project.org/sane-mfgs.html)
- Is de BIOS/UEFI bijgewerkt op het apparaat?
- We bevelen aan om alle hardwarefirmware-upgrades bij te werken voordat je installeert
- Worden de toepassingen op die je nodig hebt goed ondersteund op Flathub?
- Biedt je VPN-provider een wireguard-configuratie om te importeren in Netwerkbeheer?
- Toegewijde schijf klaar om te gebruiken?
  - Bluefin ondersteunt niet dual-booten van dezelfde schijf
  - Bluefin ondersteunt niet rebasen vanaf een bestaande installatie van Fedora
- Onthoud dat dit een custom Fedora-gebaseerde image is, het gaat op een flink tempo vooruit vergeleken met iets zoals Ubuntu LTS
- Lees deze documentatie volledig, hier zijn enkele bijbehorende upstream-documentatie:
  - [Homebrew](https://docs.brew.sh/) ([Donate](https://github.com/Homebrew/brew#donations))
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### Ontwikkelers

- Begrijp je [hoe je containers moet gebruiken](https://docker-curriculum.com/#introduction) voor ontwikkeling?
- Begrijp je hoe je [systemd-service-units](https://systemd.io/) moet beheren voor zowel het systeem als gebruikersaccounts?

## Dag 1: Implementatie en Configuratie

### Implementatie

:::info[Download Bluefin]

Download de juiste ISO van [de website](https://projectbluefin.io/#scene-picker)

:::

- Installeer het besturingssysteem
  - Gebruik de volledige schijf met geautomatiseerd partitioneren
  - (Optioneel): [Zet Secure Boot op](#secure-boot)
  - (Optioneel): `ujust rebase-helper` om te bewegen naar `:stable` of `:testing`
- Zet op, test en **verifiëren back-ups** — Hoewel de systeemimage reproduceerbaar is, moet je gebruikersdata in je home-map nog steeds worden gebackupt. Bluefin wordt geleverd met twee backuputiliteiten afhankelijk van je voorkeur. Ze worden geïnstalleerd als Flatpaks zodat je degene die je niet gebruikt kan verwijderen. `rclone` ([Donate](https://github.com/sponsors/rclone)) en `restic` ([Donate](https://github.com/sponsors/restic)) zijn ook vooraf geïnstalleerd als je commandoregeltools prefereert
  - [Deja Dup](https://apps.gnome.org/DejaDup/) ([Donate](https://liberapay.com/DejaDup))
  - [Pika Backup](https://apps.gnome.org/PikaBackup/) ([Donate](https://opencollective.com/pika-backup))
  - Zorg ervoor dat je back-ups functioneel zijn _voordat_ je doorgaat met configuratie

### Configuratie

De rest van deze stappen zijn gebruikersspecifieke configuratie en iets wat we gewoonlijk aan je overlaten. Het automatiseren van deze stap is een goede plek om tools zoals [chezmoi](https://www.chezmoi.io/) te gebruiken voor dotfile-configuratie en syncing: `brew install chezmoi`

Omdat de userspace helemaal in je home-map zit, zal elke tool die je gebruikt om deze stap te automatiseren werken zoals je verwacht. Ideaal is configuratie die je misschien hebt gedaan op het systeemniveau in het verleden wordt nu geconfigureerd op je gebruikersniveau, wat leidt tot een scheiding tussen gebruikersconfiguratie en de systeemimage.

- Softwareinstallatie
  - Gebruik de Bazaar-winkel om toepassingen te installeren
  - (Optioneel): Installeer commandoregel-apps via `brew`
- Na-installatieconfiguratie
  - Selecteer/Wijzig standaard-apps zoals je past
  - (Optioneel) Importeer je [wireguard-configuratie via `wg-quick`](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) of gebruik de VPN-configuratie in de Netwerkbeheer-GUI
- (Optioneel) Ontwikkelersconfiguratie
  - `ujust devmode` en volg de instructies
  - Start VSCode en configureer je instellingen en extensies

## Dag 2: Operaties en Onderhoud

Bluefin streeft naar onderhoud zo eenvoudig mogelijk maken, echter veel van de geautomatiseerde taken kunnen handmatig worden gedraaid.

- Draai een Systeemupgrade via de menu-optie of `ujust update` om een upgrade en herstart te observeren
  - `ujust changelogs` toont inkomende wijzigingen en updates van Fedora
  - `ujust bios` herstart de machine en betreedt de BIOS/UEFI-menu. Dit is nuttig om in een Windows-schijf te booten
- Abonneer je op de [blog](/blog)
- Verstaan [rebase- en rollback-procedures](/administration#switching-between-streams)
- Gebruik de [Warehouse-toepassing](https://github.com/flattool/warehouse) om de Flatpak-lifecycle te beheren:
  - Pin aan een oude versie of rollback
  - Verwijder eenvoudig toepassingen in één keer
- `ujust clean-system` om oude containers en ongebruikte Flatpak-runtimes op te ruimen

En nog meer advies: hoe meer je investeert in dag 0, hoe soepeler je dag 1 zal zijn, wat resulteert in een nog soepelere dag 2. Na dat, is het alles opschepperij. Het `fastfetch`-commando ([Donate](https://github.com/sponsors/LinusDierheimer)) zal er zijn om je mijlpaal te herinneren:

![image](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot

Secure Boot wordt ondersteund standaard en biedt een extra beveiligingslaag.

Universal Blue ondersteunt secure boot met [onze custom key](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der).

Na de installatie, tijdens de eerste boot, zal je worden gevraagd om de secure-boot-key in te rollen met de [mokutil UEFI-menu-UI](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot) (_QWERTY_-toetsenbordinvoer en navigatie).

Selecteer **Enroll MOK**, en voer `universalblue` in als het wachtwoord.

Als deze stap niet wordt voltooid tijdens de initiële opzet, kan je de key handmatig inschakelen door het volgende commando in de terminal te draaien:

```sh
ujust enroll-secure-boot-key
```

Als je deze key voor de installatie of rebase wilt inschakelen, download de key en draai het volgende:

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

Je kan `mokutil --list-enrolled` gebruiken om te bevestigen dat de “ublue kernel”-key wordt vermeld:

![image](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
Als je `ublue akmods` ziet vermeld, is het een vroegere key die snel zal worden verwijderd. `ublue kernel` is de huidige key.
:::

Lenovo ThinkPad-gebruikers (P, T, X-reeks): voordat je Secure Boot inschakelt, ga naar BIOS (F1) → Security → Secure Boot en schakel “Allow Microsoft 3rd party UEFI CA” in. Deze instelling is vereist zodat Fedora's signed shim-bootloader wordt erkend door de firmware. Zonder dit zal Secure Boot falen met een violation-error.
