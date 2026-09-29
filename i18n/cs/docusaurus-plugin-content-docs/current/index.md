---
title: Vítejte v Bluefin
slug: /
pagination_next: downloads
---

# Vítejte v Bluefin

Pro koncové uživatele je to systém tak spolehlivý jako Chromebook s minimální údržbou, zatímco vývojářům poskytuje výkonný [vývojový režim založený na cloud nativu](/bluefin-dx). Postaveno na technologii následující generace pro lidi, kteří potřebují, aby jim jejich stroje udělaly práci.

![Bluefin desktop screenshot](/img/bluefin-hero.webp)

## Je Bluefin to pravé pro vás?

Bluefin je linuxová pracovní stanice následující generace, která směřuje k postupnému vylepšování. Co nejrychleji a co nejrazantněji se odstaváme od starých technologií, abychom poskytli co nejlepší zkušenost.

:::tip

Někteří by mohli mít tendenci tvrdit, že Bluefin nejlépe poslouží vývojářům nebo zkušeným linuxovým uživatelům, já však argumentuju, že je stejně silním kandidátem i pro nové uživatele — a to kvůli jeho spolehlivosti a tomu, jak dobře je přednastavený už z krabice.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin je:

- **Flatpak jako první** - Aplikační model v Bluefin se točí kolem izolovaných aplikací, které se udržují na Flathubu. Aplikace, které dobře nepracují s moderními komponentami, jako jsou Wayland, Pipewire, Flatpak Portals atd., mohou poskytovat špatnou zkušenost a nedoporučují se.
- **Záměrně neviditelný** - Bluefin není distribuce. Váš vztah je s Flathubem, Homebrewem a cokoliv, co umístíte do svých kontejnerů.
- **Optimalizovaný pro 96 %** - Ne pro 4 % — Bluefin přistupuje k funkcím přístupem "silnější společně". Vždy můžete dělat, co chcete, ale hodnota přichází ze sdílení osvědčených praktik. Nemáme čas zbytečně plytvát na okrajové případy.
- **Osvědčený vývojový model** - Vývojářská zkušenost se točí kolem kontejnerů a seznamí nové linuxové uživatele s [nástroji používanými v cloud nativu](https://www.cncf.io/). Více informací najdete na stránkách [Vize](/mission) a [Hodnoty](/values).
  - **Záměrně zaměřený na skvělý hardware** - Bluefin nejlépe běží na hardware přátelský k Linuxu, aby uživatelům poskytl co nejvíce zkušenosti bez dědictví starých systémů. Bluefin také chce podporovat OEM, kteří prodávají linuxové laptopy a stolní počítače, a tak se snaží běžit s nejlepší kombinací softwaru a hardwaru. Nesnažíme se zvlášť dokumentovat ani obcházet věci, které kompromitují uživatelskou zkušenost, takže v některých případech je správná volba jiný operační systém.

Pokud vaše požadavky vycházejí za rámec tohoto rozsahu, tak **Bluefin možná není to pravé pro vás**. Bluefin může způsobit nepohodlí a zranění, [když je držán špatně](/troubleshooting/#am-i-holding-bluefin-wrong). Přiznáváme si, že pro vytvoření lepší pracovní stanice mnoho částí tradiční linuxové zkušenosti s námi nepůjde.

## Desktopové prostředí a funkce

Bluefin nabízí desktop GNOME ([Přispět](https://www.gnome.org/donate/)) nastavený komunitou. Je navržen tak, aby vás nechal na pokoji a nechal vás soustředit se na vaše aplikace.

Systémové aktualizace jsou založené na obrazech a automatické. Aplikace jsou logicky oddělené od systému pomocí Flatpaků pro grafické aplikace a `brew` pro příkazové aplikace.

:::tip

Bluefin je "interpretace duše Ubuntu postavená na technologii Fedory" — odkaz na éru historie Ubuntu, na které mnoho nadšenců open source vyrůstalo, podobně jako na Classic X-Men. Cílíme přinést stejnou atmosféru sem; myslete na nás jako na reboot. Pohodová nálada.

:::

- **Ubuntu-like rozložení GNOME** integrující rozšíření vybíraná kurátorem:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - pro známý dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator/) - pro ikony podobné trayi v pravém horním rohu
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integrujte mobilní zařízení s vaší pracovní stanicí
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Přispět](https://github.com/sponsors/aunetx)) - pro tenhle šmrnc
  - [Search Light](https://github.com/icedman/search-light) - poskytuje vyhledávací funkcionalitu a workflow podobné macOS Spotlightu vázané na <kbd>Super</kbd>-<kbd>Space</kbd> ve výchozím nastavení
- **[Vývojový režim](/bluefin-dx)** - specializovaný vývojářský nástroj, který mění Bluefin ve výkonnou cloud-native pracovní stanici
- **[Ptyxis terminál](https://devsuite.app/ptyxis/)** pro workflow zaměřené na kontejnery
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Přispět](https://github.com/sponsors/ranfdev)) pro správu kontejnerů
- **[Tailscale](https://tailscale.com)** zahrnuté pro VPN spolu s `wireguard-tools` a podporou pro systray
- **[Správce rozšíření GNOME](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Přispět](https://github.com/sponsors/mjakeman)) zahrnuté
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** s [Flathubem](https://flathub.org):
  - Známé rozhraní pro instalaci grafických aplikací
  - Zanechané aplikace a zastaralé runtime jsou nevyhledávané
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Přispět](https://ko-fi.com/heliguy)) zahrnuté pro správu Flatpaků
- **Funkce zlepšující kvalitu života**:
  - [Starship](https://starship.rs) příkazový řádek povolený ve výchozím nastavení
  - [Solaar](https://github.com/pwr-Solaar/Solaar) pro myši Logitech spolu s `libratbagd`
  - [rclone](https://rclone.org/overview/) a [restic](https://restic.net/) pro montáž cloud úložišť a moderní zálohy souborů
  - `zsh` a `fish` zahrnuté jako volitelné shelly
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) pro laptopy s dvojitými GPU
- **Universal Blue foundation**:
  - Extra udev pravidla pro herní ovladače a jiný hardware už z krabice
  - Všechny multimediální kodeky zahrnuté
  - Pozvolané automatické aktualizace: použíjte počítač normálně a vypň ho, až budete hotovi

## Zaměření na distribuce bez aplikací

Bluefin dodává konkrétně nástroje z upstreamu místo vlastních aplikací. Nápad na „distribuční obchod s aplikacemi" se pro autory desktopových aplikací ukázal být neudržitelný, takže Bluefin místo toho dodává nástroje jako [Bazaar](https://github.com/kolunmi/bazaar) a [Homebrew](https://brew.sh). Pracovní toky tak zůstávají nezávislé pouze na distribuci, ale i na operačním systému.

:::info[Je to multiplatformní svět]

Pracovní toky v Bluefin záměrně směřují k upstreamu — věříme ve konzistentní linuxovou zkušenost pro každého, ať už jde o WSL na Windows, Podman/Docker na Macu nebo jakýkoliv linuxový systém. [Cloud nativní ekosystém](http://cncf.io) dokázal, že tento model funguje. To umožňuje milionům stávajících vývojářů nastoupit na pracovní tok, který už znají, a umožňuje Linuxu soupeřit tam, kde je to nejvíce důležité.

:::

## Další kroky

- **[Ke stažení](/downloads)** — stáhněte si oficiální ISO nebo torrent Bluefin
- **[Instalační průvodce](/installation)** — plánování hardwaru a kroky nastavení
- **[Uživatelský průvodce](/administration)** — každodenní správa, aktualizace a aplikace
- **[Vývojářský průvodce](/bluefin-dx)** — kontejnery, devcontainer a nástroje pro AI

Na [oznamovací blogový příspěvek](https://www.ypsidanger.com/announcing-project-bluefin/) jsou také pár dalších kontextových informací.

## Úvodní videa a podcasty

Pro více informací si prohlédněte náš [seznam videí a recenzí](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts).

:::tip

"Evoluce je proces neustálého větvění a rozšíření."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
