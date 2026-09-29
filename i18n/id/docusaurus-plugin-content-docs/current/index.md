---
title: Selamat Datang di Bluefin
slug: /
pagination_next: downloads
---

# Selamat Datang di Bluefin

Untuk pengguna akhir, sistem seandalnya sebuah Chromebook dengan perawatan hampir nol, sambil memberikan para pengembang [mode pengembangan cloud-native](/bluefin-dx) yang kuat. Dibangun dengan teknologi generasi terbaru, untuk orang-orang yang butuh mesin mereka menyelesaikan pekerjaan.

![Tangkapan layar desktop Bluefin](/img/bluefin-hero.webp)

## Apakah Bluefin Cocok untuk Anda?

Bluefin adalah desktop Linux generasi terbaru yang cenderung menuju perbaikan progresif. Kami secara ketat dan tegas menjauh dari teknologi lama sesegera mungkin untuk memberikan pengalaman sebaik mungkin.

:::tip

Beberapa orang mungkin berkata bahwa Bluefin paling cocok untuk pengembang atau pengguna Linux berpengalaman, tapi saya akan berpendapat bahwa itu juga pesaing yang kuat untuk pengguna baru karena keandalannya dan cara nya yang sudah terkonfigurasi dengan baik sejak dari kotak.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin adalah:

