---
title: "New Just and Bold Brew Improvements"
slug: new-just-and-bbrew
authors: castrojo
tags: [announcements]
---

Greetings guardians! 

A few minor updates today, you'll receive these updates either today or tomorrow depending on the build you're on. Our first is some updates to our usage of `just`. [Just](https://just.systems) is a task runner that we use to ship community aliases. Our justfiles are ancient, some going back to the beginning of the project. We are consolidating most parts of what you call "Bluefin" into a [common repository](https://github.com/projectbluefin/common). These are all mostly scripts, there's nothing distribution specific about them. 

We wanted to centralize this because keeping Bluefin and Bluefin LTS configs in sync is too problematic. In this manner we can make the Bluefin parts easily plop onto any image no matter what the image is. 

It also means we cleaned out some broken stuff, and are down to just 34 just recipes, which makes all of this sustainable, especially since we're sharing the maintenance with [Aurora](https://getaurora.dev). All the recipes now include confirmation dialogs and have been refined. I am glad we got this done because this part of Bluefin was really starting to show its age! Thanks to @tullilirockz for working on this! Thanks to @hanthor for implementing it in Bluefin LTS! Run `ujust` or `ujust --choose` to get started!

## Bold Brew and Brewfiles

We now have a nice way for the community [to contribute to Bluefin's Brewfiles](https://github.com/projectbluefin/common/tree/main/system_files/usr/share/ublue-os/homebrew).

We workshopped some ideas on how to make this nicer for users. We [approached bold-brew](https://github.com/Valkyrie00/bold-brew/issues/36) with the idea of presenting Brewfiles to users in a dedicated view. Vito was very accomodating and implemented the idea, kudos to him! Now let me show you how it works:

![bbrew](https://github.com/user-attachments/assets/6057cf26-e153-44d5-9695-e6a201d77951)

`ujust bbrew` is the entry point, we will generate a little menu for you for every Brewfile in Bluefin. So if we add more they just show up here. Then after you choose one `bbrew` will open up showing you that Brewfile. You can then select and choose what you want to install, or hit Ctrl-A to grab everything. 

## Bold Brew is to Homebrew what Bazaar is to Flathub

This is awesome because we can now curate app bundles of CLI tools to users. We're starting off with AI tools, k8s tools, and monospace fonts. Feel free to send PRs to these Brewfiles, since users can pick and choose we can ship the tools you depend on the most. You'll also notice some color improvements in `bbrew`, make sure you [check out the repo](https://github.com/Valkyrie00/bold-brew) and give them a star!

![bbrew wide](https://github.com/user-attachments/assets/0a8bb770-f3c7-43f1-a35b-b350da415c84)

## More Cloud Mumbo Jumbo

And lastly, we now have `ujust cncf`, which will show you all of the projects that are [part of the CNCF](https://landscape.cncf.io). Many of you work with these tools every day, the hope is to show you all of the cool things you can play with in cloud native!

![cncf](https://github.com/user-attachments/assets/1ee76144-c913-4449-a3cb-7ede1659b598)

## More Consistent Bluefin

Ultimately this consolidation of all of our config will lead to better Bluefins and has been a primary source of `parity` issues between Bluefin and Bluefin LTS. Bluefin continutes to actively shrink over time! 

We still have work to do, like the motd, bling, and all that other stuff but we'll keep you up to date!

## [Discussion](https://github.com/ublue-os/bluefin/discussions/3711)
