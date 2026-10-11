---
mdx:
  format: md
---

[![Build Bluefin LTS](https://github.com/projectbluefin/bluefin-lts/actions/workflows/build-regular.yml/badge.svg)](https://github.com/projectbluefin/bluefin-lts/actions/workflows/build-regular.yml) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/10098/badge)](https://www.bestpractices.dev/projects/10098) [![Bluefin LTS on ArtifactHub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/bluefin)](https://artifacthub.io/packages/container/bluefin/bluefin) [![Installs](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ublue-os/countme/main/badge-endpoints/bluefin-lts.json\&label=Installs)](https://github.com/projectbluefin/bluefin-lts) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/projectbluefin/bluefin-lts)

Larger, more lethal [Bluefin](https://projectbluefin.io). Built on CentOS Stream 10 for longer support windows, conservative upgrades, and production-focused workstations.

## Latest Release

<a href="https://docs.projectbluefin.io/changelogs/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://docs.projectbluefin.io/img/cards/bluefin-lts-dark.png">
    <img src="https://docs.projectbluefin.io/img/cards/bluefin-lts-light.png" alt="Bluefin LTS latest release" width="800">
  </picture>
</a>

## Images

Full catalog at [docs.projectbluefin.io/images →](https://docs.projectbluefin.io/images/)

### Bluefin LTS

Long-term support Bluefin stream built on CentOS Stream 10.

```bash
# LTS — recommended
sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy
# LTS — NVIDIA
sudo bootc switch ghcr.io/projectbluefin/bluefin-lts-nvidia:stable --enforce-container-sigpolicy
```

## Migrating from ublue-os/bluefin-lts

Users on the previous `ghcr.io/ublue-os/bluefin*:lts` images will be migrated automatically via a systemd service. No action required — your machine will switch on its next reboot after pulling the update.

| Old image (ublue-os)              | New image (projectbluefin)                                     |
| --------------------------------- | -------------------------------------------------------------- |
| `bluefin:lts`                     | `bluefin-lts:stable`                                           |
| `bluefin:lts-hwe` (legacy tag)    | `bluefin-lts:stable`                                           |
| `bluefin-dx:lts`                  | `bluefin-lts:stable` + run `ujust devmode` after reboot        |
| `bluefin-dx:lts-hwe` (legacy tag) | `bluefin-lts:stable` + run `ujust devmode` after reboot        |
| `bluefin-gdx:lts`                 | `bluefin-lts-nvidia:stable` + run `ujust devmode` after reboot |
| arm64 variants                    | No automatic migration — reinstall from new image              |

To migrate manually before the automatic migration ships:

```bash
sudo bootc switch ghcr.io/projectbluefin/bluefin-lts:stable --enforce-container-sigpolicy
```

## Getting Started

Visit **[projectbluefin.io](https://projectbluefin.io/#scene-picker)** to download Bluefin LTS, or check the **[LTS Documentation](https://docs.projectbluefin.io/lts/)** for installation and upgrade instructions.

Rebasing between the Bluefin (Fedora) and Bluefin LTS (CentOS) image families is not supported. Plan migrations as fresh installs or supported upgrade paths.

## Community

* 📰 **[Blog](https://blog.projectbluefin.io/)** — announcements and release posts
* 💬 **[Discussions](https://community.projectbluefin.io/)** — community forum
* 📋 **[Project Board](https://todo.projectbluefin.io/)** — what we're working on
* 📖 **[Documentation](https://docs.projectbluefin.io/)** — user guides and reference

## Contributing

See the **[Contributing Guide](https://docs.projectbluefin.io/contributing/)** for how to get involved. All participants are expected to follow the [Universal Blue Community Guidelines](https://docs.projectbluefin.io/contributing#community-guidelines).

Report security vulnerabilities via [SECURITY.md](https://github.com/projectbluefin/bluefin-lts/blob/main/SECURITY.md).

## License

Apache License 2.0 — see [LICENSE](https://github.com/projectbluefin/bluefin-lts/blob/main/LICENSE).

Bluefin LTS incorporates [CentOS Stream](https://www.centos.org/centos-stream/), [GNOME](https://www.gnome.org/), [Universal Blue](https://universal-blue.org/), and various CNCF projects, each under their respective licenses.
