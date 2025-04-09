---
title: Analytics
slug: /analytics
---

Bluefin is a high performance predator, the team believes in the importance of instrumentation and telemetry as a means to improve software. However that information must be privacy respecting via an open process so that we can verify what information is being donated. 

> Data, for me, is the foundation of F1. There's no human judgment involved. You've got to get your foundation right in data.
>
> -- [James Vowles](https://www.youtube.com/watch?v=nYzwvTSffiY&t=1025s)

## Fedora Countme Statistics

<img src="https://raw.githubusercontent.com/ublue-os/countme/refs/heads/main/growth_bluefins.svg" alt="Bluefin's CountMe Stats" decoding="async" loading="lazy" width="1280" height="720" />

:::tip

ARM builds are included in Bluefin LTS

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