- **Flatpak Pertama** - Model aplikasi di Bluefin berpusat pada aplikasi terisolasi yang dipelihara di Flathub. Aplikasi yang tidak berjalan baik dengan komponen modern seperti Wayland, WirePlumber, Flatpak Portals, dll. mungkin memberikan pengalaman yang buruk dan tidak direkomendasikan.
- **Sengaja Tidak Menonjol** - Bluefin bukan sebuah distribusi. Hubungan Anda adalah dengan Flathub, brew, dan apa pun yang Anda masukkan ke dalam kontainer Anda.
- **Teroptimasi untuk 96%** - Bukan 4% - Bluefin mengambil pendekatan "lebih kuat bersama" terhadap fitur. Anda selalu bisa melakukan apa yang Anda mau, tapi nilai datang dari berbagi praktik terbaik. Kami tidak menghabiskan banyak waktu pada kasus tepi.
- **Model yang terbukti** - Pengalaman pengembang berpusat pada kontainer dan memperkenalkan pengguna Linux baru ke [tools used in cloud native](https://www.cncf.io/). Lihat halaman [Mission Statement](/mission) dan [Values](/values) untuk informasi lebih lanjut.
- **Sengaja Berfokus pada Hardware Bagus** - Bluefin berjalan terbaik pada hardware yang ramah Linux untuk memberikan pengalaman bebas dari masa lalu sebanyak mungkin. Bluefin juga ingin mendukung OEM yang menjual laptop dan desktop Linux, jadi dia berusaha berjalan dengan kombinasi software dan hardware terbaik. Kami tidak berupaya mendokumentasi atau mengakali hal-hal yang merusak pengalaman pengguna, jadi dalam beberapa kasus sistem operasi lain adalah pilihan yang benar.

Jika persyaratan Anda di luar ruang lingkup ini, maka **Bluefin mungkin bukan pilihan terbaik untuk Anda**. Bluefin dapat menyebabkan ketidaknyaman dan cedera [jika dipegang dengan salah](/troubleshooting/#am-i-holding-bluefin-wrong). Kami menyadari bahwa untuk membuat desktop yang lebih baik, banyak bagian dari pengalaman desktop Linux tradisional tidak akan ikut kami.

## Pengalaman & Fitur Desktop

Bluefin menghadirkan desktop GNOME ([Donasi](https://www.gnome.org/donate/)) yang dikonfigurasi oleh komunitas kami. Dirancang agar tidak mengganggu dan tetap di luar jalan Anda sehingga Anda bisa fokus pada aplikasi Anda.

Pembaruan gambar berbasis gambar dan otomatis. Aplikasi dipisahkan secara logis dari sistem dengan menggunakan Flatpak untuk aplikasi grafis dan `brew` untuk aplikasi baris perintah.

:::tip

Bluefin adalah "Sebuah tafsir dari semangat Ubuntu yang dibangun atas teknologi Fedora"—sebuah pengingat akan era sejarah Ubuntu yang banyak penggemar open source tumbuh dengannya, mirip dengan Classic X-Men. Kami bertujuan membawa nuansa yang sama di sini; anggap kami sebagai reboot. Nuansa tenang.

:::

- **Tata letak GNOME mirip Ubuntu** yang mengintegrasikan ekstensi terkurasi:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - untuk dock yang familiar
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - untuk ikon mirip tray di pojok kanan atas
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - integrasikan perangkat mobile Anda dengan desktop
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Donasi](https://github.com/sponsors/aunetx)) - untuk kilauan
  - [Search Light](https://github.com/icedman/search-light) - menyediakan fungsionalitas pencarian dan alur kerja mirip macOS Spotlight yang terikat pada <kbd>Super</kbd>-<kbd>Space</kbd> secara default
- **[Developer Mode](/bluefin-dx)** - alat pengembang khusus yang mengubah Bluefin menjadi workstation cloud-native yang kuat
- **[Ptyxis terminal](https://devsuite.app/ptyxis/)** untuk alur kerja berfokus kontainer
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Donasi](https://github.com/sponsors/ranfdev)) untuk manajemen kontainer
- **[Tailscale](https://tailscale.com)** disertakan untuk VPN beserta `wireguard-tools` dan dukungan systray
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Donasi](https://github.com/sponsors/mjakeman)) disertakan
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** yang menghadirkan [Flathub](https://flathub.org):
  - UI pusat software familiar untuk menginstal aplikasi grafis
  - Aplikasi yang ditinggalkan dan runtime kedaluwarsa dihilangkan
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Donasi](https://ko-fi.com/heliguy)) disertakan untuk manajemen Flatpak
- **Fitur Kualitas Hidup**:
  - [Starship](https://starship.rs) prompt terminal diaktifkan secara default
  - [Solaar](https://github.com/pwr-Solaar/Solaar) untuk mouse Logitech beserta `libratbagd`
  - [rclone](https://rclone.org/overview/) dan [restic](https://restic.net/) untuk mount penyimpanan cloud dan backup file modern
  - `zsh` dan `fish` disertakan sebagai shell opsional
  - [Switcheroo support](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) untuk laptop dengan GPU ganda
- **Dasar Universal Blue**:
  - Aturan udev ekstra untuk pengontrol game dan hardware lain sejak dari kotak
  - Semua kodek multimedia disertakan
  - Pembaruan otomatis bertahap: gunakan komputer Anda secara normal dan matikan saat selesai

## Fokus Distroless

Bluefin secara khusus mengirimkan tool upstream sebagai pengganti aplikasi khusus. Ide sebuah "store aplikasi distribusi" terbukti tidak berkelanjutan untuk para pengarang aplikasi desktop, jadi Bluefin mengirimkan tool seperti [Bazaar](https://github.com/kolunmi/bazaar) dan [Homebrew](https://brew.sh) sebagai gantinya. Alur kerja tetap tidak hanya agnostik-distribusi, tapi juga agnostik-sistem-operasi.

:::info[Ini adalah Dunia Cross Platform]

Alur kerja di Bluefin sengaja berfokus pada upstream -- kami percaya pada pengalaman Linux yang konsisten untuk semua orang, apakah itu WSL pada Windows, Podman/Docker pada Mac, atau sistem Linux mana pun. [cloud native ecosystem](http://cncf.io) telah membuktikan bahwa model ini berhasil. Ini memungkinkan jutaan pengembang yang sudah ada untuk onboard dengan alur kerja yang sudah mereka ketahui, dan memungkinkan Linux bersaing di tempat yang paling penting.

:::

## Langkah Berikutnya

- **[Downloads](/downloads)** - ambil ISO atau torrent Bluefin resmi
- **[Installation Runbook](/installation)** - perencanaan hardware dan langkah setup
- **[User Guide](/administration)** - administrasi harian, pembaruan, dan aplikasi
- **[Developer Guide](/bluefin-dx)** - kontainer, devcontainers, dan tool AI

[postingan blog pengumuman](https://www.ypsidanger.com/announcing-project-bluefin/) juga memiliki informasi latar belakang tambahan.

## Video dan Podcast Pengantar

Lihat [daftar video dan review](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) untuk informasi lebih lanjut.

:::tip

"Evolution is a process of constant branching and expansion."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor dinosaurs"
  width="1120"
  height="630"
  loading="lazy"
/>
