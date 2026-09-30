---
title: Bluefinへようこそ
slug: /
pagination_next: downloads
---

# Bluefinへようこそ

エンドユーザーには Chromebookのように信頼性が高く、ほぼメンテナンスフリーなシステムを、開発者には強力な[クラウドネイティブな開発モード](/bluefin-dx)を提供します。次世代技術の上に構築され、仕事を片付けるためにマシンを使いこなす人々のためのOSです。

![Bluefinデスクトップのスクリーンショット](/img/bluefin-hero.webp)

## Bluefinはあなたに合っていますか?

Bluefinは継続的な改善へと向かう次世代のLinuxデスクトップです。レガシーな技術からは、可能な限り迅速かつ積極的に離れ、最高の体験を提供することを目指しています。

:::tip

「Bluefinは開発者や経験豊富なLinuxユーザーに最もよく似合う」と言う人もいるかもしれませんが、わたしは、その信頼性と購入直後の完成度の高さからみて、新規ユーザーにとっても同様に有力な選択肢だと考えます。

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefinの特徴:

- **Flatpak First** — Bluefinのアプリケーションモデルは、Flathubで維持されている隔離されたアプリを中心に据えています。Wayland、Pipewire、Flatpak Portalsなどの最新コンポーネントとうまく連携しないアプリは、体験が劣化する可能性があるため推奨されません。
- **意図して目立たない** — Bluefinはディストリビューションではありません。あなたの関係はFlathub、Homebrew、そしてコンテナに入れたもので築かれます。
- **大多数のために最適化** — 少数のためではなく — Bluefinは機能について「みんなで一緒に強くなろう」というアプローチを取っています。常にやりたいことはできますが、価値はベストプラクティスの共有から生まれます。エッジケースにはあまり時間をかけません。
- **実証済みの開発モデル** — コンテナを中心とし、[クラウドネイティブで使われるツール群](https://www.cncf.io/)を新しいLinuxユーザーに届ける開発者体験。詳細は[Mission Statement](/mission)および[Values](/values)ページを参照してください。
- **良質ハードウェアへの徹底したこだわり** — Bluefinは、レガシーに依存しない体験をユーザーに提供するため、Linuxに親和性のあるハードウェアで最もよく動作します。また、LinuxノートPCやデスクトップを販売するOEMを支援したいと考えており、最良のソフトウェアとハードウェアの組み合わせで動作することを目指しています。ユーザー体験を損なうものに対する文書化や回避には手間をかけないため、場合によっては別のオペレーティングシステムが正しい選択となります。

もしあなたの要件がこの範囲の外にあるなら、**Bluefinはあなたにとって最適ではないかもしれません**。Bluefinは[使い方を誤ると](/troubleshooting/#am-i-holding-bluefin-wrong)不快な思いをさせ、腹を壊すこともあります。よりよいデスクトップを実現するために、従来のLinuxデスクトップ体験の多くの部分は一緒に連れていかないことをご了承ください。

## デスクトップ体験と機能

Bluefinはコミュニティが設定したGNOME ([寄付](https://www.gnome.org/donate/))デスクトップを備えています。アプリケーションに集中できるよう、手離れよく、ユーザーの邪魔をしないよう設計されています。

システムアップデートはイメージベースで自動的です。アプリケーションはシステムから論理的に分離され、グラフィカルアプリケーションにはFlatpak、コマンドラインアプリケーションには`brew`が使われます。

:::tip

Bluefinは「Fedoraの技術で築かれたUbuntuスピリット再解釈」 — かつて多くのオープンソース愛好者が育ったUbuntuの時代へのオマージュです。Classic X-Menにたとえられるように。私たちはここで同じ雰囲気をお届けします。私たちをリブート版だと思ってください。落ち着いた雰囲気で。

:::

- **Ubuntu風GNOMEレイアウト** に厳選された拡張機能を統合:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) — おなじみのドック
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) — 右上角のトレイ風アイコン
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) — モバイル端末とデスクトップを連携
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([寄付](https://github.com/sponsors/aunetx)) — 装飾効果
  - [Search Light](https://github.com/icedman/search-light) — 検索機能と、デフォルトで<kbd>Super</kbd>-<kbd>Space</kbd>に割り当てられたmacOS Spotlight風のワークフローを提供
- **[Developer Mode](/bluefin-dx)** — Bluefinを強力なクラウドネイティブワークステーションに変える専用の開発ツール群
- **コンテナ重視のワークフロー向け [Ptyxisターミナル](https://devsuite.app/ptyxis/)**
  - コンテナ管理のための[Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([寄付](https://github.com/sponsors/ranfdev))
- **VPN用に[Tailscale](https://tailscale.com) を同梱**(さらに`wireguard-tools`とシステムトレイ対応)
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([寄付](https://github.com/sponsors/mjakeman)) を同梱
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** が[Flathub](https://flathub.org)と連携:
  - グラフィカルアプリケーションをインストールするための使い慣れたソフトウェアセンターUI
  - 放置されたアプリケーションや古いランタイムは一覧から除外
  - Flatpak管理のための[Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([寄付](https://ko-fi.com/heliguy)) を同梱
- **生活の質を上げる機能**:
  - [Starship](https://starship.rs) のターミナルプロンプトをデフォルトで有効化
  - Logitechマウス向けの[Solaar](https://github.com/pwr-Solaar/Solaar) と `libratbagd`
  - クラウドストレージのマウントと最新バックアップのための [rclone](https://rclone.org/overview/) と [restic](https://restic.net/)
  - `zsh`と`fish`を選択可能なシェルとして同梱
  - デュアルGPU搭載ノートPC向けの [Switcheroo対応](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com)
- **Universal Blue の基盤**:
  - ゲームコントローラーやその他ハードウェア向けの追加udevルールを出荷時から同梱
  - すべてのマルチメディアコーデックを同梱
  - 段階的な自動アップデート: 通常通りPCを使い、終わったら電源を切るだけ

## Distroless 重視

Bluefinはカスタムアプリケーションの代わりに、意図してアップストリームのツールを出荷します。「ディストリビューションのアプリストア」というモデルはデスクトップアプリケーション作者にとって持続不可能であることが証明されたため、Bluefinは代わりに[Bazaar](https://github.com/kolunmi/bazaar)や[Homebrew](https://brew.sh)といったツールを出荷します。ワークフローはディストリビューションに依存しないだけでなく、オペレーティングシステムにも依存しません。

:::info[私たちはクロスプラットフォームの世界にいます]

Bluefinのワークフローは意図してアップストリームに焦点を当てています — Windows上のWSL、Mac上のPodman/Docker、あるいはあらゆるLinuxシステムであっても、誰もが同じ一貫したLinux体験を得られるべきだと考えています。[クラウドネイティブエコシステム](http://cncf.io)は、このモデルが機能することを証明しました。これにより、すでに慣れ親しんでいるワークフローを使って何百万人もの既存の開発者が参加でき、Linuxが最も重要な場所で競争できるようになります。

:::

## 次のステップ

- **[ダウンロード](/downloads)** — 公式のBluefin ISOまたはトレントを入手
- **[インストールランブック](/installation)** — ハードウェアの計画とセットアップ手順
- **[ユーザーガイド](/administration)** — 日々の管理、アップデート、アプリ
- **[開発者ガイド](/bluefin-dx)** — コンテナ、devcontainers、AIツール群

[発表ブログ記事](https://www.ypsidanger.com/announcing-project-bluefin/)にも補足情報が掲載されています。

## 紹介動画とポッドキャスト

さらに詳しくは[動画・レビューの一覧](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts)もご覧ください。

:::tip

「進化は絶え間ない分岐と拡張の過程である。」

-- スティーヴン・ジェイ・グールド (Stephen Jay Gould)

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="ラプトルの恐竜"
  width="1120"
  height="630"
  loading="lazy"
/>
