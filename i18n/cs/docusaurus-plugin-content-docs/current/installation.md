---
title: Instalace
slug: /installation
---

# Instalační příručka

Abyste se připravili na úspěch, je užitečné naplánovat instalaci Bluefin po fázích; vyhnete se tak běžným nástrahám a špatně podporovaným konfiguracím. Na hardwaru přátelském k Linuxu obvykle stačí nabootovat do instalace a proklikat se doporučenými výchozími volbami instalátoru. Jistota je ale jistota — tady jsou všechny podrobnosti pro případ, že je budete potřebovat.

:::info[💙 Prosím, neposílejte své blízké na tuto stránku 💙]

Tato příručka je určena zkušeným uživatelům, kteří instalují Bluefin pro někoho jiného. Předpokládá pokročilou technickou úroveň. Nezapomeňte si [vybrat dobrý playlist](/music) pro maximální ponoření.

:::

Tato stránka je krátká [příručka (runbook)](https://www.pagerduty.com/resources/learn/what-is-a-runbook/) k procesu instalace Bluefin. Přečtěte si celou tuto dokumentaci, abyste přežili (v případě útoku raptora).

## Úrovně podpory

Bluefin je záměrně navržen tak, aby sledoval nejnovější stav vývoje Linuxu; projekt optimalizuje „zlatou cestu“, aby uživatelé měli co největší šanci na úspěch. Někdy ale prostě máte štěstí (nebo smůlu). Tato sekce je inspirována [úrovněmi podpory](https://docs.brew.sh/Support-Tiers) Homebrew. Ne všechny konfigurace jsou podporovány. Zde je stručný přehled:

### Úroveň 1 – Nejlepší zkušenost

Konfigurace úrovně 1 je považována za plně podporovanou. Tyto konfigurace mají nejvyšší úroveň pokrytí a mají přednost.

#### Požadavky

- Hardware přátelský k Linuxu (nevyžaduje externí moduly jádra)
  - Výrobci linuxových notebooků do této úrovně mohou, ale nemusí spadat.
  - „Náš hardware je plně podporován v upstreamovém linuxovém jádře“ ← dobré
  - „Podporujeme pouze Ubuntu 24.04“ ← nejspíš ne dobré
- Software zabalený pro moderní Linux (Flatpak pro desktopové aplikace, kontejnery pro vývoj atd.)

#### Co mohou uživatelé očekávat

- Nejspolehlivější a zamýšlenou zkušenost s Bluefin

**Doporučení:** Bluefin

### Úroveň 2 – Nejspíš to bude v pořádku

Konfigurace úrovně 2 není plně podporována a může obsahovat kompromisy kvůli volbě hardwaru nebo softwaru.
Většinou může fungovat, ale může vyžadovat konfiguraci po instalaci. Některé z nich fungují dobře, ale jsou zde uvedeny proto, že software dodává výrobce a tým ho nemůže ovlivnit, jako například ovladače Nvidia.

#### Požadavky

- Grafické karty NVidia v desktopech
- Někteří výrobci linuxových notebooků mohou spadat do této úrovně
  - Mohou mít dobrou podporu v jádře, ale potřebují externí modul pro řadič ventilátoru nebo jinou komponentu
- Lokálně vrstvené balíčky nebo jiné softwarové konfigurace, které dokumentace nepokrývá
- Hardware ARM/aarch64 – jádro týmu k tomuto hardwaru nemá přístup, ale generuje obrazy pro komunitu

#### Co mohou uživatelé očekávat

- Nespolehlivé aktualizace a ruční údržbu systému
  - Tým tyto konfigurace při testování obvykle nebere v úvahu.
- Při každodenním používání obvykle funguje dobře

**Doporučení:** Vyzkoušejte Bluefin a uvidíte, jak poběží. Někteří lidé si vytvářejí vlastní obrazy, může být potřeba pátrání.

### Úroveň 3 – Kdo ví?

Úroveň 3 je převážně nepodporovaná – může fungovat perfektně, nebo to může být katastrofa.

#### Požadavky

- Známý problematický hardware (notebooky Asus a Apple). Pro Intel Macy z let 2018–2020 s bezpečnostním čipem T2 viz komunitní [Instalační příručku pro T2 Mac](/t2-mac).
- Notebooky se dvěma GPU s hardwarem Nvidia
- Staromódní formáty balíčků typu „hodně štěstí!“
  - Soubory .run, tarbally a AppImage
  - Cokoli, kde software vyžaduje DKMS
- Exotický hardware obecně – v některých případech může instalace úrovně 3 sloužit jako důvod ke chlubení.

#### Co mohou uživatelé očekávat

- Nespolehlivé aktualizace a ruční údržbu systému
  - Tým tyto konfigurace při testování obvykle nebere v úvahu.
- „Vratkou podporu“ – bezdrátové připojení občas může, ale nemusí fungovat, problémy s uspáním/probuzením atd.

**Doporučení:** Ubuntu nebo vlastní obraz.

## Systémové požadavky

Před instalací Bluefin zvažte následující:

- K vytvoření instalačního média použijte [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_fedora_media_writer). Jiné způsoby vytvoření nemusí fungovat správně
  - Použití Ventoy **není podporováno**
- Starší systémy založené na BIOSu **nejsou podporovány**; podporovány jsou pouze systémy UEFI
- Dual boot ze stejného disku **není podporován**; pro jiný operační systém použijte samostatný disk a k výběru OS pro spuštění použijte BIOS
  - Bluefin podporuje [instalaci na externí disk](#alternative-bluefin-to-go-external-drive), pokud si ho chcete vyzkoušet přímo na hardwaru, než se zavážete
- Během instalace **důrazně doporučujeme** automatické rozdělení disku; ruční rozdělení není nutné, pokud nemáte systém s více disky
- Standardní instalace Bluefin zabírá ~12,4 GB (~17,4 GB se zapnutým vývojářským režimem)

### Rychlý přehled

| Komponenta   | Minimum                                    | Doporučeno                                                   |
| ------------ | ------------------------------------------ | ------------------------------------------------------------ |
| **CPU**      | 64bitové x86_64                            | Tolik, kolik si můžete dovolit                               |
| **RAM**      | 16 GB                                      | 32 GB+ / Tolik, kolik si můžete dovolit, pokud používáte ZFS |
| **Úložiště** | 128 GB (pouze SSD, HDD jsou příliš pomalé) | Tolik, kolik si můžete dovolit                               |
| **Grafika**  | Jakákoli moderní GPU Intel/AMD             | Jakákoli moderní GPU kromě Nvidia Maxwell a starších         |
| **Boot**     | UEFI (BIOS není podporován)                | UEFI se Secure Boot                                          |

### Využití disku

Takto velké místo na disku zabírá každý obraz Bluefin ve výchozím stavu, včetně flatpakových aplikací (které lze odebrat):

#### Bluefin

~12,4 GB / ~17,4 GB se zapnutým vývojářským režimem

### Proč minimálně 16 GB RAM?

Bluefin obsahuje rozsáhlou sadu nástrojů pro cloud native vývoj. Tyto úlohy se obvykle škálují tak, aby replikovaly celé clustery počítačů, a vyžadují více prostředků než běžné úlohy.

_Tyto požadavky zajišťují hladký chod integrovaného vývojového workflow a architektury Bluefin postavené na kontejnerech._

## Alternativa: Bluefin to Go (externí disk) {#alternative-bluefin-to-go-external-drive}

Bluefin můžete nainstalovat na externí disk a získat tak přenosnou instalaci Bluefin:

![bluefin-drive](/img/user-attachments/f3ea0252-b0ba-4c68-8566-68cfbdbfc6b2.png)

**Nezapomeňte během instalace zvolit šifrování celého disku!**

Případy použití:

- Skvělý způsob, jak vyzkoušet Linux; pokud se vám zalíbí, přesuňte disk do hlavního počítače bez nutnosti přeinstalace.
- Nebo si kupte nový disk do PC a svůj stávající OS dejte do externího boxu jako zálohu.
- Dočasné přepoužití stroje nebo vyzkoušení hardwaru před koupí.
- Sdílení PC bez hádek o Linux.
- Homelab a přenosná vývojová prostředí.
- Přidání disku s Bluefin DX do handheldu [s Bazzite](https://bazzite.gg) připojeného k dokovací stanici.

### Windows to Go

Můžete to udělat i obráceně: pomocí [Rufus](https://rufus.ie) nainstalujte Windows na externí disk v režimu [Windows to Go](https://en.wikipedia.org/wiki/Windows_To_Go) pro aktualizace firmwaru nebo vzácný software dostupný jen pro Windows.

## Den 0: Plánování

Většině problémů lze předejít plánováním předem. Pojem „Den“ je abstraktní — prosím, neinstalujte Bluefin po dobu tří dnů. Instalace by obvykle měla trvat asi dvacet minut.

### Všichni uživatelé

- Je váš hardware přátelský k Linuxu?
  - Chápete omezení spojená s GPU Nvidia (pokud se vás týkají)?
    - Notebooky s Nvidia Optimus bývají obzvlášť problematické
  - Vyžaduje hardware modul jádra mimo strom jádra (out-of-tree)? To může vést k dlouhodobým problémům s údržbou
  - Vyžaduje software, který používáte, modul jádra mimo strom jádra?
    - VirtualBox a VMware nejsou podporovány
    - Nvidia, podpora ovladače Xbox One, ovladače wl a v4l2loopback jsou podporovány (jde o „best effort“; v některých případech nemůžeme ovlivnit software třetích stran, který se s novějšími verzemi linuxového jádra rozbije)
    - [openzfs](https://github.com/openzfs/zfs) je součástí hned po instalaci. Správci jej pravidelně používají a zatím nezaostal za jádry, která Bluefin dodává. Přesto to nemůžeme zaručit, protože jde o modul jádra mimo strom jádra
  - Je vaše bezdrátová karta podporována Linuxem?
    - Mezi špatně podporované karty patří Broadcom
    - Pokud si nejste jisti, podívejte se na [USB-Wifi](https://github.com/morrownr/USB-WiFi)
  - Je vaše tiskárna/skener v Linuxu dobře podporována?
    - [Tiskárny bez ovladačů](https://openprinting.github.io/printers/) důrazně doporučujeme; nemůžeme zaručit, že bude fungovat každá tiskárna
    - [Podpora skenerů](http://www.sane-project.org/sane-mfgs.html)
- Je BIOS/UEFI zařízení aktuální?
- Doporučujeme mít před instalací dokončené a aktuální všechny aktualizace firmwaru hardwaru
- Jsou aplikace, na kterých závisíte, dobře podporovány na Flathubu?
- Poskytuje váš poskytovatel VPN konfiguraci WireGuard pro import do Network Manageru?
- Máte připravený samostatný disk?
  - Bluefin nepodporuje dual boot ze stejného disku
  - Bluefin nepodporuje rebase z existující instalace Fedory
- Pamatujte, že jde o vlastní obraz založený na Fedoře; ve srovnání s něčím jako Ubuntu LTS se vyvíjí svižným tempem
- Přečtěte si celou tuto dokumentaci; zde je související upstreamová dokumentace:
  - [Homebrew](https://docs.brew.sh/) ([Přispějte](https://github.com/Homebrew/brew#donations))
  - [Flathub](https://docs.flathub.org/)
  - [bootc](https://bootc.dev/bootc/)

### Vývojáři

- Víte, [jak používat kontejnery](https://docker-curriculum.com/#introduction) pro vývoj?
- Víte, jak spravovat [jednotky služeb systemd](https://systemd.io/) pro systém i uživatelské účty?

## Den 1: Nasazení a konfigurace

### Nasazení

:::info[Stáhněte si Bluefin]

Stáhněte si správné ISO z [webu](https://projectbluefin.io/#scene-picker)

:::

- Nainstalujte operační systém
  - Použijte celý disk s automatickým rozdělením
  - (Volitelné): [Nastavte Secure Boot](#secure-boot)
  - (Volitelné): `ujust rebase-helper` pro přechod na `:stable` nebo `:testing`
- Nastavte, otestujte a **ověřte zálohy** – obraz systému jsou sice reprodukovatelná data, ale vaše uživatelská data v domovské složce je stále potřeba zálohovat. Bluefin obsahuje dva zálohovací nástroje podle vašich preferencí. Jsou nainstalovány jako Flatpaky, takže ten, který nepoužíváte, můžete odebrat. Pokud dáváte přednost nástrojům příkazové řádky, jsou předinstalovány také `rclone` ([Přispějte](https://github.com/sponsors/rclone)) a `restic` ([Přispějte](https://github.com/sponsors/restic))
  - [Deja Dup](https://apps.gnome.org/DejaDup/) ([Přispějte](https://liberapay.com/DejaDup))
  - [Pika Backup](https://apps.gnome.org/PikaBackup/) ([Přispějte](https://opencollective.com/pika-backup))
  - Ujistěte se, že vaše zálohy fungují, _než_ přejdete ke konfiguraci

### Konfigurace

Zbývající kroky jsou uživatelsky specifická konfigurace, kterou obvykle necháváme na vás. Pro automatizaci tohoto kroku se hodí nástroje jako [chezmoi](https://www.chezmoi.io/) pro konfiguraci a synchronizaci dotfiles: `brew install chezmoi`

Protože celý uživatelský prostor je ve vaší domovské složce, jakýkoli nástroj, který k automatizaci tohoto kroku použijete, by měl fungovat podle očekávání. V ideálním případě je konfigurace, kterou jste dříve možná dělali na úrovni systému, nyní nastavena na úrovni uživatele, což vede k čistému oddělení uživatelské konfigurace a obrazu systému.

- Instalace softwaru
  - K instalaci aplikací použijte obchod Bazaar
  - (Volitelné): Nainstalujte aplikace příkazové řádky přes `brew`
- Konfigurace po instalaci
  - Vyberte/změňte výchozí aplikace podle svého uvážení
  - (Volitelné) Importujte svou [konfiguraci WireGuard přes `wg-quick`](https://blogs.gnome.org/thaller/2019/03/15/wireguard-in-networkmanager/) nebo použijte konfiguraci VPN v grafickém rozhraní Network Manageru
- (Volitelné) Konfigurace pro vývojáře
  - `ujust devmode` a postupujte podle pokynů
  - Spusťte VSCode a nastavte si předvolby a rozšíření

## Den 2: Provoz a údržba

Bluefin se snaží udělat údržbu co nejjednodušší, přesto lze mnoho automatizovaných úloh spustit ručně.

- Spusťte aktualizaci systému přes položku v nabídce nebo `ujust update`, sledujte aktualizaci a restartujte
  - `ujust changelogs` zobrazí nadcházející změny a aktualizace z Fedory
  - `ujust bios` restartuje stroj a přejde do nabídky BIOS/UEFI. To se hodí pro spuštění z disku s Windows
- Přihlaste se k odběru [blogu](/blog)
- Seznamte se s [postupy pro rebase a rollback](/administration#switching-between-streams)
- Ke správě životního cyklu Flatpaků použijte [aplikaci Warehouse](https://github.com/flattool/warehouse):
  - Připnutí ke starší verzi nebo návrat zpět
  - Snadné hromadné odebrání aplikací
- `ujust clean-system` pro úklid starých kontejnerů a nepoužívaných běhových prostředí Flatpaku

A ještě jedna rada: čím víc investujete do dne 0, tím hladší bude váš den 1, a díky tomu bude den 2 ještě hladší. Potom už jde jen o chlubení. Příkaz `fastfetch` ([Přispějte](https://github.com/sponsors/LinusDierheimer)) vám bude váš milník připomínat:

![image](/img/user-attachments/e1b77128-6aaf-4a95-a9fc-cb1409a176fc.png)

## Secure Boot

Secure Boot je ve výchozím stavu podporován a poskytuje další vrstvu zabezpečení.

Universal Blue podporuje Secure Boot s [naším vlastním klíčem](https://github.com/ublue-os/akmods/raw/main/certs/public_key.der).

Po dokončení instalace budete při prvním spuštění vyzváni k registraci klíče pro Secure Boot pomocí [rozhraní UEFI nabídky mokutil](https://docs.fedoraproject.org/en-US/quick-docs/mok-enrollment/#_enrolling_self_signing_key_after_reboot) (vstup a navigace pomocí klávesnice _QWERTY_).

Vyberte **Enroll MOK** a jako heslo zadejte `universalblue`.

Pokud tento krok během prvotního nastavení nedokončíte, můžete klíč zaregistrovat ručně spuštěním následujícího příkazu v terminálu:

```sh
ujust enroll-secure-boot-key
```

Pokud chcete tento klíč zaregistrovat ještě před instalací nebo rebase, stáhněte si klíč a spusťte následující:

```sh
sudo mokutil --timeout -1
sudo mokutil --import path/to/public_key.der
```

Pomocí `mokutil --list-enrolled` můžete ověřit, že je uveden klíč „ublue kernel“:

![image](/img/user-attachments/259a9bb2-2198-4744-924d-df457e26c7f4.png)

:::note
Pokud vidíte uvedený `ublue akmods`, jde o dřívější klíč, který bude brzy odstraněn. Aktuálním klíčem je `ublue kernel`.
:::

Uživatelé Lenovo ThinkPad (řady P, T, X): Před zapnutím Secure Boot přejděte do BIOSu (F1) → Security → Secure Boot a zapněte „Allow Microsoft 3rd party UEFI CA“. Toto nastavení je nutné, aby firmware rozpoznal podepsaný zavaděč shim Fedory. Bez něj Secure Boot selže s chybou narušení (violation).
