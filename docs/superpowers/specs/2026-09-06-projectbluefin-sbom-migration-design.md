# Project Bluefin SBOM & Image Catalog Migration Design

- **Date:** 2026-09-06
- **Status:** Approved
- **Scope:** `projectbluefin/documentation` (Images & Driver Versions pages, pipelines, and data)

---

## 1. Context & Objectives

### Problem Statement
The documentation site's Images (`docs/images.md`) and Driver Versions (`docs/driver-versions.mdx`) catalogs previously depended on legacy `ublue-os` artifacts, HTML release-feed tables, and retired image product streams (`bluefin-dx`, `bluefin-dx-lts`, `bluefin-gdx`).

With Project Bluefin fully transitioned to the factory:
- Container packages live under `projectbluefin` on GHCR (`ghcr.io/projectbluefin/*`).
- Dedicated DX and GDX images are retired (developer tooling lives in Homebrew; NVIDIA drivers ship directly with base images).
- Software Bill of Materials (SBOM) and provenance attestations are published to GHCR.
- Project Hummingbird-based image track **Utah** (`projectbluefin/utah`) joins **Bluefin**, **Bluefin LTS**, and **Dakota**.

### Goals
1. Source all package and driver version metadata strictly from `projectbluefin` SBOM attestations.
2. Sever all connections and references to `ublue-os/bluefin` and `ublue-os/bluefin-lts` in these catalogs.
3. Track the four active Project Bluefin image families:
   - **Bluefin** (`bluefin`, `bluefin-nvidia`)
   - **Bluefin LTS** (`bluefin-lts`, `bluefin-lts-hwe`, `bluefin-lts-nvidia`, `bluefin-lts-hwe-nvidia`)
   - **Dakota** (`dakota`, `dakota-nvidia`)
   - **Utah** (`utah`, `utah-nvidia`)
4. Display Utah on `docs/images.md` and `docs/driver-versions.mdx`.
5. Remove retired DX and GDX image products from the catalog.

---

## 2. Architecture & Data Flow

### Data Pipeline Architecture
```
GHCR (ghcr.io/projectbluefin/*)
       │
       ▼
scripts/fetch-github-sbom.js ───► static/data/sbom-attestations.json
                                ───► static/data/sbom-attestations-frontend.json
       │
       ├─────────────────────────────────────────┐
       ▼                                         ▼
scripts/fetch-github-driver-versions.js   scripts/fetch-github-images.js
       │                                         │
       ▼                                         ▼
static/data/driver-versions.json         static/data/images.json
       │                                         │
       ▼                                         ▼
<DriverVersionsCatalog />                 <ImagesCatalog />
(docs/driver-versions.mdx)                (docs/images.md)
```

1. **`fetch-github-sbom.js`:**
   - Queries GHCR for package tags and image referrers.
   - Adds stream specifications for `utah-testing` and `utah-nvidia`.
   - Downloads SPDX/Syft SBOMs via ORAS and parses RPM / BuildStream / Hummingbird package versions.
   - Writes `sbom-attestations.json` and slim frontend copy.

2. **`fetch-github-driver-versions.js`:**
   - Reads `sbom-attestations.json`.
   - Builds driver history records for `bluefin-stable`, `bluefin-lts`, `dakota-latest`, and `utah-testing`.
   - Generates `static/data/driver-versions.json`.

3. **`fetch-github-images.js`:**
   - Defines four products: `projectbluefin-bluefin`, `projectbluefin-bluefin-lts`, `projectbluefin-dakota`, `projectbluefin-utah`.
   - Extracts versions strictly from SBOM data (eliminates HTML feed regex scraping).
   - Generates `static/data/images.json`.

---

## 3. Component & Page Specifications

### `docs/driver-versions.mdx`
- Add section for Utah:
  ```mdx
  ## Utah

  <DriverVersionsCatalog streamId="utah-testing" />
  ```
- Retain Bluefin, Bluefin LTS, and Dakota.

### `src/components/ImagesCatalog.tsx`
- Refactor product filtering to display four groups:
  1. Bluefin
  2. Bluefin LTS
  3. Dakota
  4. Utah
- Remove legacy `ublue-` product IDs and references.
- Style Utah card with dedicated theme token (`styles.cardUtah` or matching raptor accent).
- Stream switch commands target `ghcr.io/projectbluefin/<package>:<tag>`.

### `src/components/DriverVersionsCatalog.tsx`
- Support Utah stream (`utah-testing`).
- Rebase helper commands point to `ghcr.io/projectbluefin/...`.

---

## 4. Error Handling & Fallbacks

- **Graceful degradation:** If SBOM referrers or specific package versions are missing (e.g. while Utah is in early testing), render `N/A` or `unavailable` badges.
- **Build safety:** Pipeline scripts must never exit non-zero or throw unhandled exceptions during build, adhering to repo rules.

---

## 5. Verification & Testing

- Unit tests:
  - `node --test scripts/fetch-github-images.test.js`
  - `node --test scripts/fetch-github-driver-versions.test.js`
  - `node --test scripts/fetch-github-sbom.test.js`
- Lint & Types:
  - `npm run typecheck`
  - `npm run lint`
- Full test suite:
  - `npm test`
