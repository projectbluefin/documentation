---
title: Installation
slug: /installation
---

# Installations-Runbook

Damit von Anfang an alles gelingt, lohnt es sich, die Bluefin-Installation in Phasen aufzuteilen. So umgehst du häufige Fallstricke und Konfigurationen, die nur schlecht unterstützt werden. Auf Linux-freundlicher Hardware reicht es normalerweise aus, beim Start in den Installationsprozess die empfohlenen Standardwerte des Installers anzunehmen. Aber sicher ist sicher — hier sind die Details, falls du sie brauchst.

:::info[💙 Bitte leite deine Lieben nicht auf diese Seite 💙]

Dieses Runbook richtet sich an erfahrene Nutzer, die Bluefin für eine andere Person installieren. Es setzt ein fortgeschrittenes technisches Niveau voraus. Vergiss nicht, [eine gute Playlist auszuwählen](/music) für maximale Immersion.

:::

Diese Seite ist ein kurzes [Runbook](https://www.pagerduty.com/resources/learn/what-is-a-runbook/) für den Bluefin-Installationsprozess. Lese diese Dokumentation vollständig, um zu überleben (falls ein Raptor angreift).

## Unterstützungsstufen

Bluefin ist bewusst so konzipiert, dass es dem aktuellen Stand der Linux-Entwicklung folgt; das Projekt optimiert einen „golden path" (Weg der geringsten Widerstände), um den Nutzern die besten Erfolgsaussichten zu bieten. Manchmal hat man einfach Glück (oder Pech). Dieser Abschnitt ist von Homebrews [Support-Stufen](https://docs.brew.sh/Support-Tiers) inspiriert. Nicht alle Konfigurationen werden unterstützt. Hier eine kurze Übersicht:

### Stufe 1 — Die beste Erfahrung

Eine Stufe-1-Konfiguration gilt als vollständig unterstützt. Diese Konfigurationen erhalten das höchste Maß an Unterstützung und werden prioritisch behandelt.

#### Voraussetzungen

- Linux-freundliche Hardware (keine externen Kernel-Module erforderlich)
  - Linux-Laptop-Hersteller fallen möglicherweise unter diese Stufe — oder auch nicht.
  - „Unsere Hardware wird vollständig im upstream Linux-Kernel unterstützt" ← gut
  - „Wir unterstützen nur Ubuntu 24.04" ← wohl nicht gut
- Software, die für moderne Linux-Distributionen paketiert ist (Flatpak für Desktop-Apps, Container für die Entwicklung usw.)

#### Was Nutzer erwarten können

- Die zuverlässigste und beabsichtigte Bluefin-Erfahrung

**Empfehlung:** Bluefin

### Stufe 2 — Bei dir sieht es wahrscheinlich gut aus

Eine Stufe-2-Konfiguration ist nicht vollständig unterstützt und kann aufgrund von Hardware- oder Softwareentscheidungen Kompromisse enthalten. Sie funktioniert meistens, kann aber eine Konfiguration nach der Installation erfordern. Manche davon funktionieren einwandfrei, werden hier aber gelistet, weil die Software vom Hersteller bereitgestellt wird und das Team darauf keinen Einfluss hat, wie etwa Nvidia-Treiber.

#### Voraussetzungen

- Nvidia-GPUs in Desktop-PCs
- Einige Linux-Laptop-Hersteller fallen möglicherweise unter diese Stufe
  - Vielleicht gute Kernel-Unterstützung, aber ein externes Modul für eine Lüftersteuerung oder andere Komponente erforderlich
- Lokal gelegte Pakete oder andere Softwarekonfigurationen, die nicht in der Dokumentation beschrieben sind
- ARM/aarch64-Hardware — das Kernteam hat keinen Zugriff auf diese Hardware, erstellt aber Images für die Community

#### Was Nutzer erwarten können

- Unzuverlässige Upgrades und manuelle Systemwartung
  - Das Team berücksichtigt diese Konfigurationen beim Testen normalerweise nicht.
- Im Alltag normalerweise problemlos

**Empfehlung:** Probier Bluefin aus und schau, wie es läuft. Manche erstellen eigene Images, eine eingehende Prüfung kann nötig sein.

### Stufe 3 — Wer weiß schon?

Stufe 3 ist überwiegend nicht unterstützt — sie könnte perfekt funktionieren oder eine Katastrophe sein.

#### Voraussetzungen

- Bekannte Problemhardware (Asus- und Apple-Laptops). Für Intel-Macs von 2018–2020 mit T2-Security-Chip siehe die Community-[T2-Mac-Installationsanleitung](/t2-mac).
- Laptops mit Dual-GPU und Nvidia-Hardware
- Old-School-Packaging-Formate mit dem Motto „Viel Glück bei der Sache!"
  - .run-Dateien, Tar-Archive und AppImages
  - Überall dort, wo die Software DKMS erfordert
- Exotische Hardware im Allgemeinen — in einigen Fällen kann eine Stufe-3-Installation als Statussymbol dienen.

#### Was Nutzer erwarten können

- Unzuverlässige Upgrades und manuelle Systemwartung
  - Das Team berücksichtigt diese Konfigurationen beim Testen normalerweise nicht.
- „Labile Unterstützung" — das WLAN könnte gelegentlich funktionieren oder auch nicht, Probleme mit Sperren/Wiederherstellen usw.

**Empfehlung:** Ubuntu oder ein eigenes Image.

## Systemanforderungen

Prüfe die folgenden Punkte, bevor du Bluefin installierst:

- Verwende den [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer), um Installationsmedien zu erstellen. Andere Erstellungsmethoden funktionieren möglicherweise nicht ordnungsgemäß.
  - Die Nutzung von Ventoy ist **nicht unterstützt**
- Ältere BIOS-basierte Systeme sind **nicht unterstützt**; nur UEFI-Systeme werden unterstützt
- Dual Boot vom selben Laufwerk ist **nicht unterstützt**; verwende eine eigene Platte für ein weiteres Betriebssystem und wähle im BIOS ein anderes zu startendes OS
  - Bluefin unterstützt eine [Installation auf einem externen Laufwerk](#alternative-bluefin-to-go-external-drive), falls du es vor der endgültigen Entscheidung auf bare metal testen willst
- Wir **empfehlen dringend**, bei der Installation eine automatische Partitionierung zu verwenden; eine manuelle Partitionierung ist unnötig, es sei denn, du arbeitest auf einem Multi-Platten-System
- Eine Standard-Bluefin-Installation belegt etwa 12,4 GB (ca. 17,4 GB mit aktiviertem Entwicklermodus)

### Schnellreferenz

| Komponente   | Minimum                                | Empfehlung                                           |
| ------------ | -------------------------------------- | ---------------------------------------------------- |
| **CPU**      | 64-bit x86_64                          | So viel dein Budget hergibt                          |
| **RAM**      | 16 GB                                  | 32 GB+ / so viel wie möglich, wenn du ZFS verwendest |
| **Speicher** | 128 GB (nur SSD, HDDs sind zu langsam) | So viel dein Budget hergibt                          |
| **Grafik**   | Jede moderne Intel/AMD-GPU             | Jede moderne GPU außer Nvidia-Maxwell und älter      |
| **Boot**     | UEFI (BIOS nicht unterstützt)          | UEFI mit Secure Boot                                 |

### Plattenverbrauch

So viel Speicherplatz belegt jedes Bluefin-Image standardmäßig; dies enthält die Flatpak-Anwendungen (die du entfernen kannst):

#### Bluefin

Ca. 12,4 GB / ca. 17,4 GB mit aktiviertem Entwicklermodus

### Warum 16 GB RAM mindestens?

Bluefin wird mit einem umfangreichen, cloud-nativen Development-Stack ausgeliefert. Diese Workloads skalieren üblicherweise, indem sie ganze Computer-Cluster replizieren, und benötigen mehr Ressourcen als typische Workloads.

_Diese Anforderungen stellen einen reibungslosen Betrieb von Bluefins integriertem Development-Workflow und seiner container-first-Architektur sicher._

## Alternative: Bluefin to Go (externes Laufwerk) {#alternative-bluefin-to-go-external-drive}

Du kannst Bluefin auf einem externen Laufwerk installieren, um eine tragbare Bluefin-Installation zu erhalten:

![Bluefin auf einem externen Laufwerk](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**Vergiss nicht, während der Installation eine Vollverschlüsselung auszuwählen!**

Anwendungsfälle:

- Eine gute Möglichkeit, Linux auszuprobieren; wenn es dir gefällt, verschiebe das Laufwerk in dein Hauptgerät, ohne neu installieren zu müssen.
- Oder kauf ein neues Laufwerk für deinen PC und lege dein bestehendes OS in ein externes Gehäuse als Backup.
- Eine Maschine zeitweise anders nutzen oder Hardware ausprobieren, bevor du kaufst.
- Einen PC teilen, ohne über Linux zu streiten.
- Homelab- und tragliche Development-Sets.
- Ein Bluefin-DX-Laufwerk in eine Docking-Station für einen [Bazzite-getriebenen](https://bazzite.gg) Handheld einhängen.

### Windows to Go

Die Umkehrung geht ebenfalls: Verwende [Rufus](https://rufus.ie), um Windows im [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go)-Modus auf einem externen Laufwerk zu installieren — etwa für Firmware-Updates oder für seltene Windows-only-Software.

## Day 0: Planung

Die meisten Schmerzpunkte lassen sich direkt durch rechtzeitige Planung beheben. Beachte, dass der Begriff „Tag" abstr gemeint ist — installiere Bluefin bitte nicht über drei Tage hinweg. Normalerweise dauert eine Installation etwa zwanzig Minuten.

### Für alle Nutzer

- Ist deine Hardware Linux-freundlich?
  - Verstehst du die Einschränkungen einer Nvidia-GPU (falls vorhanden)?
    - Nvidia-Optimus-Laptops sind besonders problematisch
  - Wird für die Hardware ein out-of-tree-Kernel-Modul benötigt? Das kann zu langfristigem Wartungsaufwand führen.
  - Wird für die Software, die du nutzt, ein out-of-tree-Kernel-Modul benötigt?
    - VirtualBox und VMware werden nicht unterstützt
    - Nvidia, Xbox-One-Controller-Support, wl-Treiber und v4l2loopback werden unterstützt (das ist „best effort"; in bestimmten Fällen können wir nicht beeinflussen, dass Drittsoftware mit neueren Linux-Kerneln bricht)
    - [openzfs](https://github.com/openzfs/zfs) ist ab Werk enthalten. Es wird von Maintainer*innen regelmäßig genutzt und ist den Kerneln, die Bluefin ausliefert, noch nicht hinterhergehinkt. Wir können das jedoch nicht zusichern, da es sich um ein out-of-tree-Kernel-Modul handelt.
  - Wird dein WLAN-Modul von Linux unterstützt?
    - Zu schlecht unterstützte Module etwa Broadcom
    - Schau dir [USB-WiFi](https://github.com/morrownr/USB-WiFi) an, wenn dir nicht sicher bist
  - Wird dein Drucker/Scanner gut in Linux unterstützt?
    - [Driverless-Drucker](https://openprinting.github.io/printers/) werden stark empfohlen; wir können nicht zusichern, dass jeder Drucker funktioniert
    - [Scanner-Support](http://www.sane-project.org/sane-mfgs.html)
- Ist der BIOS/UEFI auf dem Gerät auf dem neuesten Stand?
- Wir empfehlen, alle Hardware-Firmware-Updates vor der Installation abzuschließen und auf dem neuesten Stand zu haben.
- Werden die Anwendungen, auf die du dich verlässt, gut auf Flathub unterstützt?
- Bietet dein VPN-Anbieter eine Wireguard-Konfiguration zum Einbetten im Network Manager?
- Ist eine eigene Platte bereit, sie zu verwenden?
  - Bluefin unterstützt kein Dual Boot vom selben Laufwerk
  - Bluefin unterstützt kein Rebase von einer bestehenden Fedora-Installation
- Denk daran, dass dies ein eigenes, an Fedora angelehntes Image ist; es bewegt sich schneller als etwa Ubuntu LTS
- Lese diese Dokumentation vollständig hier; hier einige zugehörige Upstream-Dokumentation:
  - [Homebrew](https://docs.brew.sh/) ([Spenden](https://github.com/Homebrew/brew#donations))
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### Für Entwickler*innen

- Kennst du dich mit der [Nutzung von Containern](https://docker-curriculum.com/#introduction) für die Entwicklung an?
- Kennst du dich mit dem Verwalten von [systemd-Diensteinheiten](https://systemd.io/) für sowohl System- als auch Nutzerkonten an?

## Day 1: Bereitstellung und Konfiguration

### Bereitstellung

:::info[Bluefin herunterladen]

Lade das richtige ISO von der [Website](https://projectbluefin.io/#scene-picker) herunter.

:::

- Installiere das Betriebssystem
  - Verwende die gesamte Platte mit automatischer Partitionierung
  - (Optional): [Secure Boot einrichten](#secure-boot)
  - (Optional): `ujust rebase-helper`, um zu `:stable` oder `:testing` zu wechseln
- Richte ein, teste und **sichere Backups** ab — obwohl das System-Image reproduierbare Daten sind, müssen deine Nutzerdaten in deinem Home-Verzeichnis dennoch gesichert werden. Bluefin liefert je nach Präferenz zwei Backup-Werkzeuge aus. Sie werden als Flatpak ausgeliefert, sodass du das nicht verwendete entfernen kannst. `rclone` ([Spenden](https://github.com/sponsors/rclone)) und `restic` ([Spenden](https://github.com/sponsors/restic)) sind ebenfalls vorinstalliert, wenn du Kommandozeilen-Werkzeuge bevorzugst.
  - [Deja Dup](https://apps.gnome.org/DejaDup/) ([Spenden](https://liberapay.com/DejaDup))
  - [Pika Backup](https://apps.gnome.org/PikaBackup/) ([Spenden](https://opencollective.com/pika-backup))
  - Stelle sicher, dass deine Backups funktionsfähig sind _bevor_ du mit der Konfiguration fortfährst

### Konfiguration

Die restlichen Schritte sind nutzerspezifische Konfiguration, die wir dir überlassen. Es ist ein guter Ansatz, für diesen Schritt Werkzeuge wie [chezmoi](https://www.chezmoi.io/) zum Konfigurieren und Synchronisieren von Dotfiles zu verwenden: `brew install chezmoi`

Da sich der User-Space ganz in deinem Home-Verzeichnis befindet, sollte jedes Werkzeug, das du für diesen Schritt verwendest, wie erwartet funktionieren. Idealerweise wird die Konfiguration, die du früher auf Systemebene eingerichtet hast, nun auf deiner Nutzerebene eingerichtet, was eine klare Trennung zwischen Nutzerkonfiguration und System-Image ergibt.

- Software-Installation
  - Verwende den Bazaar-Store, um Anwendungen zu installieren
  - (Optional): Installiere Kommandozeilen-Anwendungen über `brew`
- Konfiguration nach der Installation
  - Wähle/ändere nach deinem Wunsch Standardanwendungen
  - (Optional) Importiere deine [Wireguard-Konfiguration über `wg-quick`](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) oder verwende die VPN-Konfiguration in der Network-Manager-GUI
- (Optional) Entwicklerkonfiguration
  - `ujust devmode` und der Anleitung folgen
  - VSCode starten und Einstellungen sowie Erweiterungen konfigurieren

## Day 2: Betrieb und Wartung

Bluefin bemüht sich, die Wartung so einfach wie möglich zu machen, viele automatische Aufgaben lassen sich jedoch manuell ausführen.

- Führe ein System-Upgrade über die Menüoption oder mit `ujust update` durch, um ein Upgrade und einen Neustart zu beobachten
  - `ujust changelogs` zeigt kommende Änderungen und Updates aus Fedora an
  - `ujust bios` startet die Maschine neu und öffnet das BIOS/UEFI-Menü. Das ist nützlich, um ein Windows-Laufwerk zu starten
- Abonniere den [Blog](/blog)
- Versteh die [Rebase- und Rollback-Verfahren](/administration#switching-between-streams)
- Verwende die [Warehouse-Anwendung](https://github.com/flattool/warehouse), um den Flatpak-Lebenszyklus zu verwalten:
  - Auf eine alte Version pinnen oder zurücksetzen
  - Anwendungen mit einem Schlag einfach entfernen
- `ujust clean-system`, um alte Container und nicht verwendete Flatpak-Runtimes zu bereinigen

Und noch ein Rat: Je mehr du in Tag 0 investierst, desto glatter läuft dein Tag 1, was wiederum einen noch glatteren Tag 2 ergibt. Danach ist alles ein Statussymbol. Der Befehl `fastfetch` ([Spenden](https://github.com/sponsors/LinusDierheimer)) wird da sein, um dich an deinen Meilenstein zu erinnern:

![Bild](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot {#secure-boot}

Secure Boot wird standardmäßig unterstützt und bietet eine zusätzliche Sicherheitsebene.

Universal Blue unterstützt Secure Boot mit [unserem eigenen Schlüssel](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der).

Nach abgeschlossener Installation wirst du beim ersten Start aufgefordert, den Secure-Boot-Schlüssel über die [mokutil-UEFI-Menü-UI](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot) zu übernehmen (_QWERTY_-Tastatureingabe und -Navigation).

Wähle **Enroll MOK**, und gib `universalblue` als Passwort ein.

Falls dieser Schritt bei der anfänglichen Einrichtung nicht abgeschlossen wurde, kannst du den Schlüssel manuell übernehmen, indem du den folgenden Befehl im Terminal ausführst:

```sh
ujust enroll-secure-boot-key
```

Wenn du diesen Schlüssel vor der Installation oder dem Rebase übernehmen willst, lade den Schlüssel herunter und führe den folgenden Befehl aus:

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

Mit `mokutil --list-enrolled` kannst du bestätigen, dass der „ublue kernel"-Schlüssel aufgelistet ist:

![Bild](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
Wenn du `ublue akmods` aufgelistet siehst, ist dies ein ehemaliger Schlüssel, der bald entfernt wird. `ublue kernel` ist der aktuelle Schlüssel.
:::

Lenovo-ThinkPad-Nutzer (Reihen P, T, X): gehe vor dem Aktivieren von Secure Boot zum BIOS (F1) → Security → Secure Boot und aktiviere „Allow Microsoft 3rd party UEFI CA". Diese Einstellung ist erforderlich, damit der signierte Shim-Bootloader von Fedora von der Firmware erkannt wird. Ohne ihn schlägt Secure Boot mit einem Verstoßfehler fehl.
