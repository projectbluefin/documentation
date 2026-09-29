---
title: Bienvenido a Bluefin
slug: /
pagination_next: downloads
---

# Bienvenido a Bluefin

Para los usuarios finales, un sistema tan fiable como un Chromebook y con mantenimiento prácticamente nulo, a la vez que ofrece a los desarrolladores un potente [modo de desarrollo cloud-native](/bluefin-dx). Construido con tecnología de nueva generación, para personas que necesitan sus máquinas para trabajar.

![Captura de pantalla del escritorio de Bluefin](/img/bluefin-hero.webp)

## ¿Es Bluefin para ti?

Bluefin es un escritorio de Linux de nueva generación que tiende a la mejora continua. Nos alejamos rigurosamente y de forma agresiva de las tecnologías obsoletas pronto, para ofrecer la mejor experiencia posible.

:::tip

Algunos podrían inclinarse a decir que Bluefin serviría mejor a desarrolladores o usuarios de Linux experimentados, pero yo arguyo que también es un contendiente muy fuerte para usuarios nuevos, por cuán fiable que es y lo bien configurado que sale de la caja.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin es:

- **Flatpak primero** - El modelo de aplicación en Bluefin se centra en aplicaciones aisladas que se mantienen en Flathub. Las aplicaciones que no funcionan bien con componentes modernos como Wayland, Pipewire, Flatpak Portal, etc. pueden dar una experiencia pobre y no se recomiendan.
- **A propósito invisible** - Bluefin no es una distribución. Tu relación es con Flathub, Homebrew y lo que pongas en tus contenedores.
- **Optimizado para el 96%** - No para el 4% - Bluefin adopta un enfoque de "más juntos" hacia las funciones. Siempre puedes hacer lo que quieras, pero el valor viene de compartir buenas prácticas. No perdemos mucho tiempo con casos límite.
- **Modelo de desarrollo demostrado** - experiencia del desarrollador centrada en contenedores y en exponer a los usuarios nuevos de Linux a [las herramientas usadas en cloud native](https://www.cncf.io/). Consulta las páginas [Declaración de misión](/mission) y [Valores](/values) para más información.
- **A propósito centrado en excelencia de hardware** - Bluefin funciona mejor con hardware compatible con Linux, para ofrecer lo más posible una experiencia libre de obsoletos. Bluefin también quiere a los OEM que venden portátiles y ordenadores de Linux, por lo que se esfuerza en funcionar con la mejor combinación de software y hardware. No hacemos esfuerzos por documentar o salvar cosas que comprometen la experiencia del usuario, así que en algunos casos otro sistema operativo es la elección correcta.

Si tus requisitos están fuera de este alcance, entonces **Bluefin puede que no sea la mejor opción para ti**. Bluefin puede causar incomodidad e incluso heridas [al sostenerlo incorrectamente](/troubleshooting/#am-i-holding-bluefin-wrong). Reconocemos que, para hacer un mejor escritorio, muchas partes de la experiencia tradicional del escritorio de Linux no vendrán con nosotros.

## Experiencia y funciones del escritorio

Bluefin incluye un escritorio GNOME ([Donate](https://www.gnome.org/donate/)) configurado por nuestra comunidad. Está diseñado para ser de manejo propio y no estorbarte, así que puedas centrarte en tus aplicaciones.

Las actualizaciones del sistema se basan en imágenes y son automáticas. Las aplicaciones se separan lógicamente del sistema usando Flatpak para las aplicaciones gráficas y `brew` para las aplicaciones de línea de comandos.

:::tip

Bluefin es "una interpretación del espíritu de Ubuntu construida sobre la tecnología de Fedora"—un guiño a una época de la historia de Ubuntu en la que muchos entusiastas del open source crecieron, tal como los X-Men clásicos. Queremos traer la misma vibra aquí; piensa en nosotros como el reboot. Chill vibes.

:::

- **Diseño de GNOME similar a Ubuntu** que integrando extensiones curadas:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - para un dock familiar
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - para íconos tipo bandeja en la esquina superior derecha
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integra tu dispositivo móvil con tu escritorio
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donate](https://github.com/sponsors/aunetx)) - para ese brillo
  - [Search Light](https://github.com/icedman/search-light) - proporciona funcionalidad de búsqueda y un flujo de trabajo similar a macOS Spotlight vinculado a <kbd>Super</kbd>-<kbd>Space</kbd> por defecto
- **[Developer Mode](/bluefin-dx)** - herramientas de desarrollo dedicadas que transforman Bluefin en una estación de trabajo cloud-native potente
- **[Terminal Ptyxis](https://devsuite.app/ptyxis/)** para flujos de trabajo centrados en contenedores
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donate](https://github.com/sponsors/ranfdev)) para gestión de contenedores
- **[Tailscale](https://tailscale.com)** incluido para VPN, junto con `wireguard-tools` y soporte en la bandeja del sistema
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattJakeman.ExtensionManager)** ([Donate](https://github.com/sponsors/mjakeman)) incluido
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** con [Flathub](https://flathub.org):
  - UI de centro de software familiar para instalar aplicaciones gráficas
  - Aplicaciones abandonadas y tiempos de ejecución desactualizados no aparecen
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donate](https://ko-fi.com/heliguy)) incluido para la gestión de Flatpak
- **Funciones de calidad de vida**:
  - [Starship](https://starship.rs) indicador de terminal habilitado por defecto
  - [Solaar](https://github.com/pwr-Solaar/Solaar) para ratones de Logitech junto con `libratbagd`
  - [rclone](https://rclone.org/overview/) y [restic](https://restic.net/) para montajes de almacenamiento en la nube y copias de seguridad modernas de archivos
  - `zsh` y `fish` incluidos como shells opcionales
  - [Soporte para Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) para portátiles con GPUs duales
- **Base de Universal Blue**:
  - Reglas udev adicionales para mandos de juego y otro hardware de la caja
  - Todos los codecs multimedia incluidos
  - Actualizaciones automáticas escalonadas: usa tu equipo normalmente y apágalo cuando termines

## Enfoque sin distribución

Bluefin específicamente incluye herramientas upstream en lugar de aplicaciones personalizadas. La idea de una "tienda de aplicaciones de distribución" se ha demostrado insostenible para los autores de aplicaciones de escritorio, así que Bluefin incluye herramientas como [Bazaar](https://github.com/kolunmi/bazaar) y [Homebrew](https://brew.sh) en su lugar. Los flujos de trabajo no solo son agnósticos respecto de la distribución, sino también respecto del sistema operativo.

:::info[Es un mundo multiplataforma]

Los flujos de trabajo en Bluefin son a propósito centrados en upstream — creemos en una experiencia de Linux consistente para todos, ya sea WSL en Windows, Podman/Docker en un Mac, o cualquier sistema Linux. El [ecosistema cloud native](http://cncf.io) ha demostrado que este modelo funciona. Esto permite a millones de desarrolladores existentes abordar con un flujo de trabajo que ya conocen, y permite a Linux competir donde más importa.

:::

## Próximos pasos

- **[Downloads](/downloads)** — obtén un ISO o torrent oficial de Bluefin
- **[Installation Runbook](/installation)** — planificación de hardware y pasos de instalación
- **[User Guide](/administration)** — administración diaria, actualizaciones y aplicaciones
- **[Developer Guide](/bluefin-dx)** — contenedores, devcontainers y herramientas de IA

El [announcement blog post](https://www.ypsidanger.com/announcing-project-bluefin/) también tiene algo de información de contexto adicional.

## Videos y podcasts introductorios

Consulta nuestra [lista de videos y reseñas](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) para más información.

:::tip

"La evolución es un proceso de ramificación y expansión constantes."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
