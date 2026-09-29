---
title: Bluefin'e Hoş Geldiniz
slug: /
pagination_next: downloads
---

# Bluefin'e Hoş Geldiniz

Son kullanıcılar için bir Chromebook kadar güvenilir ve neredeyse sıfır bakım gerektiren bir sistem; aynı zamanda geliştiricilere güçlü bir [cloud-native geliştirme modu](/bluefin-dx) sunar. Yeni nesil teknolojiyle, makinelerinin işini halletmesi gereken insanlar için geliştirildi.

![Bluefin masaüstü ekran görüntüsü](/img/bluefin-hero.webp)

## Bluefin Size Göre mi?

Bluefin, ilerici iyileştirme yönünde ilerleyen yeni nesil bir Linux masaüstüdür. Mümkün olan en iyi deneyimi sunmak amacıyla eski teknolojilerden titizlikle ve kararlılıkla, mümkün olan en kısa sürede uzaklaşırız.

:::tip

Bazıları Bluefin'in en çok geliştiricilere veya deneyimli Linux kullanıcılarına uygun olduğunu söyleyebilir, ama ben ne kadar güvenilir olduğu ve kutudan çıktığı haliyle ne kadar iyi yapılandırıldığı düşünüldüğünde yeni kullanıcılar için de en az onlar kadar güçlü bir aday olduğunu savunurum.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin şöyle tanımlanabilir:

