---
title: مرحبًا بك في Bluefin
slug: /
pagination_next: downloads
---

# مرحبًا بك في Bluefin

بالنسبة للمستخدمين النهائيين، نظام موثوق كجهاز Chromebook مع شبه صيانة معدومة، وفي الوقت نفسه يوفر للمطورين [وضع تطوير سحابي أصلي](/bluefin-dx) قويًا. مبني بتقنيات الجيل القادم، للأشخاص الذين يحتاجون إلى أن تنجز أجهزتهم أعمالهم.

![لقطة شاشة لسطح مكتب Bluefin](/img/bluefin-hero.webp)

## هل Bluefin مناسب لك؟

Bluefin هو سطح مكتب Linux من الجيل القادم يميل نحو التحسين التدريجي. نبتعد بشكل صارم وحازم عن التقنيات القديمة في أقرب وقت ممكن لتقديم أفضل تجربة ممكنة.

:::tip

قد يميل البعض للقول إن Bluefin يخدم المطورين أو مستخدمي Linux المتمرسين أفضل، لكنني أزعم أنه منافس قوي بنفس القدر للمستخدمين الجدد بسبب مدى موثوقيته ومدى جودة إعداده عند إخراجه من العلبة.

-- [Jack Wallen](https://thenewstack.io/bluefin-a-next-gen-linux-workstation-for-containerized-apps/)

:::

Bluefin هو:

- **Flatpak أولا** - نموذج التطبيقات في Bluefin يركز على التطبيقات المعزولة التي يتم صيانتها في Flathub. التطبيقات التي لا تعمل جيدًا مع المكونات الحديثة مثل Wayland وPipewire وFlatpak Portals وما إلى ذلك قد توفر تجربة سيئة ولا يوصى بها.
- **متعمد الاختفاء** - Bluefin ليس توزيعة. علاقتك هي مع Flathub وHomebrew وأي شيء تضعه في حاوياتك.
- **محسّن لـ 96%** - وليس لـ 4% - يتبع Bluefin نهج "الأقوى معًا" نحو الميزات. يمكنك دائمًا فعل ما تريد، لكن القيمة تأتي من مشاركة أفضل الممارسات. لا نقضي الكثير من الوقت على الحالات الحدية.
- **نموذج تطوير مُثبت** - تجربة المطور تتمحور حول الحاويات وتكشف لمستخدمي Linux الجدد [الأدوات المستخدمة في الحوسبة السحابية الأصلية](https://www.cncf.io/). راجع صفحات [بيان المهمة](/mission) و[القيم](/values) لمزيد من المعلومات.
- **متعمد التركيز على الأجهزة الرائعة** - يعمل Bluefin بشكل أفضل على الأجهزة الصديقة لـ Linux لتوفير أكبر قدر ممكن من التجربة الخالية من الإرث للمستخدمين. يريد Bluefin أيضًا دعم مصنعي المعدات الأصلية الذين يبيعون أجهزة Linux المحمولة والمكتبية، لذلك يسعى للعمل بأفضل توليفة من البرامج والأجهزة. لا نبالغ في توثيق الأشياء التي تضعف تجربة المستخدم أو إيجاد حلول بديلة لها، لذلك في بعض الحالات يكون نظام تشغيل آخر هو الخيار الصحيح.

إذا كانت متطلباتك خارج هذا النطاق، فإن **Bluefin قد لا يكون الأنسب لك**. قد يسبب Bluefin الإزعاج والإضرار [عند استخدامه بشكل غير صحيح](/troubleshooting/#am-i-holding-bluefin-wrong). ندرك أنه لتقديم سطح مكتب أفضل، فإن أجزاء كثيرة من تجربة سطح مكتب Linux التقليدية لن ترافقنا.

## تجربة سطح المكتب والميزات

يقدم Bluefin سطح مكتب GNOME ([تبرع](https://www.gnome.org/donate/)) تم تهيئته من قبل مجتمعنا. تم تصميمه ليكون بدون تدخل وبعيدًا عن طريقك حتى تتمكن من التركيز على تطبيقاتك.

تحديثات النظام قائمة على الصور وتلقائية. يتم فصل التطبيقات منطقيا عن النظام باستخدام Flatpaks للتطبيقات الرسومية و`brew` لتطبيقات سطر الأوامر.

:::tip

Bluefin هو "تفسير لروح Ubuntu مبني على تقنية Fedora" - إشارة إلى حقبة من تاريخ Ubuntu كبر فيها كثير من عشاق المصادر المفتوحة، مثل Classic X-Men. نهدف إلى جلب نفس الأجواء هنا؛ اعتبرنا إعادة تشغيل. أجواء هادئة.

:::

- **تخطيط GNOME شبيه بـ Ubuntu** يدمج إضافات منتقاة:
  - [Dash to Dock](https://micheleg.github.io/dash-to-dock/) - لشريط تطبيقات مألوف
  - [Appindicator](https://github.com/ubuntu/gnome-shell-extension-appindicator) - لأيقونات تشبه Tray في الزاوية العلوية اليمنى
  - [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect) - ادمج جهازك المحمول مع سطح مكتبك
  - [Blur my Shell](https://github.com/aunetx/blur-my-shell) ([تبرع](https://github.com/sponsors/aunetx)) - لتلك اللمسة الجمالية
  - [Search Light](https://github.com/icedman/search-light) - يوفر وظيفة بحث وسير عمل شبيه بـ macOS Spotlight مرتبط بـ <kbd>Super</kbd>-<kbd>Space</kbd> افتراضيا
- **[وضع المطور](/bluefin-dx)** - أدوات مطور مخصصة تحول Bluefin إلى محطة عمل سحابية أصلية قوية
- **[Ptyxis terminal](https://devsuite.app/ptyxis/)** لسير العمل المتمحور حول الحاويات
  - [Distroshelf](https://flathub.org/apps/com.ranfdev.DistroShelf) ([تبرع](https://github.com/sponsors/ranfdev)) لإدارة الحاويات
- **[Tailscale](https://tailscale.com)** مضمن لـ VPN إلى جانب `wireguard-tools` ودعم systray
- **[GNOME Extensions Manager](https://flathub.org/apps/com.mattjakeman.ExtensionManager)** ([تبرع](https://github.com/sponsors/mjakeman)) مضمن
- **[Bazaar Application Store](https://github.com/kolunmi/bazaar)** يقدم [Flathub](https://flathub.org):
  - واجهة مركز برامج مألوفة لتثبيت التطبيقات الرسومية
  - التطبيقات المتروكة و runtimes القديمة غير مدرجة
  - [Warehouse](https://flathub.org/apps/io.github.flattool.Warehouse) ([تبرع](https://ko-fi.com/heliguy)) مضمن لإدارة Flatpak
- **ميزات جودة الحياة**:
  - [Starship](https://starship.rs) موجه طرفية مفعّل افتراضيا
  - [Solaar](https://github.com/pwr-Solaar/Solaar) لفئران Logitech إلى جانب `libratbagd`
  - [rclone](https://rclone.org/overview/) و[restic](https://restic.net/) لتركيبات التخزين السحابي والنسخ الاحتياطية الحديثة للملفات
  - `zsh` و`fish` مضمنتان كصدفات اختيارية
  - [دعم Switcheroo](https://man.archlinux.org/man/switcherooctl.1.en?ref=news.itsfoss.com) لأجهزة الكمبيوتر المحمولة ذات بطاقات الرسوميات المزدوجة
- **أساس Universal Blue**:
  - قواعد udev إضافية لوحدات التحكم في الألعاب والأجهزة الأخرى خارج الصندوق
  - جميع برامج ترميز الوسائط المتعددة مضمنة
  - تحديثات تلقائية مرحلية: استخدم جهازك بشكل طبيعي وأطفئه عند الانتهاء

## التركيز على Distroless

يشحن Bluefin على وجه التحديد الأدوات الأولية بدلًا من التطبيقات المخصصة. أثبتت فكرة "متجر تطبيقات التوزيعة" عدم استدامتها لمطوري تطبيقات سطح المكتب، لذلك يشحن Bluefin أدوات مثل [Bazaar](https://github.com/kolunmi/bazaar) و[Homebrew](https://brew.sh) بدلًا من ذلك. تظل سير العمل لا محايدة تجاه التوزيعة فحسب، بل محايدة تجاه نظام التشغيل أيضًا.

:::info[إنه عالم متعدد المنصات]

سير العمل في Bluefin متعمدة التركيز على المنبع -- نؤمن بتجربة Linux متسقة للجميع، سواء كانت WSL على Windows، أو Podman/Docker على Mac، أو أي نظام Linux. أثبت [نظام الحوسبة السحابية الأصلية البيئي](http://cncf.io) أن هذا النموذج يعمل. يتيح هذا لملايين المطورين الحاليين الالتحاق بسير عمل يعرفونه بالفعل، ويسمح لـ Linux بالمنافسة حيثما يكون ذلك أهم ما يكون.

:::

## الخطوات التالية

- **[التنزيلات](/downloads)** — احصل على ISO رسمي لـ Bluefin أو تورنت
- **[دليل التثبيت](/installation)** — تخطيط الأجهزة وخطوات الإعداد
- **[دليل المستخدم](/administration)** — الإدارة اليومية والتحديثات والتطبيقات
- **[دليل المطور](/bluefin-dx)** — الحاويات و devcontainers وأدوات الذكاء الاصطناعي

تحتوي [مقال الإعلان](https://www.ypsidanger.com/announcing-project-bluefin/) أيضًا على بعض معلومات الخلفية الإضافية.

## فيديوهات وبودكاست تعريفية

تحقق من [قائمة الفيديوهات والمراجعات](https://universal-blue.discourse.group/tags/c/bluefin/6/videos-and-podcasts) لمزيد من المعلومات.

:::tip

"التطور هو عملية تفرع وتوسع مستمرين."

-- ستيفن جاي غولد

:::

<img
  src="/img/bluefin-raptors.webp"
  alt="ديناصورات رابتور"
  width="1120"
  height="630"
  loading="lazy"
/>
