---
title: "Upcoming changes to Homebrew and CLI behavior"
slug: upcoming-homebrew-cli-changes
authors: castrojo
tags: [homebrew, development, cli]
---

We hope that you're enjoying the holidays! We're making some important changes to how Homebrew and command-line tools work in Bluefin. These changes will land in this Tuesday's weekly build.

## Homebrew

Homebrew's path will now be placed _after_ the system path, this will cause `brew doctor` to complain but we feel that this will lead to a cleaner experience overall. This is working fine for lots of us so we'll see how many spacebar heaters we break with this one, heh. This change is already on the daily builds if you're using one of them.

## Bluefin CLI

Atuin's been causing too many issues for us, so we've elected to turn it off by default so that users can enjoy the rest of `bluefin-cli`. We will investigate a nicer atuin integration in the future once we have time to investigate a cleaner solution.

## More updates coming

We will be publishing a large year-in-review update next week that will cover much more details, but we wanted to give you a heads up as soon as these land as they are behavioral changes. 
