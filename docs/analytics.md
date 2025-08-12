---
title: Analytics
slug: /analytics
---

# User Metrics

Bluefin is a high performance predator, the team believes in the importance of instrumentation and telemetry as a means to improve software. However that information must be privacy respecting via an open process so that we can verify what information is being donated.

> Data, for me, is the foundation of F1. There's no human judgment involved. You've got to get your foundation right in data.
>
> -- [James Vowles](https://www.youtube.com/watch?v=nYzwvTSffiY&t=1025s)

## Fedora Countme Statistics

<img src="https://raw.githubusercontent.com/ublue-os/countme/refs/heads/main/growth_bluefins.svg" alt="Bluefin's CountMe Stats" decoding="async" loading="lazy" width="1280" height="720" />

:::info[Note on ARM builds]

ARM devices are included in Bluefin LTS since that is the only Bluefin aarch64 image that currenty exists.

:::

The Fedora countme service is on by default in Fedora, and we inherit that behavior:

- [countme](https://github.com/wgwoods/fedora-countme-data)
- [How to turn it off](https://coreos.github.io/rpm-ostree/countme/)

## Homebrew

Homebrew's analytics are on by default. To turn them off:

```
brew analytics off
```

Check the [homebrew documentation](https://docs.brew.sh/Analytics) for more information. You can also checkout the [operating system rankings](https://formulae.brew.sh/analytics/os-version/30d/) as a fun competition.

# Contributor Metrics

Since Bluefin is an [Universal Blue](https://universal-blue.org) image, it leverages the shared maintenance of a larger community. Note that builds are automated, long periods of inactivity are normal.

**Bluefin**

![Alt](https://repobeats.axiom.co/api/embed/40b85b252bf6ea25eb90539d1adcea013ccae69a.svg "Repobeats analytics image")

**Bluefin LTS**

![Alt](https://repobeats.axiom.co/api/embed/3e29c59ccd003fe1939ce0bdfccdee2b14203541.svg "Repobeats analytics image")

**Shared Packages**

![Alt](https://repobeats.axiom.co/api/embed/8bde34be4a2fcd7f506672742563f330d0b6b240.svg "Repobeats analytics image")

![pic](https://next.ossinsight.io/widgets/official/compose-org-activity-active-ranking/thumbnail.png?activity=participants&owner_id=120078124&period=past_28_days&image_size=4x3)

<a href="https://next.ossinsight.io/widgets/official/compose-org-activity-active-ranking?activity=participants&owner_id=120078124&period=past_28_days" target="_blank" style="display: block" align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://next.ossinsight.io/widgets/official/compose-org-activity-active-ranking/thumbnail.png?activity=participants&owner_id=120078124&period=past_28_days&image_size=4x3&color_scheme=dark" width="273" height="auto">
    <img alt="Active participants of ublue-os" src="https://next.ossinsight.io/widgets/official/compose-org-activity-active-ranking/thumbnail.png?activity=participants&owner_id=120078124&period=past_28_days&image_size=4x3&color_scheme=light" width="273" height="auto">
  </picture>
</a>
