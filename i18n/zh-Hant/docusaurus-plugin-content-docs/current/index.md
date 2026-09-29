---
title: 歡迎來到 Bluefin
slug: /
pagination_next: downloads
---

# 歡迎來到 Bluefin

對終端使用者而言，這是一個如 Chromebook 般可靠、維護需求幾乎為零的系統，同時為開發者提供強大的[雲端原生開發模式](/bluefin-dx)。採用嶄新技術打造，專為需要靠機器完成工作的人而設。

![Bluefin 桌面截圖](/img/bluefin-hero.webp)

## Bluefin 適合你嗎？

Bluefin 是一個朝持續改進方向發展的嶄新 Linux 桌面環境。我們嚴格且積極地盡早遠離舊有技術，以提供最佳體驗。

:::tip

有人或許傾向說 Bluefin 最適合開發者或有經驗的 Linux 使用者，但我認為，正因為它極其可靠、且開箱設定完善，它對初學者同樣是有強競爭力的選擇。

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin 的特色：

- **Flatpak 優先** - Bluefin 的應用模式圍繞隔離式應用程式，這些應用在 Flathub 上維護。與 Wayland、Pipewire、Flatpak Portals 等現代元件相容不佳的應用可能體驗不佳，不建議使用。
- **刻意低調** - Bluefin 不是一個發行版。你直接打交道的是 Flathub、homebrew，以及你裝進容器裡的任何東西。
- **為 96% 優化** - 而非那 4% - Bluefin 在功能上採取「強強聯手」的策略。你永遠可以做你想做的事，但價值來自最佳實務的分享。我們不會在邊況上花費太多時間。
- **經過驗證的開發模式** - 開發體驗圍繞容器，並讓新的 Linux 使用者接觸[雲端原生所用的工具](https://www.cncf.io/)。詳見[使命宣言](/mission)與[價值觀](/values)頁面。
- **刻意聚焦優秀硬體** - Bluefin 在對 Linux 友好的硬體上運作最佳，以盡可能為使用者提供無舊有包袱的體驗。Bluefin 也希望能支持銷售 Linux 筆電和桌機的 OEM，因此會努力以最佳軟體與硬體組合來運作。我們不會特地文件記錄、或繞過那些損害使用者體驗的狀況，所以在某些情況下，另一個作業系統才是正確的選擇。

如果你的需求在這個範圍之外，那麼 **Bluefin 可能不是最適合你的選擇**。Bluefin 可能會造成不適甚至傷害[如果握的方式不對](/troubleshooting/#am-i-holding-bluefin-wrong)。我們承認，為了打造更好的桌面，傳統 Linux 桌面體驗的很多部分不會跟我們一起來。

## 桌面體驗與功能

Bluefin 採用由社群設定的 GNOME（[捐款](https://www.gnome.org/donate/)）桌面。它設計為少手腳、不搶你風頭，讓你能專注於應用程式。

系統更新基於映像檔且自動。應用程式透過 Flatpak 處理圖形應用、`brew` 處理命令列應用，與系統在邏輯上分開。

:::tip

Bluefin 是「建立在 Fedora 技術上的 Ubuntu 精神的詮釋」——這是對 Ubuntu 歷史某個時代的致敬，許多開源愛好者都在那個時代成長，就像經典 X 戰警一樣。我們希望在這裡帶來同樣的氛圍；把我們看作是一次重新出發。悠閒的氛圍。

:::

- **類 Ubuntu 的 GNOME 版面**，整合經過篩選的擴充功能：
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - 提供熟悉的 Dock
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - 在右上角顯示系統匣圖示
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - 將你的行動裝置整合進桌面
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([捐款](https://github.com/sponsors/aunetx)) - 打造華麗效果
  - [Search Light](https://github.com/icedman/search-light) - 提供搜尋功能，並預設以 <kbd>Super</kbd>-<kbd>Space</kbd> 綁定類似 macOS Spotlight 的操作流程
- **[開發者模式](/bluefin-dx)** - 專屬開發工具將 Bluefin 變成強大的雲端原生工作站
- **[Ptyxis 終端機](https://devsuite.app/ptyxis/)** 用於以容器為核心的工作流程
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([捐款](https://github.com/sponsors/ranfdev)) 用於容器管理
- **[Tailscale](https://tailscale.com)** 內建，提供 VPN，並附 `wireguard-tools` 與系統匣圖示支援
- **[GNOME 擴充功能管理器](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([捐款](https://github.com/sponsors/mjakeman)) 內建
- **[Bazaar 應用程式商店](https://github.com/kolunmi/bazaar)**，整合 [Flathub](https://flathub.org)：
  - 熟悉的軟體中心介面，用於安裝圖形應用程式
  - 已棄用的應用程式和過時執行時環境會被隱藏
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([捐款](https://ko-fi.com/heliguy)) 內建，用於 Flatpak 管理
- **生活品質功能**：
  - 預設啟用 [Starship](https://starship.rs) 終端機提示字元
  - [Solaar](https://github.com/pwr-Solaar/Solaar) 用於羅技滑鼠，並附 `libratbagd`
  - [rclone](https://rclone.org/overview/) 與 [restic](https://restic.net/) 用於雲端儲存掛載和現代化檔案備份
  - 內建 `zsh` 和 `fish` 作為選用 Shell
  - [Switcheroo 支援](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) 用於雙 GPU 筆電
- **Universal Blue 基礎**：
  - 預設為遊戲控制器和其他硬體加上額外 udev 規則
  - 內建所有多媒體編解碼器
  - 分階段自動更新：正常使用你的電腦，完成後關閉即可

## Distroless 聚焦

Bluefin 特別直接提供上游工具，而非自訂應用程式。「發行版應用程式商店」這個概念對桌面應用程式開發者已被證明是不可持續的，所以 Bluefin 改為提供 [Bazaar](https://github.com/kolunmi/bazaar) 和 [Homebrew](https://brew.sh) 等工具。不僅不依賴特定發行版，工作流程甚至不依賴特定作業系統。

:::info[這是一個跨平台的世界]

Bluefin 的工作流程刻意以上游為核心——我們相信每個人都能有一致的 Linux 體驗，無論是在 Windows 上的 WSL、Mac 上的 Podman/Docker，還是任何 Linux 系統。[雲端原生生態系](http://cncf.io)已驗證這個模式行之有效。這讓數百萬既有開發者能用他們已熟悉的工作流程上手，也讓 Linux 能在最關鍵的地方競爭。

:::

## 下一步

- **[下載](/downloads)** — 取得官方的 Bluefin ISO 或種子檔案
- **[安裝指南](/installation)** — 硬體規劃與設定步驟
- **[使用者指南](/administration)** — 日常管理、更新與應用程式
- **[開發者指南](/bluefin-dx)** — 容器、devcontainers 與 AI 工具

這篇[公告文章](https://www.ypsidanger.com/announcing-project-bluefin/)也提供了一些額外的背景資訊。

## 入門影片與廣播節目

看看我們的[影片與評論清單](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts)，取得更多資訊。

:::tip

「演變是一個不斷分支與擴張的過程。」

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Raptor 恐龍"
  width="1120"
  height="630"
  loading="lazy"
/>