- **Önce Flatpak** - Bluefin'deki uygulama modeli, Flathub'da bakımı yapılan izole uygulamalar üzerine kuruludur. Wayland, Pipewire, Flatpak Portals gibi modern bileşenlerle iyi çalışmayan uygulamalar kötü bir deneyim sunabilir ve önerilmez.
- **Bilinçli Olarak Görünmez** - Bluefin bir dağıtım değildir. İlişkiniz Flathub, homebrew ve container'larınıza koyduklarınızladır.
- **%96 için Optimize Edilmiş** - %4 için değil - Bluefin, özellikler konusunda "birlikte daha güçlü" yaklaşımını benimser. İstediğinizi her zaman yapabilirsiniz, ama değer en iyi uygulamaları paylaşmaktan gelir. Uç durumlar için çok zaman harcamayız.
- **Kanıtlanmış geliştirme modeli** - Geliştirici deneyimi container'lar etrafında şekillenir ve yeni Linux kullanıcılarını [cloud native'de kullanılan araçlarla](https://www.cncf.io/) tanıştırır. Daha fazla bilgi için [Misyon Bildirisi](/mission) ve [Değerler](/values) sayfalarına bakın.
- **Bilinçli Olarak Harika Donanıma Odaklı** - Bluefin, kullanıcılara mümkün olduğunca eski teknolojilerden arınmış bir deneyim sunmak için Linux dostu donanımlarda en iyi şekilde çalışır. Bluefin ayrıca Linux dizüstü ve masaüstü bilgisayar satan OEM'leri desteklemeyi de amaçlar; bu yüzden yazılım ve donanımın en iyi kombinasyonuyla çalışmaya çabana gösterir. Kullanıcı deneyimini bozan şeyleri belgelemek veya etrafından dolaşmak için özel çaba harcamayız; dolayısıyla bazı durumlarda başka bir işletim sistemi doğru tercih olabilir.

Gereksinimleriniz bu kapsamın dışındaysa, **Bluefin sizin için en doğru seçim olmayabilir**. Bluefin [yanlış tutulduğunda](/troubleshooting/#am-i-holding-bluefin-wrong) rahatsızlık ve zarar verebilir. Daha iyi bir masaüstü sunmak adına geleneksel Linux masaüstü deneyiminin birçok parçasının bizimle gelmeyeceğini biliyoruz.

## Masaüstü Deneyimi ve Özellikler

Bluefin, topluluğumuz tarafından yapılandırılmış bir GNOME ([Bağış Yapın](https://www.gnome.org/donate/)) masaüstü sunar. Sizi rahatsız etmeden yoldan çekilmek ve siz uygulamalarınıza odaklanabilesiniz diye tasarlanmıştır.

Sistem güncellemeleri görüntü tabanlı ve otomatiktir. Uygulamalar grafik uygulamalar için Flatpak ve komut satırı uygulamaları için `brew` kullanılarak sistemden mantıksız şekilde ayrılır.

:::tip

Bluefin, "Fedora teknolojisi üzerine kurulu Ubuntu ruhunun bir yorumu"dur — birçok açık kaynak meraklısının büyüdüğü, tıpkı Classic X-Men gibi, Ubuntu tarihinin belirli bir dönemine yapılan bir gönderme. Aynı havayı buraya getirmeyi amaçlıyoruz; bizi bir reboot olarak düşünün. Huzurlu bir hava.

:::

- **Ubuntu benzeri GNOME düzeni** özenle seçilmiş eklentilerle bütünleşir:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - tanıdık bir dock için
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - sağ üst köşede tepsi benzeri simgeler için
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - mobil cihazınızı masaüstünüzle bütünleştirin
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Bağış Yapın](https://github.com/sponsors/aunetx)) - o şıklık katıyor
  - [Search Light](https://github.com/icedman/search-light) - varsayılan olarak <kbd>Super</kbd>-<kbd>Space</kbd> tuşlarına bağlı, macOS Spotlight'a benzer bir arama ve iş akışı sunar
- **[Geliştirici Modu](/bluefin-dx)** - Bluefin'i güçlü bir cloud-native iş istasyonuna dönüştüren özel geliştirici araçları
- **[Ptyxis terminali](https://devsuite.app/ptyxis/)** container odaklı iş akışları için
  - Container yönetimi için [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Bağış Yapın](https://github.com/sponsors/ranfdev))
- **[Tailscale](https://tailscale.com)** VPN için dahil edilmiştir; `wireguard-tools` ve sistem tepsisi desteği ile birlikte
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Bağış Yapın](https://github.com/sponsors/mjakeman)) dahil
- **[Bazaar Uygulama Mağazası](https://github.com/kolunmi/bazaar)** [Flathub](https://flathub.org) özellikli:
  - Grafik uygulamaları kurmak için tanıdık bir yazılım merkezi arayüzü
  - Terk edilmiş uygulamalar ve eski çalışma zamanları listelenmez
  - Flatpak yönetimi için [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Bağış Yapın](https://ko-fi.com/heliguy)) dahil
- **Yaşam Kalitesi Özellikleri**:
  - [Starship](https://starship.rs) terminal istemi varsayılan olarak etkin
  - Logitech fareler için [Solaar](https://github.com/pwr-Solaar/Solaar) ve `libratbagd` ile birlikte
  - Bulut depolama bağlama noktaları ve modern dosya yedeklemeleri için [rclone](https://rclone.org/overview/) ve [restic](https://restic.net/)
  - İsteğe bağlı kabuklar olarak `zsh` ve `fish` dahil
  - Çift GPU'lu dizüstü bilgisayarlar için [Switcheroo desteği](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com)
- **Universal Blue temeli**:
  - Kutudan çıktığı haliyle oyun konsolları ve diğer donanımlar için ekstra udev kuralları
  - Tüm multimedya kodekleri dahil
  - Aşamalı otomatik güncellemeler: bilgisayarınızı normal şekilde kullanın, işiniz bittiğinde kapatın

## Dağıtımsız Odak

Bluefin, özel uygulamalar yerine bilinçli olarak upstream araçları sunar. Bir "dağıtım uygulama mağazası" fikri masaüstü uygulama geliştiricileri için sürdürülebilir olmadığını kanıtladı; bu yüzden Bluefin bunun yerine [Bazaar](https://github.com/kolunmi/bazaar) ve [Homebrew](https://brew.sh) gibi araçları sunar. İş akışları yalnızca dağıtımdan bağımsız olmakla kalmaz, işletim sisteminden de bağımsız kalır.

:::info[Çapraz Platform Bir Dünyada Yaşıyoruz]

Bluefin'deki iş akışları bilinçli olarak upstream odaklıdır — ister Windows'ta WSL, ister Mac'te Podman/Docker, ister herhangi bir Linux sistemi olsun, herkes için tutarlı bir Linux deneyimine inanıyoruz. [Cloud native ekosistemi](http://cncf.io) bu modelin işe yaradığını kanıtladı. Bu, milyonlarca mevcut geliştiricinin zaten bildikleri bir iş akışıyla işe başlamasına ve Linux'un en çok önemli olduğu yerlerde rekabet etmesine olanak tanır.

:::

## Sonraki Adımlar

- **[İndirmeler](/downloads)** — resmi bir Bluefin ISO'su veya torrent'i edinin
- **[Kurulum Kılavuzu](/installation)** — donanım planlaması ve kurulum adımları
- **[Kullanıcı Kılavuzu](/administration)** — günlük yönetim, güncellemeler ve uygulamalar
- **[Geliştirici Kılavuzu](/bluefin-dx)** — container'lar, devcontainer'lar ve yapay zeka araçları

[Duyuru blog yazısı](https://www.ypsidanger.com/announcing-project-bluefin/) da ek arka plan bilgileri içerir.

## Tanıtıcı Videolar ve Podcast'ler

Daha fazla bilgi için [videolar ve incelemeler listemize](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) göz atın.

:::tip

"Evrim, sürekli dallanma ve genişleme sürecidir."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinozorlar"
  width="1120"
  height="630"
  loading="lazy"
/>
