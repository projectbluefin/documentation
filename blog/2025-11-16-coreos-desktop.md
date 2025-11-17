---
title: "Streamling Bluefin Releases"
slug: unifying-bluefin
authors: castrojo
tags: [announcements]
---

This spring (2026) we are rolling `bluefin:gts` and `bluefin:latest` into `bluefin:stable` for one "Bluefin". No action will be required on your part, this will happen automatically. 

We're doing this for a few reasons:

- The value GTS provided is "older software works better". What it really means is "no one messed with this", changes still made in Bluefin affect this branch immediately. 
- `bluefin:latest` - this one an antipattern, you want to be able to pin something, and people make assumptions of what it means. We'll transparently move you to `bluefin:stable` too.

:::note[Where is F43 in `bluefin:stable`?]

The promotion of `bluefin:stable` is delayed until next week due to waiting for the ZFS module to catch up to Linux 6.17. This typically doesn't happen but we're monitoring the situation and will make the release next week or the week after, depending on the completion of the work.  

::: 

If you're new here there's no need to panic, `bluefin:gts` and `bluefin:stable` always share the same version twice a year for a few weeks. We're in that period now, they're both at Fedora 42. 

In the meantime let's pretend it's out so that we can continue to Bluefin's new model. The workflow looks like this currently: 

### Current Bluefin (November 2025)

|                      | `gts` (default) | `stable` or `stable-daily` | `latest`                   |
| -------------------- | --------------- | -------------------------- | -------------------------- |
| Fedora Version:      | Fedora -1       | Fedora Current version     | Fedora Current Version     |
| GNOME Version:       | 48              | 49                         | 49                         |
| Target User:         | Most users      | Enthusiasts                | Advanced users and testers |
| System Updates:      | Weekly          | Weekly or Daily            | Daily                      |
| Application Updates: | Twice a Day     | Twice a Day                | Twice a Day                |
| Kernel:              | Gated           | Gated                      | Ungated                    |

This has resulted in confusion, especially as Bluefin LTS has come up to speed. So starting in the Spring of 2026 we're moving to this layout: 

### Future Bluefin (November 2026)

|                      | `stable` (default) or `stable-daily` | `testing`               | `next`   |
| -------------------- | --------------- | -------------------------- | -------------------------- |
| Fedora Version:      | Fedora Current Version | CoreOS testing branch | CoreOS Next branch       |
| GNOME Version:       | 49              | 49                         | 49                         |
| Target User:         | Most users      | Testers                    | Developers                 |
| System Updates:      | Weekly and Daily | Daily and on-demand       | Daily and on-demand        |
| Application Updates: | Twice a Day     | Twice a Day                | Twice a Day                |
| Kernel:              | Gated           | Gated                      | Gated                      |

## Changes and Rationale

At first this looks like a rename, so let's go over the changes: 

- `bluefin:next` - all changes will land here first. We make no stability guarantees. It will build daily. This will not replace `bluefin:latest` because we will for sure break things in here. This will build at least daily and every time a change lands
- `bluefin:testing` - When changes in `:next` have been tested by at least one person they queue up to land in testing. We anticipate things to sit in here for a week or two at a minimum unless we need to fix a regression. This builds daily.
- `bluefin:stable` - This is effectively the current version of Fedora, except all changes going into this will have at least be vetted by the previous branches. We do NOT have this today. This is the goal.

If you are on `bluefin:latest` we will point you to `bluefin:stable-daily` so that you are still getting daily builds. We purposely are not moving you to `next` because that will be volatile. Both the `next` and `testing` branches will be opt in.

## Benefits

### For You

- Less confusion, you either download Bluefin or Bluefin LTS.
- Better testing in general as we add tests to each step before promotion
- TLDR: Everyone moves to `bluefin:stable` in the Spring, and those of you who want newer stuff can opt into `testing` and `next`

### For Us

- Testing workflow allows for super fast iteration and two stages of testing before hitting end users. This is the #1 reason to do all of this
- We no longer have to keep GTS bits around the rest of the org to support it, freeing up builder space and resources
- Better alignmed with Fedora CoreOS development

This does mean that we will no longer be shipping the stock Fedora kernel in any branch. We're fine with this since we prefer to keep all our users on a gated kernel. 

### Discussions and Questions



