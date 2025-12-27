---
title: "Upcoming changes to Homebrew and CLI behavior"
slug: upcoming-homebrew-cli-changes
authors: castrojo
tags: [announcements, homebrew, development]
---

We hope that you're enjoying the holidays! We're making some important changes to how Homebrew and command-line tools work in Bluefin. These changes will land in this Tuesday's weekly build.

## Homebrew

Homebrew's path will now be placed _after_ the system path. This will cause `brew doctor` to complain, but we feel that this will lead to a cleaner experience overall. This has been working well in testing, and the change is already on the daily builds if you're using one of them.

## Bluefin CLI

Atuin has been causing some issues, so we've disabled it by default to ensure a stable experience with `bluefin-cli`. We plan to investigate a better integration for Atuin in the future.

## More updates coming

We will be publishing a large year-in-review update next week that will cover these topics in much more detail, but we wanted to give you a heads-up on these behavioral changes before they land. In the meantime, we've set up [todo.projectbluefin.io](https://todo.projectbluefin.io) for you to follow along with the major changes coming in Bluefin. Thanks!
