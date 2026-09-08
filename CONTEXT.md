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
