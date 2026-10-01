---
title: Benvenuto in Bluefin
slug: /
pagination_next: downloads
---

# Benvenuto in Bluefin

Per gli utenti finali un sistema affidabile come un Chromebook con manutenzione vicina allo zero, offrendo al contempo agli sviluppatori una potente [modalità di sviluppo cloud-native](/bluefin-dx). Realizzato con tecnologia di nuova generazione, per persone che hanno bisogno che le loro macchine portino a termine il lavoro.

![Screenshot del desktop Bluefin](/img/bluefin-hero.webp)

## Bluefin è per te?

Bluefin è un desktop Linux di nuova generazione che tende verso il miglioramento progressivo. Ci allontaniamo in modo rigoroso e deciso dalle tecnologie legacy il prima possibile, per offrire la migliore esperienza possibile.

:::tip

Qualcuno potrebbe essere incline a dire che Bluefin sarebbe più adatto per sviluppatori o utenti Linux esperti, ma io sostengo che sia un contendente altrettanto valido per i nuovi utenti, per via della sua affidabilità e di quanto sia ben configurato appena estratto dalla scatola.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin è:

- **Flatpak First** - Il modello applicativo in Bluefin è incentrato su app isolate, mantenute su Flathub. Le applicazioni che non funzionano bene con componenti moderni come Wayland, Pipewire, i portali Flatpak, ecc. possono offrire un'esperienza scadente e non sono consigliate.
- **Intenzionalmente invisibile** - Bluefin non è una distribuzione. Il tuo rapporto è con Flathub, Homebrew e qualunque cosa tu metta nei tuoi container.
- **Ottimizzato per il 96%** - Non per il 4% - Bluefin adotta un approccio "più forti insieme" rispetto alle funzionalità. Puoi sempre fare ciò che vuoi, ma il valore deriva dalla condivisione delle migliori pratiche. Non dedichiamo molto tempo ai casi limite.
- **Modello di sviluppo collaudato** - L'esperienza di sviluppo è incentrata sui container e sull'introduzione di nuovi utenti Linux agli [strumenti usati nel cloud native](https://www.cncf.io/). Consulta le pagine [Mission](/mission) e [Valori](/values) per maggiori informazioni.
- **Intenzionalmente focalizzato su hardware di qualità** - Bluefin funziona al meglio su hardware amichevole verso Linux, per offrire agli utenti un'esperienza il più possibile libera dal legacy. Bluefin vuole anche supportare gli OEM che vendono laptop e desktop Linux, quindi si impegna a funzionare con la migliore combinazione di software e hardware. Non ci preoccupiamo di documentare o aggirare cose che compromettono l'esperienza utente, quindi in alcuni casi un altro sistema operativo è la scelta giusta.

Se le tue esigenze vanno oltre questo ambito, **Bluefin potrebbe non essere la soluzione migliore per te**. Bluefin può causare disagio e squartamento [se tenuto in modo improprio](/troubleshooting/#am-i-holding-bluefin-wrong). Riconosciamo che, per realizzare un desktop migliore, molte parti della tradizionale esperienza desktop Linux non verranno con noi.

## Esperienza desktop e funzionalità

Bluefin offre un desktop GNOME ([Dona](https://www.gnome.org/donate/)) configurato dalla nostra community. È progettato per essere discreto e starsene fuori dai piedi, così puoi concentrarti sulle tue applicazioni.

Gli aggiornamenti di sistema sono basati su immagini e automatici. Le applicazioni sono logicamente separate dal sistema tramite Flatpak per le applicazioni grafiche e `brew` per le applicazioni da riga di comando.

:::tip

Bluefin è "Un'interpretazione dello spirito Ubuntu costruita sulla tecnologia Fedora" — un omaggio a un'epoca della storia di Ubuntu con cui molti appassionati dell'open source sono cresciuti, proprio come i Classici X-Men. Puntiamo a portare la stessa atmosfera qui; pensaci come un reboot. Vibrazioni tranquille.

:::

- **Layout GNOME in stile Ubuntu** con estensioni curate:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - per una dock familiare
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - per icone in stile tray nell'angolo in alto a destra
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integra il tuo dispositivo mobile con il desktop
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Dona](https://github.com/sponsors/aunetx)) - per un tocco di stile
  - [Search Light](https://github.com/icedman/search-light) - offre funzionalità di ricerca e un workflow simile a Spotlight di macOS, associato per impostazione predefinita a <kbd>Super</kbd>-<kbd>Spazio</kbd>
- **[Developer Mode](/bluefin-dx)** - tool dedicato per sviluppatori che trasforma Bluefin in una potente workstation cloud-native
- **[Terminale Ptyxis](https://devsuite.app/ptyxis/)** per workflow incentrati sui container
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Dona](https://github.com/sponsors/ranfdev)) per la gestione dei container
- **[Tailscale](https://tailscale.com)** incluso per la VPN, insieme a `wireguard-tools` e supporto systray
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Dona](https://github.com/sponsors/mjakeman)) incluso
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** con [Flathub](https://flathub.org):
  - Un'interfaccia familiare, stile software center, per installare applicazioni grafiche
  - Le applicazioni abbandonate e i runtime obsoleti non vengono elencati
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Dona](https://ko-fi.com/heliguy)) incluso per la gestione dei Flatpak
- **Funzionalità per la qualità della vita:**
  - Prompt del terminale [Starship](https://starship.rs) attivo per impostazione predefinita
  - [Solaar](https://github.com/pwr-Solaar/Solaar) per mouse Logitech insieme a `libratbagd`
  - [rclone](https://rclone.org/overview/) e [restic](https://restic.net/) per montaggi di archiviazione cloud e backup moderni dei file
  - `zsh` e `fish` inclusi come shell opzionali
  - Supporto [Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) per laptop con GPU doppie
- **Fondamenta Universal Blue**:
  - Regole udev extra per controller di gioco e altro hardware pronte all'uso
  - Tutti i codec multimediali inclusi
  - Aggiornamenti automatici scaglionati: usa il computer normalmente e spegnilo quando hai finito

## Focalizzazione "distroless"

Bluefin fornisce specificamente strumenti upstream al posto di applicazioni personalizzate. L'idea di un "app store di distribuzione" si è dimostrata insostenibile per gli autori di applicazioni desktop, quindi Bluefin fornisce strumenti come [Bazaar](https://github.com/kolunmi/bazaar) e [Homebrew](https://brew.sh). I workflow rimangono non solo indipendenti dalla distribuzione, ma anche dal sistema operativo.

:::info[È un mondo multipiattaforma]

I workflow in Bluefin sono intenzionalmente focalizzati sull'upstream -- crediamo in un'esperienza Linux coerente per tutti, sia che si tratti di WSL su Windows, Podman/Docker su un Mac o qualsiasi sistema Linux. L'[ecosistema cloud native](http://cncf.io) ha dimostrato che questo modello funziona. Ciò consente a milioni di sviluppatori esistenti di adottare un workflow che già conoscono, e permette a Linux di competere dove conta di più.

:::

## Prossimi passi

- **[Downloads](/downloads)** — scarica una ISO ufficiale di Bluefin o un torrent
- **[Runbook di installazione](/installation)** — pianificazione hardware e passaggi di configurazione
- **[Guida utente](/administration)** — amministrazione quotidiana, aggiornamenti e app
- **[Guida per sviluppatori](/bluefin-dx)** — container, devcontainer e strumenti AI

Anche il [post del blog di annuncio](https://www.ypsidanger.com/announcing-project-bluefin/) contiene alcune informazioni di background aggiuntive.

## Video introduttivi e podcast

Consulta la nostra [lista di video e recensioni](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) per maggiori informazioni.

:::tip

"L'evoluzione è un processo di costante ramificazione ed espansione."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Dinosauri rapaci"
  width="1120"
  height="630"
  loading="lazy"
/>
