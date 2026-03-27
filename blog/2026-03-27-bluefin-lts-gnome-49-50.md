---
title: "Bluefin LTS: Now with GNOME 49 and 50"
authors: [castrojo, hanthor]
tags: [lts, announcements, beta]
---

The time has come. Thanks to [@hanthor](https://github.com/hanthor) not only do we get GNOME 49, we get GNOME 50 too! Achillobator can be fast!

### Call for Testing

We've got fancy new testing branches so feel free to help with testing! 

## Help fix this madness

Adding a -testing to your image name (via bootc status) should do it. So instead of `bluefin:lts` it's `bluefin:lts-testing`, and so on.

| Group | Tags |
|---|---|
| **Testing** | `lts-testing` `lts-testing-hwe` `lts-testing-amd64` `lts-testing-arm64` |
| **Testing (GNOME 50)** | `lts-testing-50` `lts-testing-50-amd64` `lts-testing-50-arm64` `lts-hwe-testing-50` `lts-hwe-testing-50-amd64` `lts-hwe-testing-50-arm64` |

### We need one more legend. 

Huge thanks to [@hanthor](https://github.com/hanthor) on this one, and if you're as annoyed as I am with those manual branch names you can help just add a toggle to the [rebase helper](https://github.com/projectbluefin/common/issues/211) so that we can just have this be a nice testing switch!
