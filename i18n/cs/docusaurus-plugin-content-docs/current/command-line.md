---
title: Aplikace a příkazová řádka
slug: /command-line
---

import GnomeExtensions from "@site/src/components/GnomeExtensions";
import styles from "@site/src/components/ExtensionsGrid.module.css";

Bluefin je navržen pro běžné lidi, ale příkazová řádka je naše _**vášeň**_. Proto investujeme jak do grafického prostředí, tak do práce v terminálu. Slay out.

## Grafické aplikace

Bluefin u desktopového softwaru uplatňuje přístup **Flatpak jako první**. Aplikace běží izolovaně od hostitelského operačního systému a pocházejí z [Flathubu](https://flathub.org).

- **[Bazaar](https://github.com/kolunmi/bazaar)** — výchozí obchod s aplikacemi. Odfiltrovává opuštěné aplikace a ty, které závisejí na zastaralých běhových prostředích Flatpaku.
- **[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse)** — spravujte životní cyklus Flatpaků, prohlížejte nainstalovaná běhová prostředí, uklízejte pozůstatky a připínejte nebo vracejte verze.
- **[Flatseal](https://flathub.org/apps/com.github.tchx84.Flatseal)** — grafický správce oprávnění pro jemné řízení přístupu Flatpaků k souborovému systému, síti a zařízením.

## Aplikace příkazové řádky a Homebrew

[brew](https://brew.sh/) (Homebrew) je hlavní správce balíčků pro instalaci aplikací příkazové řádky a vývojářských nástrojů, aniž by se znečistil základní obraz OS.

- [Dokumentace Homebrew](https://docs.brew.sh/)
- [Balíčky Homebrew](https://formulae.brew.sh/)
- [Tahák](https://devhints.io/homebrew)

Upozorňujeme, že funkce Homebrew Cask je specifická pro macOS a v Bluefin nefunguje; pro grafické aplikace se místo toho používá Flatpak. Další nástroje jako [uv](https://github.com/astral-sh/uv), [pixi](https://github.com/prefix-dev/pixi), [asdf](https://asdf-vm.com/) a [mise](https://github.com/jdx/mise) fungují bez problémů, když je nainstalujete přes Homebrew.

:::info[Nekřižte proudy]

Obecně platí: pokud potřebujete nástroj nebo utilitu pro příkazovou řádku, použijte Homebrew. Pokud potřebujete knihovnu a závislosti pro vývoj, použijte kontejner. Všechno tak zůstane čisté a reprodukovatelné.

:::

### Zpráva dne a `fastfetch`

Projekt má rád funkční parádičky, které vypadají skvěle, ale zároveň mají svůj účel. Nové terminály (<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>Enter</kbd>) zobrazí zprávu dne s informacemi o systému:

![image](/img/user-attachments/0e0326ef-6640-41a2-bd24-dae1b1647cfd.png)

Řádek `bluefin-dx:beta` je název obrazu OS; připomíná vám, zda používáte připnutý obraz, a nabízí rychlý přehled běžných příkazů. Zapnout a vypnout ji můžete pomocí `ujust toggle-user-motd`.

Rádi se chlubíme svými stroji. Spusťte `fastfetch`:

![image](/img/user-attachments/f720f9d8-7c3c-4f3c-9112-c627686e0fb1.png)

Tato obrazovka ukazuje informace o hardwaru, uživatelské jméno, název stroje a verzi jádra. Každý obraz Bluefin má datum „Forged On“ připomínající první instalaci stroje:

![image](/img/user-attachments/99522c15-1209-4fa5-a076-1b6289bdbc76.png)

## Nastavení terminálu

### Změna výchozího shellu terminálu

Bluefin ve výchozím stavu používá [bash](https://www.gnu.org/software/bash/), ale pro pohodlí obraz obsahuje také [fish](https://fishshell.com/) ([Přispějte](https://github.com/sponsors/fish-shell)) a [zsh](https://www.zsh.org/).

Bluefin dodává jako výchozí terminál [Ptyxis](https://devsuite.app/ptyxis/) (ve spouštěči aplikací pojmenovaný `Terminal`). **Důrazně doporučujeme** [změnit shell v emulátoru terminálu místo celosystémové změny](https://tim.siosm.fr/blog/2023/12/22/dont-change-defaut-login-shell/). Nejprve nainstalujte požadovaný shell pomocí `brew install zsh` nebo `brew install fish`. Otevřete nastavení terminálu a upravte svůj profil:

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit...](/img/user-attachments/2c122205-dbd8-41e6-8b7b-4f536c3b69e9.png)

Zvolte „Use Custom Command“ a zadejte svůj shell:

- zsh: `/home/linuxbrew/.linuxbrew/bin/zsh`
- fish: `/home/linuxbrew/.linuxbrew/bin/fish`

![Ptyxis → Preferences → Profiles → A Profile Setting → Edit... → Shell → Custom Command](/img/user-attachments/8eb039db-7ec1-4847-b3d7-496d69fe9538.png)

## Rozšíření GNOME doporučená správci

Zde jsou rozšíření GNOME, která správci doporučují pro doladění vašeho desktopu. Podpořte autory rozšíření příspěvkem u těch, která máte rádi!

<div className={styles.extensionsGrid}>

<GnomeExtensions extensionId={5724} />
<GnomeExtensions extensionId={6670} />
<GnomeExtensions extensionId={6325} />
<GnomeExtensions extensionId={8834} />
<GnomeExtensions extensionId={3843} />
<GnomeExtensions extensionId={2236} />
<GnomeExtensions extensionId={5964} />
<GnomeExtensions extensionId={6000} />
<GnomeExtensions extensionId={7065} />

Jako grafické rozhraní pro Tailscale doporučujeme [oficiální aplikaci v systémové liště](https://tailscale.com/docs/features/client/linux-systray): `tailscale configure systray --enable-startup=systemd` a restartujte.

</div>

## Písma

Homebrew se používá také k instalaci písem. Procházejte [Homebrew Cask Fonts](https://formulae.brew.sh/cask-font/) a instalujte svá oblíbená písma do `~/.local/share/fonts`.

### Písma Microsoft

Pokud potřebujete písma Microsoft kvůli kompatibilitě dokumentů:

```bash
brew tap colindean/fonts-nonfree && brew install --cask font-microsoft-office font-microsoft-aptos font-arial font-arial-black font-courier-new font-times-new-roman font-georgia
```
