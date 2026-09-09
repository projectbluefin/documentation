# Documentation

This context defines the public reporting language used by the documentation
site's automated factory reports and release changelogs.

## Reporting

**Monthly Factory Report**:
An immutable, month-labeled public snapshot of factory activity, delivery
signals, participation, and ecosystem measurements.
_Avoid_: dashboard, changelog, live report

**Report Snapshot**:
The complete data captured for one Monthly Factory Report, including its source
windows and unavailable-source reasons.
_Avoid_: live data, current state

**Report Portfolio**:
The explicitly configured set of first-party Project Bluefin repositories whose
public activity is eligible for a Monthly Factory Report.
_Avoid_: ecosystem, all repositories

**Experimental Portfolio**:
The separately identified part of the Report Portfolio for pre-release or
experimental factory work. Its signals are never aggregated as stable delivery.
_Avoid_: stable portfolio, production portfolio

**Publishing Lane**:
A public automation path that produces or promotes a named Bluefin variant.
_Avoid_: repository, changelog

## Release communication

**Release Changelog**:
Release-scoped notes and package-version information sourced from a published
GitHub Release. It remains distinct from a Monthly Factory Report.
_Avoid_: monthly report, activity report

**Ecosystem Metric**:
A public, externally sourced measurement that supplies context for a Report
Snapshot while retaining its original measurement window and methodology.
_Avoid_: factory metric, Countme telemetry

## Countme

**Countme**:
The privacy-preserving weekly active-device estimation mechanism using coarse
installation-age buckets and weekly client pings.
_Avoid_: Telemetry, tracking, user analytics

**CountMe Worker**:
The Cloudflare Worker deployed at `countme.projectbluefin.io` that proxies
canonical countme charts/badges and ingests client `/metalink` pings.
_Avoid_: Telemetry server, collector daemon

**CountMe Client**:
The scheduled systemd service and timer running on Project Bluefin systems
(`bluefin`, `bluefin-lts`, `dakota`) via `projectbluefin/common` that computes
installation age and transmits anonymous weekly pings.
_Avoid_: Telemetry agent, tracking daemon

**Installation Age Bucket**:
A coarse bucket (1: first week, 2: 2–4 weeks, 3: 5–24 weeks, 4: >24 weeks)
matching Fedora mirrors-countme specifications to estimate cohort retention
without unique host tracking.
_Avoid_: User tenure, retention tracking, system age fingerprint

**Opt-out Marker**:
A filesystem presence flag (`/etc/projectbluefin/countme/disabled` or
`/etc/dakota-countme/disabled`) checked by systemd units and client scripts to
disable countme reporting.
_Avoid_: Kill switch, telemetry bypass
