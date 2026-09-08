# 0006. Multi-client countme reporting via common services and countme.projectbluefin.io

- **Status:** Accepted
- **Date:** 2026-09-07
- **Deciders:** @castrojo

## Context

Project Bluefin clients currently have fragmented countme reporting:

1. **Bluefin (standard):** Inherits Fedora's native DNF countme configuration (`countme=1` in `/etc/yum.repos.d/fedora.repo`) sending weekly metalink queries to `mirrors.fedoraproject.org`.
2. **Bluefin LTS:** Built on CentOS Stream 10 where standard rpm-ostree countme is broken (coreos/rpm-ostree#5464); it runs a custom `bluefin-lts-countme.service` (`dnf makecache`) reaching Fedora infrastructure via EPEL mirrors. Upstream mirrors undercount EPEL clients.
3. **Dakota:** Built on GNOME OS bootc with BuildStream, possessing no DNF or rpm-ostree packages. PR `projectbluefin/common#807` created a standalone `dakota-countme` service targeting `countme.projectbluefin.io`.

Relying exclusively on Fedora infrastructure leaves Dakota unmeasurable, undercounts LTS systems, and delays metrics by the weekly upstream batch processing cycle. We require all Project Bluefin clients (`bluefin`, `bluefin-lts`, and `dakota`) to report directly via `projectbluefin/common` services to `countme.projectbluefin.io` in addition to upstream Fedora and ublue reporting.

## Decision

1. **Unified Client Service in `projectbluefin/common`:**
   Deploy a shared systemd service (`bluefin-countme.service` / `bluefin-countme.timer`) and helper script (`/usr/libexec/bluefin-countme`) in `system_files/shared/` across all images.
   - **Trigger:** Scheduled weekly with `RandomizedDelaySec=12h` and `Persistent=true`.
   - **Isolation:** Runs under systemd `DynamicUser=yes` with `StateDirectory=bluefin-countme`.
   - **Throttling:** Computes 7-day rate-limiting locally via `/var/lib/bluefin-countme/lastrun`.
   - **Cohort estimation:** Determines coarse Fedora-style installation age buckets (1: first week, 2: 2–4 weeks, 3: 5–24 weeks, 4: >24 weeks) using an installation timestamp stored in `/var/lib/bluefin-countme/epoch`.
   - **Metadata extraction:** Reads `/usr/share/ublue-os/image-info.json` for `image-name`, `image-flavor`, `image-tag`, and `/etc/os-release` for version.
   - **Target:** Sends an empty GET request to `https://countme.projectbluefin.io/metalink?repo=${IMAGE_NAME}&tag=${IMAGE_TAG}&flavor=${IMAGE_FLAVOR}&arch=${ARCH}&countme=${BUCKET}`.
   - **Privacy:** Transmits NO machine-id, persistent token, hostname, or personal identifier.
   - **Opt-out:** Honored if `/etc/projectbluefin/countme/disabled` (or legacy `/etc/dakota-countme/disabled`) exists.

2. **Server Ingestion on `countme.projectbluefin.io`:**
   The Cloudflare Worker (`workers/countme-proxy/index.mjs`) receives `/metalink` GET requests from all supported client repos (`bluefin`, `bluefin-lts`, `dakota`), returning `200 countme accepted` with `cache-control: no-store`.

3. **Coexistence with Upstream:**
   Existing Fedora and EPEL repo queries remain untouched. The `common` countme service runs alongside upstream reporting to provide first-party visibility without breaking upstream Fedora countme contribution.

## Scope

**In scope:**

- Architecture and specification for multi-client countme reporting across `bluefin`, `bluefin-lts`, and `dakota`.
- Expanding test coverage in `scripts/countme-worker.test.js` to validate `bluefin`, `bluefin-lts`, and `dakota` metalink requests.
- Documenting countme client behavior and opt-out procedures in `docs/analytics.mdx`.
- Updating `docs/skills/cloudflare-workers.md` with `/metalink` proxy contracts.
- Generalizing PR `projectbluefin/common#807` client script and unit definitions for all projectbluefin client images.

**Out of scope:**

- Modifying `ublue-os/*` upstream repositories.
- Disabling upstream Fedora repository countme flags.

## Consequences

- All Project Bluefin variants gain consistent, reliable, first-party countme reporting.
- Dakota systems become measurable alongside Bluefin and Bluefin LTS.
- Strict client-side rate limiting and coarse age buckets ensure high privacy preservation without tracking individual machines.
- Users have a documented, single filesystem opt-out mechanism across all images.

## Alternatives considered

- **Per-image countme services:** Creating separate timers/scripts for Bluefin, Bluefin LTS, and Dakota across distinct repositories. Rejected: causes configuration drift, duplicated maintenance, and testing overhead across the factory.
- **Reporting via machine-id HMAC hash:** Computing a weekly salted hash on the client and counting unique hashes server-side. Rejected: transmitting machine-id derivatives increases privacy exposure and raised reviewer objections; client-side throttling with age buckets achieves cohort estimation with zero identifying payload.
- **Replacing Fedora countme entirely:** Turning off upstream Fedora countme and relying solely on first-party service. Rejected: Project Bluefin relies on Fedora and desires continued participation in upstream community metrics.
