---
mdx:
  format: md
---

<!-- BEGIN E2E VERIFICATION -->

[![Verified ISO desktop](https://raw.githubusercontent.com/projectbluefin/utah/main/docs/verification/screenshots/installed-fastfetch.png)](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md)

*LUKS ISO test passed for commit `b88744a7574c`. [CI run](https://github.com/projectbluefin/utah/actions/runs/38057702830); [screenshots and provenance](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md).*

<!-- END E2E VERIFICATION -->

Bluefin built on Fedora Hummingbird. The more ... civilized murder machine.

> Your day keeps getting worse. Why are there more.

**Experimental pre-alpha** — the image builds, boots, and installs end to
end in local QEMU validation: the live ISO's bootc-installer creates a
LUKS2-encrypted disk from the ISO's embedded container store with no
network, and the installed system boots on its own to GDM and a GNOME
session (verified record: [docs/verification](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md)).
None of that is published — no image has been pushed to a registry and no
ISO has been released — but the installer and offline payload it exercises
are implemented, not a future milestone. Nothing here is ready to run on a
machine you care about. [Filing
issues](https://github.com/projectbluefin/utah/issues) is the whole point.

## What it is

[Bluefin](https://projectbluefin.io) built on
[Fedora Hummingbird](https://packages.redhat.com)
([announcement](https://fedoramagazine.org/fedora-hummingbird-linux-taking-the-hummingbird-model-to-the-full-os/)),
which supplies a hardened, fast-moving bootable base and no desktop at all.
Utah adds the desktop: Bluefin's package contract on top, and the GNOME 51
stack built from source because neither Hummingbird nor a Fedora release
ships it.

Two repositories, the way `common` and `brew` already work:

| Repository                                                                        | What it does                                                                                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`projectbluefin/utah`](https://github.com/projectbluefin/utah)                   | This one. Composes the image.                                                                                         |
| [`projectbluefin/utah-packages`](https://github.com/projectbluefin/utah-packages) | Builds GNOME 51 and the rest of the desktop stack from verified upstream sources, and publishes them as an OCI image. |

## Download

**No downloadable Utah artifact is offered yet.** No ISO has been released,
and no installer is published. The `:testing` consumer tag **is** published
on `ghcr.io/projectbluefin/utah`, but only after the post-`testing`-e2e
workflow validates a digest and runs
`skopeo copy … "${ref%@*}:testing"`
(`.github/workflows/post-testing-e2e.yml:309`). `stream_name: testing` in
`.github/workflows/build.yml` is built with `publish_stream_tag: "false"`,
which only defers the floating `:testing` tag — it does not block it. The
pipeline also pushes dated `testing-<date>-<sha>` snapshots to
`ghcr.io/projectbluefin/utah` for the `dispatch-iso` job (`build.yml:227`)
to pick up; those are intermediate artifacts, not a release. Nothing here is
ready to run on a machine you care about, and no download URL is
intentionally offered — see [Known gaps](#known-gaps) for what is and is not
built. Track the publication gate in the
[`enhancement` label on the issue tracker](https://github.com/projectbluefin/utah/issues?q=is%3Aissue+label%3Aenhancement+sort%3Aupdated-desc);
the first published artifact will be linked from here and from the [Utah
docs page](https://docs.projectbluefin.io/utah) at the same time.

## Documentation

The user-facing Utah docs page at
[docs.projectbluefin.io/utah](https://docs.projectbluefin.io/utah) is the
canonical home for the live `DriverVersionsCatalog` (kernel, Mesa, NVIDIA,
GNOME versions, provenance and update date, image switch commands, reboot
guidance). Edit [`README.md`](https://github.com/projectbluefin/utah/blob/main/README.md) — not the docs wrapper — and the
catalog stays honest because it is generated, not hand-maintained.

## Image streams

|        Tag | Stream |                                                       What it is |
| ---------: | -----: | ---------------------------------------------------------------: |
| `:testing` |    Dev | Built from `testing`, advanced only after end-to-end validation. |
|  `:stable` | Stable |                                        Promoted from `:testing`. |

Four flavors per stream — `utah`, `utah-nvidia`, `utah-gaming`,
`utah-nvidia-gaming` — matching Bluefin's. `config/flavors.json` is the single
source for that set, for the promote and release matrices, and for whether the
kernel cache image gets built at all.

**`:testing` is published** on `ghcr.io/projectbluefin/utah:testing` after the
post-`testing`-e2e workflow promotes a validated digest
(`.github/workflows/post-testing-e2e.yml:286-309`). `:stable` is not yet
published — `:stable` is what the pipeline is built to produce from a future
promotion off `:testing`, not something you can pull today.

## Package parity with Bluefin

`packages/bluefin.toml` is a byte-for-byte copy of Bluefin's `base.toml` at the
upstream revision pinned in `packages/.bluefin-parity-ref`, and CI diffs it
against that exact revision on every run, so local drift fails the build rather
than being noticed later.

| count                                                                           |        |
| ------------------------------------------------------------------------------- | ------ |
| Bluefin contract installed                                                      | **61** |
| Utah additions (GNOME 51, base-image parity, device firmware, desktop services) | 118    |
| Genuinely unavailable                                                           | **7**  |

The install writes its resolved list to `/usr/share/utah/contract.txt` and the
verify step asserts *that file*, so the two cannot disagree. The unavailable
row is not limited to the copied contract: it also holds image-level parity
gaps — names Bluefin's published image ships from a build file outside
`base.toml`, recorded in `baselines/bluefin/rpms.tsv` and triaged in
`baselines/triage.toml` (`nss-mdns` is the current example). The runtime
repository allowlist is asserted both by `--check` against the `.repo` files
in `packages/` before composition and by the on-image verifier against the
composed image's runtime repositories: every `reposdir` dnf5 resolves at
runtime from the base image's `[main]` config (defaulting to
`/etc/yum.repos.d`, `/etc/distro.repos.d`, `/usr/share/dnf5/repos.d` when no
`reposdir=` is set), so a `.repo` file the base image ships in any of those
directories is held to the same allowlist. The
verify step retains the resolved origin/NEVRA set with build provenance as
`/usr/share/utah/package-origins.json` and `package-origins.txt`. These counts
are generated from `packages/bluefin.toml` and `packages/utah.toml`
(`scripts/generate-site-data.py`, `site/data/packages.json`); `just check`
fails if this table drifts from that output (`scripts/check-doc-counts.py`).

## Known gaps

This is the honest list, and it is why the label above says pre-alpha.

* **Nothing is released yet.** No ISO artifact has been published and no
  installer is offered. The `:testing` consumer tag is published on GHCR
  after validation (see [Download](#download)); what is missing is a release
  artifact and a published installer, not the installer payload itself.
  The live ISO and its bootc-installer payload are implemented and pass an
  offline, LUKS2-encrypted install end to end in local QEMU validation
  (`just iso`, `just luks-test`; record and screenshots in
  [docs/verification](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md)) — what is missing is
  publication, not the installer.
* **Live media boot paths and Secure Boot.** Live media requires UEFI boot;
  legacy BIOS and file-backed/Ventoy booting are explicitly unsupported (flash
  directly using Fedora Media Writer or `dd`). As a documented exception
  (Issue #22), live media runs SELinux in Permissive mode (`enforcing=0`)
  because rootless container squashfs generation cannot preserve SELinux xattrs;
  installed target systems boot Enforcing normally. Because the live environment
  currently uses `systemd-boot-unsigned`, Secure Boot must be disabled in firmware
  to boot the live media until signed shim integration is complete. Custom OGC
  kernels, NVIDIA modules and the v4l2loopback virtual-camera module are all
  built from source during the image build and unsigned; module signing is not
  implemented yet, so Secure Boot must be disabled for them to load.
* **Cross-vendor switch and update timers (`bootc-fetch-apply-updates`).**
  Switching to Utah from Bluefin or other bootc images carries Bluefin's
  `/etc/systemd/system/timers.target.wants/bootc-fetch-apply-updates.timer`
  symlink across ostree's 3-way `/etc` merge. Utah masks
  `bootc-fetch-apply-updates.timer` and `bootc-fetch-apply-updates.service` in
  both `/etc` and `/usr/lib/systemd/system/` (and presets them to disabled) so
  background auto-updates do not bypass `uupd` policy or silently undo a
  rollback (`bootc rollback`). Switchers should verify with
  `systemctl is-enabled bootc-fetch-apply-updates.timer` and can re-assert the
  mask (`systemctl mask --now bootc-fetch-apply-updates.timer bootc-fetch-apply-updates.service`)
  if a merged `/etc` wants symlink remains on disk (links #17, #101).
* **systemd-boot installs keep their ESP through `bootctl`, not `bootupd`.**
  On a system that boots through systemd-boot — for example one switched over
  from Dakota — `bootupd` stands down by design and reports the ESP as
  "managed with bootctl", so `bootupctl status` lists no components. That is
  expected, not a broken install: Utah ships `systemd-boot-unsigned` and
  enables `systemd-boot-update.service`, which runs `bootctl update` on each
  boot that came through systemd-boot, so the boot manager binaries stay
  current. A drop-in gates that service on the `LoaderInfo` EFI variable and on
  Secure Boot being off: BIOS systems have no efivars and skip it outright,
  Fedora GRUB-EFI systems do set `LoaderInfo` (grub2 embeds the `bli` module)
  but `bootctl update` is a no-op there because it refuses to replace a boot
  manager it does not recognise as its own, and Secure Boot systems are skipped
  so the unsigned build cannot overwrite a signed `sd-boot`. Either way GRUB
  systems keep getting their `grub` and `shim` from
  `bootupd`. Switchers can confirm the ESP is being maintained with
  `bootctl status` (compare `Current` against `Available`) rather than
  `bootupctl status` (links #363).
* **Wi-Fi package coverage is not hardware validation.** `[hardware]` in
  `packages/utah.toml` installs `linux-firmware` and explicit Intel wireless
  firmware packages so drivers can load their device blobs. `[parity]` installs
  Hummingbird's `NetworkManager-wifi` together with the factory's
  `wpa_supplicant`, `wireless-regdb` and `iw`; the former factory dependency
  blocker is resolved. Verify device detection and network association on
  the target hardware rather than treating the package list as proof that
  every radio works.
* **The NVIDIA and gaming flavors are unproven.** The OGC kernel compiles with
  `sched_ext` and `binderfs` genuinely enabled, and the NVIDIA open module
  compiles for the base kernel. The module against the OGC kernel, the driver
  installer flags, and the flavored builds pulling the kernel cache image have
  not yet all passed in one run.
* **Codec support differs.** `[multimedia_overrides]` names are packages Fedora
  already ships and Bluefin *replaces* with negativo17 builds. Utah now
  requests four of those twelve names (`intel-gmmlib`,
  `libva-intel-media-driver`, `intel-mediasdk`, `intel-vpl-gpu-rt`) from the
  factory overlay, plus `libvpl`, which is not an overrides name but a
  dependency of `intel-vpl-gpu-rt`. The remaining eight — `libheif`, `libva`
  and the six `mesa-*` names — are not requested by name; whichever build the
  transaction resolves (the factory publishes `libva`, which
  `libva-intel-media-driver` may pull in) is recorded in the image's
  `/usr/share/utah/package-origins.txt`. Nothing is absent from the image;
  hardware-accelerated codecs are what differ, and no run has yet proven
  decode on hardware. Tracked by
  [#383](https://github.com/projectbluefin/utah/issues/383).
* **The image is still pre-alpha.** The digest-pinned `utah-packages` OCI
  repository is consumed and the local QEMU image reaches GDM and GNOME Shell.
* **CUDA is deliberately excluded** — 7.68 GB installed. Use the NVIDIA
  container toolkit, which is included, and run CUDA in a container.

See the [open issues](https://github.com/projectbluefin/utah/issues) for where
things stand.

## Contributing or building from source

See [docs/building.md](https://github.com/projectbluefin/utah/blob/main/docs/building.md) for how to build the image locally,
and [docs/skills/](https://github.com/projectbluefin/utah/blob/main/docs/skills/) for the deep documentation. Agents start at
[AGENTS.md](https://github.com/projectbluefin/utah/blob/main/AGENTS.md).
