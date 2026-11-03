---
mdx:
  format: md
---

[![Verified ISO desktop](https://raw.githubusercontent.com/projectbluefin/utah/main/docs/verification/screenshots/installed-fastfetch.png)](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md)

*LUKS ISO test passed for commit `df81798f2661`. [CI run](https://github.com/projectbluefin/utah/actions/runs/41063306779) also runs independent desktop tests that do not gate this record; the LUKS and production ISO jobs passed; [screenshots and provenance](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md).*

Bluefin built on Fedora Hummingbird. The more ... civilized murder machine.

> Your day keeps getting worse. Why are there more.

**Experimental pre-alpha** — the image builds, boots, and installs end to
end in local QEMU validation: the live ISO's bootc-installer creates a
LUKS2-encrypted disk from the ISO's embedded container store with no
network, and the installed system boots on its own to GDM and a GNOME
session (verified record: [docs/verification](https://github.com/projectbluefin/utah/blob/main/docs/verification/README.md)).
Testing container images and live ISOs are available for hardware testing,
but nothing here is ready to run on a machine you care about yet. [Filing
issues](https://github.com/projectbluefin/utah/issues) is the whole point.

## What it is

[Bluefin](https://projectbluefin.io) built on
[Fedora Hummingbird](https://fedoramagazine.org/fedora-hummingbird-linux-taking-the-hummingbird-model-to-the-full-os/) —
a minimal, hardened bootable container base that ships without a desktop. Utah
adds the Bluefin experience and a GNOME 51 desktop compiled from upstream
source.

![Utahraptor size comparison: three specimen silhouettes compared with a human](https://github.com/user-attachments/assets/56428338-54a0-4376-a53b-5f02f8b101a1)

Utah is built across two repositories:

| Repository                                                                        | What it does                                                               |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`projectbluefin/utah`](https://github.com/projectbluefin/utah)                   | Assembles the bootable OS image and live ISO.                              |
| [`projectbluefin/utah-packages`](https://github.com/projectbluefin/utah-packages) | Compiles GNOME 51 and desktop packages from source into an OCI repository. |

## Download and image streams

* **Live ISO (AMD / Intel, Secure Boot off):** [`utah-live-latest.iso`](https://projectbluefin.dev/utah-live-latest.iso) ([SHA-256 checksum](https://projectbluefin.dev/utah-live-latest.iso-CHECKSUM)), built monthly from `:stable`
* **Live versions & downloads:** [docs.projectbluefin.io/utah](https://docs.projectbluefin.io/utah)

The live ISO is hosted on projectbluefin.dev and built by
[`projectbluefin/dakota-iso`](https://github.com/projectbluefin/dakota-iso)
(`build-iso-utah.yml`, monthly on the 8th, from `ghcr.io/projectbluefin/utah:stable`),
not published by this repository's workflows (CI here only uploads
`utah-live.iso` as a short-lived workflow artifact). Verify the download against
its checksum before use.

Like Bluefin, Utah builds four hardware flavors (`utah`, `utah-nvidia`,
`utah-gaming`, `utah-nvidia-gaming`) from `config/flavors.json`:

|        Tag |  Stream | Status                                                                                                                                                       |
| ---------: | ------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:testing` | Testing | Published at `ghcr.io/projectbluefin/utah:testing` after end-to-end ISO validation passes.                                                                   |
|  `:stable` |  Stable | Rolling tag, moved from `:testing` on each promotion to `main` after the release gate passes on the exact candidate digests. Pre-alpha like everything here. |

## Package parity with Bluefin

`packages/bluefin.toml` is a byte-for-byte copy of Bluefin's `base.toml`, checked in CI on every run so the package list never drifts silently.

| count                                                                           |        |
| ------------------------------------------------------------------------------- | ------ |
| Bluefin contract installed                                                      | **61** |
| Utah additions (GNOME 51, base-image parity, device firmware, desktop services) | 254    |
| Genuinely unavailable                                                           | **7**  |

## Known gaps

Why this is still pre-alpha:

* **Disable Secure Boot.** The live ISO (`systemd-boot-unsigned`), custom OGC kernel, NVIDIA driver, and `v4l2loopback` module are not signed yet. Boot via UEFI with Secure Boot off, and flash the ISO directly with Fedora Media Writer or `dd` (Ventoy and legacy BIOS are unsupported). The live session runs SELinux permissive; installed systems run Enforcing.
* **Switching from another `bootc` image.** Ostree's 3-way `/etc` merge can carry over `bootc-fetch-apply-updates.timer` from another image. Utah masks `bootc-fetch-apply-updates` so background updates go through `uupd` instead of silently undoing a `bootc rollback`. After switching, check `systemctl is-enabled bootc-fetch-apply-updates.timer`.
* **Bootloader updates.** Systems on `systemd-boot` update their EFI partition via `bootctl` (`systemd-boot-update.service`), so `bootupctl status` intentionally shows no components. Check `bootctl status` instead.
* **Hardware, codecs, and drivers need real-world testing.** Intel/Linux Wi-Fi firmware and Intel media drivers are included, and the OGC kernel (`sched_ext`, `binderfs`) and open NVIDIA module compile, but hardware video decoding, Wi-Fi, and gaming flavors still need testing on physical machines (#383).
* **The Wi-Fi password prompt can freeze the desktop on some laptops.** On at least one Intel AX201 machine, typing into the desktop's Wi-Fi password dialog stops GNOME Shell responding; the kernel and Wi-Fi stack keep running. Connect from a terminal instead: `sudo nmcli --ask device wifi connect <SSID>` (#354).
* **CUDA is excluded** to save 7.68 GB in the base image. Use the included NVIDIA Container Toolkit to run CUDA inside containers.

See the [open issues](https://github.com/projectbluefin/utah/issues) to track progress or report bugs.

## Contributing

See [docs/building.md](https://github.com/projectbluefin/utah/blob/main/docs/building.md) to build locally, [docs/skills/](https://github.com/projectbluefin/utah/blob/main/docs/skills/) for architecture docs, and [AGENTS.md](https://github.com/projectbluefin/utah/blob/main/AGENTS.md) for agent rules.
