---
title: Chào mừng bạn đến với Bluefin
slug: /
pagination_next: downloads
---

# Chào mừng bạn đến với Bluefin

Đối với người dùng, đây là một hệ thống đáng tin cậy như Chromebook với gần như không cần bảo trì, đồng thời mang tới cho nhà phát triển [chế độ phát triển cloud-native](/bluefin-dx) mạnh mẽ. Được xây dựng bằng công nghệ thế hệ mới, dành cho những ai cần máy của mình hoàn thành công việc.

![Màn hình desktop Bluefin](/img/bluefin-hero.webp)

## Bluefin có phù hợp với bạn?

Bluefin là một desktop Linux thế hệ mới hướng tới cải tiến liên tục. Chúng tôi quyết tâm và nhanh chóng loại bỏ các công nghệ cũ càng sớm càng tốt để mang lại trải nghiệm tốt nhất.

:::tip

Có thể nhiều người muốn nói rằng Bluefin phục vụ tốt nhất cho nhà phát triển hoặc người dùng Linux kinh nghiệm, nhưng tôi cho rằng nó cũng mạnh không kém với người mới vì độ đáng tin cậy và khả năng cấu hình tốt ngay khi xuất xưởng.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin là:

- **Ưu tiên Flatpak** - Mô hình ứng dụng trong Bluefin xoay quanh các ứng dụng biệt lập được quản lý trên Flathub. Các ứng dụng không hoạt động tốt với các thành phần hiện đại như Wayland, Pipewire, Flatpak Portals, v.v. có thể mang lại trải nghiệm kém và không được khuyến nghị.
- **Cố ý vô hình** - Bluefin không phải là một distro. Mối quan hệ của bạn là với Flathub, brew, và những gì bạn đặt trong container của mình.
- **Tối ưu cho 96%** - Không phải 4% - Bluefin theo cách tiếp cận "mạnh cùng nhau" về tính năng. Bạn luôn có thể làm những gì mình muốn, nhưng giá trị đến từ việc chia sẻ thực hành tốt. Chúng tôi không tốn nhiều thời gian cho các trường hợp ngoại lệ.
- **Mô hình phát triển đã được chứng minh** - Trải nghiệm nhà phát triển xoay quanh container và giới thiệu người dùng Linux mới với [các công cụ trong cloud native](https://www.cncf.io/). Xem [Sứ mệnh](/mission) và [Giá trị](/values) để biết thêm.
- **Cố ý tập trung vào phần cứng tốt** - Bluefin chạy tốt nhất trên phần cứng thân thiện Linux nhằm mang lại trải nghiệm không vướng công nghệ cũ cho người dùng. Bluefin cũng muốn hỗ trợ các OEM bán laptop và desktop Linux, nên nỗ lực chạy với tổ hợp phần mềm và phần cứng tốt nhất. Chúng tôi không cố gắng ghi lại hoặc xử lý các vấn đề làm tổn hại trải nghiệm người dùng, nên trong một số trường hợp một hệ điều hành khác là lựa chọn đúng.

Nếu yêu cầu của bạn nằm ngoài phạm vi này, thì **Bluefin có thể không phải là lựa chọn tốt nhất cho bạn**. Bluefin có thể gây khó chịu [khi sử dụng sai cách](/troubleshooting/#am-i-holding-bluefin-wrong). Chúng tôi nhận ra rằng để tạo một desktop tốt hơn, nhiều phần của trải nghiệm desktop Linux truyền thống sẽ không đi cùng chúng tôi.

## Trải nghiệm & Tính năng desktop

Bluefin mang đến desktop GNOME ([Quyên góp](https://www.gnome.org/donate/)) được cấu hình bởi cộng đồng chúng tôi. Nó được thiết kế để không can thiệp, không cản đường bạn để bạn tập trung vào ứng dụng.

Cập nhật hệ thống dựa trên image và tự động. Ứng dụng được tách biệt logic với hệ thống bằng Flatpak cho ứng dụng đồ họa và `brew` cho ứng dụng dòng lệnh.

:::tip

Bluefin là "Sự diễn giải của tinh thần Ubuntu được xây dựng trên công nghệ Fedora"—sự gợi nhớ đến một thời kỳ trong lịch sử Ubuntu mà nhiều người yêu open source lớn lên, cũng giống như X-Men cổ điển. Chúng tôi muốn mang cùng cảm giác đó đến đây; hãy xem chúng tôi như một bản reboot. Thư giãn.

:::

- **Bố cục GNOME giống Ubuntu** tích hợp các extension được tuyển chọn:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - để có một dock quen thuộc
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - cho các biểu tượng kiểu khay ở góc trên bên phải
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - kết nối thiết bị di động với desktop
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([Quyên góp](https://github.com/sponsors/aunetx)) - cho chút lấp lánh
  - [Search Light](https://github.com/icedman/search-light) - cung cấp chức năng tìm kiếm và quy trình kiểu macOS Spotlight, gắn với <kbd>Super</kbd>-<kbd>Space</kbd> theo mặc định
- **[Chế độ Nhà phát triển](/bluefin-dx)** - công cụ chuyên dụng cho nhà phát triển biến Bluefin thành workstation cloud-native mạnh mẽ
- **[Terminal Ptyxis](https://devsuite.app/ptyxis/)** cho tác vụ tập trung container
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([Quyên góp](https://github.com/sponsors/ranfdev)) để quản lý container
- **[Tailscale](https://tailscale.com)** tích hợp cho VPN cùng `wireguard-tools` và hỗ trợ systray
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([Quyên góp](https://github.com/sponsors/mjakeman)) tích hợp
- **[Cửa hàng Ứng dụng Bazaar](https://github.com/kolunmi/bazaar)** với [Flathub](https://flathub.org):
  - Trung tâm phần mềm quen thuộc để cài ứng dụng đồ họa
  - Ứng dụng bị bỏ rơi và runtime lỗi thời bị ẩn
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([Quyên góp](https://ko-fi.com/heliguy)) tích hợp để quản lý Flatpak
- **Tính năng nâng cao chất lượng**:
  - [Starship](https://starship.rs) prompt terminal bật theo mặc định
  - [Solaar](https://github.com/pwr-Solaar/Solaar) cho chuột Logitech cùng `libratbagd`
  - [rclone](https://rclone.org/overview/) và [restic](https://restic.net/) cho gắn kết lưu trữ đám mây và sao lưu hiện đại
  - `zsh` và `fish` có sẵn là shell tùy chọn
  - [Hỗ trợ Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) cho laptop hai GPU
- **Nền tảng Universal Blue**:
  - Thêm quy tắc udev cho tay cầm và phần cứng khác ngay từ hộp
  - Tất cả codec đa phương tiện
  - Cập nhật tự động theo giai đoạn: dùng máy bình thường và tắt khi xong

## Trọng tâm Distroless

Bluefin cụ thể phân phối các công cụ upstream thay vì ứng dụng tùy chỉnh. Ý niệm về một "cửa hàng ứng dụng distro" đã chứng minh là không bền vững cho tác giả ứng dụng desktop, nên Bluefin phân phối các công cụ như [Bazaar](https://github.com/kolunmi/bazaar) và [Homebrew](https://brew.sh) thay vào đó. Quy trình vẫn không chỉ độc lập distro, mà độc lập hệ điều hành.

:::info[Đây là Thế giới Đa nền]

Quy trình trong Bluefin cố ý tập trung upstream -- chúng tôi tin vào trải nghiệm Linux nhất quán cho tất cả, dù là WSL trên Windows, Podman/Docker trên Mac, hoặc bất kỳ hệ thống Linux nào. [Hệ sinh thái cloud native](http://cncf.io) đã chứng minh mô hình này hoạt động. Điều này cho hàng triệu nhà phát triển hiện có trên tàu với quy trình đã quen, và giúp Linux cạnh tranh nơi quan trọng nhất.

:::

## Các bước tiếp theo

- **[Tải xuống](/downloads)** — lấy ISO hoặc torrent chính chủ của Bluefin
- **[Sách hướng dẫn cài đặt](/installation)** — lập kế hoạch phần cứng và các bước cài đặt
- **[Hướng dẫn sử dụng](/administration)** — quản trị hàng ngày, cập nhật và ứng dụng
- **[Hướng dẫn nhà phát triển](/bluefin-dx)** — container, devcontainers và công cụ AI

[Bài blog thông báo](https://www.ypsidanger.com/announcing-project-bluefin/) cũng có thêm thông tin nền.

## Video và Podcast giới thiệu

Xem [danh sách video và đánh giá](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) để biết thêm.

:::tip

"Tiến hóa là quá trình phân nhánh và mở rộng không ngừng."

-- Stephen Jay Gould

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="Khủng long raptor"
  width="1120"
  height="630"
  loading="lazy"
/>
