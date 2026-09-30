---
title: Bem-vindo ao Bluefin
slug: /
pagination_next: downloads
---

# Bem-vindo ao Bluefin

Para usuários finais, um sistema tão confiável quanto um Chromebook, com manutenção quase zero, ao mesmo tempo em que oferece aos desenvolvedores um poderoso [modo de desenvolvimento cloud-native](/bluefin-dx). Construído com tecnologia de nova geração, para quem precisa que suas máquinas façam o trabalho.

![Bluefin desktop screenshot](/img/bluefin-hero.webp)

## O Bluefin é para você?

Bluefin é um desktop Linux de nova geração que avança em direção à melhoria progressiva. Nos desvinculamos das tecnologias legadas o mais rápido e agressivamente possível, para oferecer a melhor experiência possível.

:::tip

Alguns podem ser inclinados a dizer que o Bluefin serviria melhor aos desenvolvedores ou usuários avançados de Linux, mas eu argumentaria que ele é um contendente igualmente forte para usuários novos, por como ele é confiável e bem configurado de saída da caixa.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin é:

- **Flatpak em Primeiro Lugar** - O modelo de aplicativos no Bluefin gira em torno de aplicativos isolados mantidos no Flathub. Aplicativos que não funcionam bem com componentes modernos como Wayland, Pipewire, Flatpak Portals, etc. podem oferecer uma experiência ruim e não são recomendados.
- **Propositamente Invisible** - O Bluefin não é uma distribuição. Seu relacionamento é com o Flathub, o Homebrew e o que você colocar nos seus contêores.
- **Otimizado para os 96%** - Não para os 4% - O Bluefin adota uma abordagem de "mais forte juntos" em relação às funcionalidades. Você sempre pode fazer o que quiser, mas o valor vem do compartilhamento de boas práticas. Não gastamos muito tempo com casos de borda.
- **Modelo de desenvolvimento comprovado** - Experiência do desenvolvedor centrada nos contêores e na exposição dos [ferramentas usadas na cloud native](https://www.cncf.io/) para usuários novos de Linux. Veja as páginas da [Declaração de Missão](/mission) e dos [Valores](/values) para mais informações.
- **Focado Propositamente em um bom hardware** - O Bluefin roda melhor em hardware amigável a Linux, a fim de oferecer o máximo de experiência livre de legado aos usuários. O Bluefin também quer suportar OEMs que vendem laptops e desktops com Linux, por isso busca rodar com a melhor combinação de software e hardware. Não nos preocupamos em documentar ou contornar coisas que comprometem a experiência do usuário, então em alguns casos outro sistema operacional é a escolha correta.

Se seus requisitos estão fora deste escopo, então **o Bluefin pode não ser o melhor para você**. O Bluefin pode causar desconforto e feridas [segurado incorretamente](/troubleshooting/#am-i-holding-bluefin-wrong). Reconhecemos que, para criar um desktop melhor, muitas partes da experiência tradicional do desktop Linux não virão conosco.

## Experiência e funcionalidades de desktop

O Bluefin oferece um desktop GNOME ([Doar](https://www.gnome.org/donate/)) configurado pela nossa comunidade. É projetado para não interferir e ficar fora do seu caminho, para que você possa focar nos seus aplicativos.

As atualizações do sistema são baseadas em imagens e automáticas. Os aplicativos são logicamente separados do sistema usando Flatpak para aplicativos gráficos e `brew` para aplicativos de linha de comando.

:::tip

O Bluefin é "uma interpretação do espírito do Ubuntu construída sobre a tecnologia do Fedora" — um retorno à era da história do Ubuntu na qual muitos entusiastas do open source cresceram, assim como os X-Men Clássicos. Queremos trazer essa mesma vibe para cá; nos vejam como um reboot. Vibrações tranquilas.

:::

- **Layout do GNOME similar ao Ubuntu** integrando extensões curadas:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - para um dock familiar
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - para ícones tipo tray no canto superior direito
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integra seu dispositivo móvel com sua estação de trabalho
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Doar](https://github.com/sponsors/aunetx)) - para aquele brilho
  - [Search Light](https://github.com/icedman/search-light) - fornece funcionalidade de busca e um workflow estilo macOS Spotlight vinculado a <kbd>Super</kbd>-<kbd>Space</kbd> por padrão
- **[Modo de Desenvolvimento](/bluefin-dx)** - ferramentas dedicadas ao desenvolvedor que transformam o Bluefin em uma estação de trabalho cloud-native poderosa
- **[Terminal Ptyxis](https://devsuite.app/ptyxis/)** para workflows centrados em contêores
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Doar](https://github.com/sponsors/ranfdev)) para gerenciamento de contêores
- **[Tailscale](https://tailscale.com)** incluído para VPN, junto com `wireguard-tools` e suporte a systray
- **[Gerenciador de Extensões do GNOME](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Doar](https://github.com/sponsors/mjakeman)) incluído
- **[Loja de Aplicativos Bazaar](https://github.com/kolunmi/bazaar)** com [Flathub](https://flathub.org):
  - Interface familiar de centro de software para instalar aplicativos gráficos
  - Aplicativos abandonados e runtimes desatualizados são removidos da lista
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Doar](https://ko-fi.com/heliguy)) incluído para gerenciamento de Flatpak
- **Funcionalidades de Qualidade de Vida**:
  - [Starship](https://starship.rs) prompt de linha de comando ativado por padrão
  - [Solaar](https://github.com/pwr-Solaar/Solaar) para mice Logitech, junto com `libratbagd`
  - [rclone](https://rclone.org/overview/) e [restic](https://restic.net/) para montagem de armazenamento em nuvem e backups modernos de arquivos
  - `zsh` e `fish` incluídos como shells opcionais
  - [Suporte ao Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) para laptops com GPUs duplas
- **Base Universal Blue**:
  - Regras udev extras para controles de jogo e outro hardware de saída da caixa
  - Todos os codecs multimedia incluídos
  - Atualizações automáticas em etapas: use seu computador normalmente e desligue-o quando terminar

## Foco no Distroless

O Bluefin especificamente envia ferramentas upstream em vez de aplicativos customizados. A ideia de uma "loja de aplicativos de distribuição" provou ser insustentável para autores de aplicativos de desktop, então o Bluefin envia ferramentas como [Bazaar](https://github.com/kolunmi/bazaar) e [Homebrew](https://brew.sh) no lugar. Os workflows permanecem não apenas agnósticos à distribuição, mas agnósticos ao sistema operacional.

:::info[É um Mundo Multiplataforma]

Os workflows no Bluefin são propositalmente focados em upstream — acreditamos em uma experiência Linux consistente para todos, seja WSL no Windows, Podman/Docker em um Mac, ou qualquer sistema Linux. O [ecossistema cloud native](http://cncf.io) provou que este modelo funciona. Isso permite que milhões de desenvolvedores existentes entrem em um workflow que já conhecem, e permite que o Linux concorra onde isso mais importa.

:::

## Próximos passos

- **[Downloads](/downloads)** — baixe um ISO oficial do Bluefin ou um torrent
- **[Guia de Instalação](/installation)** — planejamento de hardware e etapas de configuração
- **[Guia do Usuário](/administration)** — administração diária, atualizações e aplicativos
- **[Guia do Desenvolvedor](/bluefin-dx)** — contêores, devcontainers e ferramentas de IA

O [post de anúncio no blog](https://www.ypsidanger.com/announcing-project-bluefin/) também tem algumas informações de contexto adicionais.

## Vídeos e Podcasts Introduitórios

Confira nossa [lista de vídeos e avaliações](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) para mais informações.

:::tip

"A evolução é um processo de ramificação e expansão constantes."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
