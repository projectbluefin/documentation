---
title: Installazione
slug: /installation
---

# Guida operativa all'installazione {#installation-runbook}

Per partire con il piede giusto, è utile pianificare l'installazione di Bluefin in fasi, così da evitare gli errori più comuni e le configurazioni poco supportate. Su hardware compatibile con Linux, di solito basta avviare l'installazione e seguire le impostazioni predefinite consigliate. Ma la prudenza non è mai troppa: ecco tutti i dettagli, nel caso servissero.

:::info[💙 Non indirizzare i tuoi cari a questa pagina 💙]

Questa guida operativa è rivolta a utenti esperti che installano Bluefin per qualcun altro. Richiede competenze tecniche avanzate. Non dimenticare di [scegliere una buona playlist](/music) per immergerti al meglio nell'esperienza.

:::

Questa pagina è una breve [guida operativa](https://www.pagerduty.com/resources/learn/what-is-a-runbook/) per l'installazione di Bluefin. Leggi tutta la documentazione per assicurarti di sopravvivere (in caso di attacco di un raptor).

## Livelli di supporto {#support-tiers}

Bluefin è progettato appositamente per seguire lo stato dell'arte dello sviluppo Linux: il progetto ottimizza un percorso consigliato per offrire agli utenti le migliori possibilità di successo. A volte, però, è solo questione di fortuna (o sfortuna). Questa sezione si ispira ai [livelli di supporto](https://docs.brew.sh/Support-Tiers) di Homebrew. Non tutte le configurazioni sono supportate. Ecco una guida rapida:

### Livello 1 - L'esperienza migliore {#tier-1---the-best-experience}

Una configurazione di livello 1 è considerata pienamente supportata. Queste configurazioni ricevono la maggiore copertura e hanno la priorità.

#### Requisiti {#requirements}

- Hardware compatibile con Linux (senza necessità di moduli del kernel esterni)
  - I produttori di portatili Linux possono rientrare o meno in questo livello.
  - "Il nostro hardware è pienamente supportato dal kernel Linux upstream" ← bene
  - "Supportiamo solo Ubuntu 24.04" ← probabilmente non bene
- Software distribuito per sistemi Linux moderni (Flatpak per le applicazioni desktop, container per lo sviluppo, ecc.)

#### Cosa aspettarsi {#users-can-expect}

- L'esperienza Bluefin più affidabile e conforme a quella prevista

**Consiglio:** Bluefin

### Livello 2 - Probabilmente andrà bene {#tier-2---youre-probably-ok}

Una configurazione di livello 2 non è pienamente supportata e può comportare compromessi dovuti alle scelte hardware o software.
Può funzionare per la maggior parte degli usi, ma potrebbe richiedere una configurazione dopo l'installazione. Alcune di queste configurazioni funzionano bene, ma rientrano qui perché il software è fornito dal produttore e non è sotto il controllo del team, come nel caso dei driver Nvidia.

#### Requisiti {#requirements-1}

- GPU NVidia su computer desktop
- Alcuni produttori di portatili Linux possono rientrare in questo livello
  - Il supporto nel kernel potrebbe essere buono, ma potrebbe servire un modulo esterno per il controllo delle ventole o un altro componente
- Pacchetti aggiunti localmente tramite layering o altre configurazioni software non trattate nella documentazione
- Hardware ARM/aarch64 - il team principale non ha accesso a questo hardware, ma genera immagini per la community

#### Cosa aspettarsi {#users-can-expect-1}

- Aggiornamenti poco affidabili e manutenzione manuale del sistema
  - In genere il team non tiene conto di queste configurazioni durante i test.
- Un funzionamento generalmente buono nell'uso quotidiano

**Consiglio:** Prova Bluefin e vedi come funziona. Alcune persone creano immagini personalizzate; potrebbe essere necessario approfondire.

### Livello 3 - Chi lo sa? {#tier-3---who-knows}

Il livello 3 è per lo più privo di supporto: potrebbe funzionare perfettamente o essere un disastro.

#### Requisiti {#requirements-2}

- Hardware con problemi noti (portatili Asus e Apple). Per i Mac Intel del 2018–2020 con chip di sicurezza T2, consulta la [guida della community all'installazione sui Mac T2](/t2-mac).
- Portatili con doppia GPU e hardware Nvidia
- Formati di distribuzione vecchio stile, del tipo "buona fortuna!"
  - File .run, archivi tar e Appimage
  - Qualsiasi software che richieda DKMS
- Hardware insolito in generale: in alcuni casi un'installazione di livello 3 può diventare motivo di vanto.

#### Cosa aspettarsi {#users-can-expect-2}

- Aggiornamenti poco affidabili e manutenzione manuale del sistema
  - In genere il team non tiene conto di queste configurazioni durante i test.
- Supporto instabile: la rete wireless potrebbe funzionare a intermittenza, potrebbero esserci problemi di sospensione e ripresa, ecc.

**Consiglio:** Ubuntu o un'immagine personalizzata.

## Requisiti di sistema {#system-requirements}

Valuta i seguenti aspetti prima di installare Bluefin:

- Usa [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer) per creare il supporto di installazione. Altri metodi potrebbero non funzionare correttamente
  - L'uso di Ventoy **non è supportato**
- I sistemi meno recenti basati su BIOS **non sono supportati**; sono supportati solo i sistemi UEFI
- Il dual boot dallo stesso disco **non è supportato**; usa un'unità dedicata per un altro sistema operativo e il BIOS per scegliere quale sistema avviare
  - Bluefin supporta l'[installazione su un'unità esterna](#alternative-bluefin-to-go-external-drive) se vuoi provarlo su hardware reale prima di decidere
- **Consigliamo vivamente** il partizionamento automatico durante l'installazione; quello manuale non è necessario, a meno che il sistema non abbia più dischi
- Un'installazione standard di Bluefin occupa circa 12,4 GB (circa 17,4 GB con la modalità sviluppatore abilitata)

### Riferimento rapido {#quick-reference}

| Componente        | Minimo                                       | Consigliato                                                |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------- |
| **CPU**           | x86_64 a 64 bit                              | Il massimo consentito dal tuo budget                       |
| **RAM**           | 16 GB                                        | 32 GB+ / Il massimo consentito dal tuo budget se usi ZFS   |
| **Archiviazione** | 128 GB (solo SSD, gli HDD sono troppo lenti) | Il massimo consentito dal tuo budget                       |
| **Grafica**       | Qualsiasi GPU Intel/AMD moderna              | Qualsiasi GPU moderna, escluse Nvidia Maxwell e precedenti |
| **Avvio**         | UEFI (BIOS non supportato)                   | UEFI con Secure Boot                                       |

### Spazio su disco {#disk-usage}

Ecco quanto spazio su disco occupa ogni immagine di Bluefin per impostazione predefinita, incluse le applicazioni Flatpak (che possono essere rimosse):

#### Bluefin {#bluefin}

Circa 12,4 GB / circa 17,4 GB con la modalità sviluppatore abilitata

### Perché almeno 16 GB di RAM? {#why-16-gb-ram-minimum}

Bluefin include un ampio insieme di strumenti per lo sviluppo cloud-native. Questi carichi di lavoro in genere si espandono fino a replicare interi cluster di computer e richiedono più risorse rispetto ai carichi di lavoro comuni.

_Questi requisiti garantiscono il buon funzionamento del flusso di sviluppo integrato di Bluefin e della sua architettura incentrata sui container._

## Alternativa: Bluefin to Go (unità esterna) {#alternative-bluefin-to-go-external-drive}

Puoi installare Bluefin su un'unità esterna per ottenere un'installazione portatile:

![Unità Bluefin](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**Non dimenticare di selezionare la cifratura dell'intero disco durante l'installazione!**

Casi d'uso:

- Un ottimo modo per provare Linux; se ti piace, sposta l'unità nel tuo computer principale senza dover reinstallare.
- Oppure acquista una nuova unità per il PC e metti quella con il sistema operativo attuale in un contenitore esterno come backup.
- Riutilizzare temporaneamente un computer o provare dell'hardware prima di acquistarlo.
- Condividere un PC senza discutere di Linux.
- Laboratori domestici e ambienti di sviluppo portatili.
- Aggiungere un'unità Bluefin DX a un dispositivo portatile [con Bazzite](https://bazzite.gg) collegato a una dock.

### Windows to Go {#windows-to-go}

Puoi anche fare il contrario: usare [Rufus](https://rufus.ie) per installare Windows su un'unità esterna in modalità [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go), per aggiornare il firmware o usare qualche raro software disponibile solo per Windows.

## Giorno 0: Pianificazione {#day-0-planning}

La maggior parte dei problemi può essere affrontata direttamente pianificando in anticipo. Il termine "giorno" è astratto: non impiegare tre giorni per installare Bluefin. Di solito un'installazione dovrebbe richiedere circa venti minuti.

### Tutti gli utenti {#all-users}

- Il tuo hardware è compatibile con Linux?
  - Conosci i limiti di una GPU Nvidia (se ne hai una)?
    - I portatili Nvidia Optimus tendono a essere particolarmente problematici
  - L'hardware richiede un modulo esterno all'albero del kernel? Questo può causare problemi di manutenzione a lungo termine
  - Il software che usi richiede un modulo esterno all'albero del kernel?
    - VirtualBox e VMware non sono supportati
    - Nvidia, il supporto per il controller Xbox One, i driver wl e v4l2loopback sono supportati (nei limiti del possibile; in alcuni casi non possiamo controllare il software di terze parti che smette di funzionare con le nuove versioni del kernel Linux)
    - [openzfs](https://github.com/openzfs/zfs) è incluso. Viene usato regolarmente dai manutentori e finora ha tenuto il passo con i kernel forniti da Bluefin. Non possiamo però garantirlo, perché è un modulo esterno all'albero del kernel
  - La tua scheda wireless è supportata da Linux?
    - Tra le schede poco supportate ci sono quelle Broadcom
    - Consulta [USB-Wifi](https://github.com/morrownr/USB-WiFi) se hai dubbi
  - La tua stampante o il tuo scanner sono ben supportati su Linux?
    - Le [stampanti senza driver](https://openprinting.github.io/printers/) sono vivamente consigliate; non possiamo garantire che ogni stampante funzioni
    - [Supporto per gli scanner](http://www.sane-project.org/sane-mfgs.html)
- Il BIOS/UEFI del dispositivo è aggiornato?
- Consigliamo di completare tutti gli aggiornamenti del firmware dell'hardware prima dell'installazione
- Le applicazioni da cui dipendi sono ben supportate su Flathub?
- Il tuo fornitore VPN mette a disposizione una configurazione wireguard da importare in Network Manager?
- Hai un disco dedicato pronto all'uso?
  - Bluefin non supporta il dual boot dallo stesso disco
  - Bluefin non supporta il rebase da un'installazione preesistente di Fedora
- Ricorda che questa è un'immagine personalizzata basata su Fedora: evolve rapidamente rispetto a sistemi come Ubuntu LTS
- Leggi tutta questa documentazione; ecco alcuni riferimenti alla documentazione upstream:
  - [Homebrew](https://docs.brew.sh/) ([Dona](https://github.com/Homebrew/brew#donations))
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### Sviluppatori {#developers}

- Sai [usare i container](https://docker-curriculum.com/#introduction) per lo sviluppo?
- Sai gestire le [unità di servizio systemd](https://systemd.io/) sia per il sistema sia per gli account utente?

## Giorno 1: Installazione e configurazione {#day-1-deployment-and-configuration}

### Installazione {#deployment}

:::info[Scarica Bluefin]

Scarica la ISO adatta dal [sito web](https://projectbluefin.io/#scene-picker)

:::

- Installa il sistema operativo
  - Usa l'intero disco con il partizionamento automatico
  - (Facoltativo): [Configura Secure Boot](#secure-boot)
  - (Facoltativo): `ujust rebase-helper` per passare a `:stable` o `:testing`
- Configura, prova e **verifica i backup** - L'immagine di sistema è composta da dati riproducibili, ma devi comunque eseguire il backup dei tuoi dati nella cartella home. Bluefin include due strumenti di backup tra cui scegliere. Sono installati come Flatpak, quindi puoi rimuovere quello che non usi. Se preferisci gli strumenti da riga di comando, sono preinstallati anche `rclone` ([Dona](https://github.com/sponsors/rclone)) e `restic` ([Dona](https://github.com/sponsors/restic))
  - [Deja Dup](https://apps.gnome.org/DejaDup/) ([Dona](https://liberapay.com/DejaDup))
  - [Pika Backup](https://apps.gnome.org/PikaBackup/) ([Dona](https://opencollective.com/pika-backup))
  - Assicurati che i backup funzionino _prima_ di passare alla configurazione

### Configurazione {#configuration}

I passaggi rimanenti riguardano la configurazione personale dell'utente, che in genere lasciamo a te. Per automatizzarla puoi usare strumenti come [chezmoi](https://www.chezmoi.io/), che gestisce e sincronizza i dotfile: `brew install chezmoi`

Poiché lo spazio utente si trova interamente nella tua directory home, qualsiasi strumento usato per automatizzare questo passaggio dovrebbe funzionare come previsto. Idealmente, le impostazioni che in passato configuravi a livello di sistema ora vengono gestite a livello utente, separando nettamente la configurazione dell'utente dall'immagine di sistema.

- Installazione del software
  - Usa lo store Bazaar per installare le applicazioni
  - (Facoltativo): Installa le applicazioni da riga di comando tramite `brew`
- Configurazione dopo l'installazione
  - Scegli o modifica le applicazioni predefinite come preferisci
  - (Facoltativo) Importa la tua [configurazione wireguard tramite `wg-quick`](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) oppure usa la configurazione VPN nell'interfaccia grafica del gestore di rete
- (Facoltativo) Configurazione per sviluppatori
  - `ujust devmode` e segui le istruzioni
  - Avvia VSCode e configura le impostazioni e le estensioni

## Giorno 2: Uso e manutenzione {#day-2-operations-and-maintenance}

Bluefin cerca di rendere la manutenzione il più semplice possibile; molte delle attività automatiche possono comunque essere eseguite manualmente.

- Esegui un aggiornamento del sistema tramite l'opzione nel menu o `ujust update` per osservare un aggiornamento e riavviare
  - `ujust changelogs` mostra le modifiche in arrivo e gli aggiornamenti provenienti da Fedora
  - `ujust bios` riavvia il computer e apre il menu BIOS/UEFI. È utile per avviare un'unità Windows
- Iscriviti al [blog](/blog)
- Familiarizza con le [procedure di rebase e rollback](/administration#switching-between-streams)
- Usa l'[applicazione Warehouse](https://github.com/flattool/warehouse) per gestire il ciclo di vita dei Flatpak:
  - Blocca un'applicazione a una versione precedente o esegui un rollback
  - Rimuovi facilmente più applicazioni in una volta
- `ujust clean-system` per eliminare i vecchi container e i runtime Flatpak inutilizzati

Un ultimo consiglio: più investi nel giorno 0, più semplice sarà il giorno 1 e, di conseguenza, ancora più semplice il giorno 2. Dopo, potrai vantartene. Il comando `fastfetch` ([Dona](https://github.com/sponsors/LinusDierheimer)) sarà lì a ricordarti il traguardo raggiunto:

![Schermata di fastfetch](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot {#secure-boot}

Secure Boot è supportato per impostazione predefinita e offre un ulteriore livello di sicurezza.

Universal Blue supporta Secure Boot con [la nostra chiave personalizzata](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der).

Al primo avvio dopo l'installazione, ti verrà chiesto di registrare la chiave di Secure Boot tramite il [menu UEFI di mokutil](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot) (inserimento e navigazione con tastiera _QWERTY_).

Seleziona **Enroll MOK** e inserisci `universalblue` come password.

Se non completi questo passaggio durante la configurazione iniziale, puoi registrare manualmente la chiave eseguendo il seguente comando nel terminale:

```sh
ujust enroll-secure-boot-key
```

Se vuoi registrare la chiave prima dell'installazione o del rebase, scaricala ed esegui:

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

Puoi usare `mokutil --list-enrolled` per verificare che la chiave "ublue kernel" sia presente nell'elenco:

![Elenco delle chiavi registrate](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
Se vedi `ublue akmods` nell'elenco, è una vecchia chiave che verrà rimossa a breve. `ublue kernel` è la chiave attuale.
:::

Utenti Lenovo ThinkPad (serie P, T, X): prima di abilitare Secure Boot, apri il BIOS (F1) → Security → Secure Boot e abilita "Allow Microsoft 3rd party UEFI CA". Questa impostazione è necessaria affinché il firmware riconosca il bootloader shim firmato di Fedora. Senza di essa, Secure Boot non funzionerà e segnalerà un errore di violazione.
