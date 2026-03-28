---
title: "Bluefin LTS: Now with GNOME 49 and 50"
authors: [castrojo]
tags: [lts, announcements, beta]
---

The time has come. Thanks to [@hanthor](https://github.com/hanthor) not only do we get GNOME 49, we get GNOME 50 too! Achillobator can be fast!

### Call for Testing

We've got fancy new testing branches so feel free to help out. I know it's tempting to go right to 50 but if you could give 49 a shakedown on your way there it would really help. We're also wondering when the best time to land 50 would be. Do we wait until Fall to kinda get the -1 feel GTS had or do we pick a happy spot in the summer? Leave your feedback below. 

### Help fix the matrix of madness

Find your image with a `sudo bootc status` and you basically adding a `-testing` to your image name. So instead of `bluefin:lts` it's `bluefin:lts-testing`, and so on.

| Group | Tags |
|---|---|
| **Testing** | `lts-testing` `lts-testing-hwe` `lts-testing-amd64` `lts-testing-arm64` |
| **Testing (GNOME 50)** | `lts-testing-50` `lts-testing-50-amd64` `lts-testing-50-arm64` `lts-hwe-testing-50` `lts-hwe-testing-50-amd64` `lts-hwe-testing-50-arm64` |

### We need one more legend. 

Huge thanks to [@hanthor](https://github.com/hanthor) on this one, and if you're as annoyed as I am with those manual branch names you can help just add a toggle to the [rebase helper](https://github.com/projectbluefin/common/issues/211) so that we can just have this be a nice testing switch! Once we get that going and add a testing branch to `bluefin:stable` we'll have a nice easy way for people to opt in and out of testing. Good luck, have fun!
