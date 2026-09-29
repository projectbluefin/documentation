---
title: Bienvenue sur Bluefin
slug: /
pagination_next: downloads
---

# Bienvenue sur Bluefin

Pour les utilisateurs finaux, un système aussi fiable qu'un Chromebook, avec une maintenance quasi nulle, tout en proposant aux développeurs un puissant [mode de développement cloud-native](/bluefin-dx). Construit avec une technologie de nouvelle génération, pour les personnes qui ont besoin que leurs machines fassent le travail.

![Capture d'écran du bureau Bluefin](/img/bluefin-hero.webp)

## Bluefin est-il fait pour vous ?

Bluefin est un bureau Linux de nouvelle génération qui tend vers l'amélioration progressive. Nous nous éloignons rigoureusement et résolument des technologies héritées dès que possible pour offrir l'expérience la meilleure possible.

:::tip

Certains pourraient être enclins à dire que Bluefin servira mieux les développeurs ou les utilisateurs Linux expérimentés, mais j'arguerais qu'il est un concurrent tout aussi solide pour les nouveaux utilisateurs, en raison de sa fiabilité et de la qualité de sa configuration dès la sortie de la boîte.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin est :

- **Flatpak d'abord** - Le modèle d'application de Bluefin repose sur des applications isolées, maintenues sur Flathub. Les applications qui ne fonctionnent pas bien avec les composants modernes tels que Wayland, Pipewire, les Portals Flatpak, etc. peuvent offrir une expérience médiocre et ne sont pas recommandées.
- **Volontairement invisible** - Bluefin n'est pas une distribution. Votre relation est avec Flathub, homebrew, et tout ce que vous mettez dans vos conteneurs.
- **Optimisé pour les 96 %** - Pas les 4 % - Bluefin adopte une approche « plus forts ensemble » concernant les fonctionnalités. Vous pouvez toujours faire ce que vous voulez, mais la valeur vient du partage des meilleures pratiques. Nous ne passons pas beaucoup de temps sur les cas limites.
- **Modèle de développement éprouvé** - Expérience développeur centrée autour des conteneurs et faisant découvrir aux nouveaux utilisateurs Linux les [outils utilisés dans le cloud native](https://www.cncf.io/). Consultez les pages [Énoncé de mission](/mission) et [Valeurs](/values) pour plus d'informations.
- **Volontairement axé sur un excellent matériel** - Bluefin fonctionne mieux sur un matériel compatible Linux, afin d'offrir aux utilisateurs une expérience le plus possible dépourvue d'éléments hérités. Bluefin souhaite également soutenir les OEM qui vendent des ordinateurs portables et des stations de travail Linux, c'est pourquoi elle s'efforce de fonctionner avec la meilleure combinaison de logiciel et de matériel. Nous ne faisons pas d'efforts particuliers pour documenter ou contourner les éléments qui compromettent l'expérience utilisateur, donc dans certains cas un autre système d'exploitation est le bon choix.

Si vos exigences sont hors de ce périmètre, alors **Bluefin n'est peut-être pas le meilleur choix pour vous**. Bluefin peut provoquer des inconforts et des blessures [lorsqu'il est tenu incorrectement](/troubleshooting/#am-i-holding-bluefin-wrong). Nous reconnaissons que pour créer un meilleur bureau, beaucoup d'éléments de l'expérience traditionnelle du bureau Linux ne nous accompagneront pas.

## Expérience de bureau et fonctionnalités

Bluefin propose un bureau GNOME ([Faire un don](https://www.gnome.org/donate/)) configuré par notre communauté. Il est conçu pour ne pas vous encombrer et rester en arrière-plan, afin que vous puissiez vous concentrer sur vos applications.

Les mises à jour du système sont basées sur des images et automatiques. Les applications sont séparées logiquement du système en utilisant les Flatpak pour les applications graphiques et `brew` pour les applications en ligne de commande.

:::tip

Bluefin est « une interprétation de l'esprit Ubuntu construite sur la technologie Fedora » — un clin d'œil à une époque de l'histoire d'Ubuntu avec laquelle beaucoup d'adeptes de l'open source ont grandi, tout comme les X-Men Classic. Nous visons à amener cette même ambiance ici ; pensez à nous comme à un reboot. Une ambiance détendue.

:::

- **Disposition GNOME de type Ubuntu** intégrant des extensions sélectionnées avec soin :
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - pour un dock familier
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - pour des icônes de type barre de tâches dans le coin supérieur droit
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - pour intégrer votre appareil mobile à votre bureau
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Faire un don](https://github.com/sponsors/aunetx)) - pour une touche de brillance
  - [Search Light](https://github.com/icedman/search-light) - fournit une fonctionnalité de recherche et un workflow de type macOS Spotlight, lié par défaut aux touches <kbd>Super</kbd>-<kbd>Space</kbd>
- **[Mode développeur](/bluefin-dx)** - des outils de développement dédiés qui transforment Bluefin en une puissante station de travail cloud-native
- **[Terminal Ptyxis](https://devsuite.app/ptyxis/)** pour les workflows centrés sur les conteneurs
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Faire un don](https://github.com/sponsors/ranfdev)) pour la gestion des conteneurs
- **[Tailscale](https://tailscale.com)** inclus pour le VPN, avec le support de `wireguard-tools` et de la barre de tâches
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Faire un don](https://github.com/sponsors/mjakeman)) inclus
- **[Bazaar, magasin d'applications](https://github.com/kolunmi/bazaar)** doté de [Flathub](https://flathub.org) :
  - Une interface de centre logiciel familière pour installer des applications graphiques
  - Les applications abandonnées et les runtime périmées ne sont pas répertoriées
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Faire un don](https://ko-fi.com/heliguy)) inclus pour la gestion des Flatpak
- **Fonctionnalités du quotidien** :
  - [Starship](https://starship.rs) invite de terminal activée par défaut
  - [Solaar](https://github.com/pwr-Solaar/Solaar) pour les souris Logitech, avec `libratbagd`
  - [rclone](https://rclone.org/overview/) et [restic](https://restic.net/) pour les points de montage cloud et les sauvegardes de fichiers modernes
  - `zsh` et `fish` inclus comme shells optionnels
  - [Support Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) pour les ordinateurs portables à GPU doubles
- **Base Universal Blue** :
  - Règles udev supplémentaires pour les manettes de jeu et d'autres appareils, dès la sortie de la boîte
  - Tous les kodek multimédia inclus
  - Mises à jour automatiques par étapes : utilisez votre ordinateur normalement et éteignez-le quand vous avez terminé

## Une approche distroless

Bluefin expédie délibérément des outils upstream au lieu d'applications personnalisées. L'idée d'un « magasin d'applications de distribution » s'est révélée non durable pour les auteurs d'applications graphiques, c'est pourquoi Bluefin expédie à la place des outils tels que [Bazaar](https://github.com/kolunmi/bazaar) et [Homebrew](https://brew.sh). Les workflows restent non seulement agnostiques vis-à-vis de la distribution, mais aussi agnostiques vis-à-vis du système d'exploitation.

:::info[Un monde multi-plateforme]

Les workflows de Bluefin sont délibérément orientés upstream — nous croyons en une expérience Linux cohérente pour tous, qu'il s'agisse de WSL sur Windows, de Podman/Docker sur un Mac, ou de n'importe quel système Linux. L'[écosystème cloud native](http://cncf.io) a prouvé que ce modèle fonctionne. Cela permet à des millions de développeurs existants de démarrer avec un workflow qu'ils connaissent déjà, et permet à Linux de rivaliser où cela compte le plus.

:::

## Prochaines étapes

- **[Téléchargements](/downloads)** — récupérez un ISO officiel Bluefin ou un torrent
- **[Guide d'installation](/installation)** — planification du matériel et étapes de configuration
- **[Guide utilisateur](/administration)** — administration au quotidien, mises à jour et applications
- **[Guide développeur](/bluefin-dx)** — conteneurs, devcontainers et outils d'intelligence artificielle

[L'article d'annonce](https://www.ypsidanger.com/announcing-project-bluefin/) contient également quelques informations de contexte supplémentaires.

## Vidéos et podcasts d'introduction

Consultez notre [liste de vidéos et de critiques](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) pour plus d'informations.

:::tip

« L'évolution est un processus de ramification et d'expansion constants. »

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Dinosaures raptors"
  width="1120"
  height="630"
  loading="lazy"
/>
