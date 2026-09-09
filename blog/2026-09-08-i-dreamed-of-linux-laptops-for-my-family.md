---
title: "I Dreamed of Linux Laptops for My Family"
slug: i-dreamed-of-linux-laptops-for-my-family
authors: sherman
tags: [community]
date: 2026-09-08
image: /img/blog/2026-09-08-i-dreamed-of-linux-laptops-for-my-family/benjamin-sherman.jpg
---

[Original post](https://bsherman.dev/field-notes/i-dreamed-of-linux-laptops-for-my-family)

A belated happy five years to Universal Blue, and how wanting laptops my family could actually live with turned me into an open source maintainer.

This is my personal site. Opinions here are my own and don't necessarily reflect those of Red Hat.

Maybe you saw that Universal Blue recently celebrated its five-year anniversary. [Aurora](https://docs.getaurora.dev/blog/universal-blue-five/), [Bazzite](https://universal-blue.discourse.group/t/bazzites-biggest-update-deck-44-has-launched-happy-birthday-to-universal-blue/12373), and [Bluefin](https://docs.projectbluefin.io/blog/five-years-of-bluefin/) (the OG) all marked it with posts of their own. I’m thankful to be a part of the team that’s done such great work. I’m usually content to just get things done in the background, but it’s high time I share some of my thoughts about this project and organization we call [Universal Blue](https://universal-blue.org/).

When Jorge Castro made that [initial commit](https://github.com/castrojo/ublue/tree/e0f113a98b98bb0782ecf9314e5348b60d7f2357) five years ago, he was doing different things than we do today. He was running Fedora Silverblue or openSUSE MicroOS, using various scripts to shape the installation into his dream. It was a beginning.

I was in a different, but similar place. I could see the day approaching when my kids were going to need laptops for school, and they already wanted to do more gaming. I didn’t love managing Windows even for myself and didn’t want to manage multiple installs, but multiple Linux installs weren’t much more exciting. I was experimenting to find a solution to make supporting my family’s laptops seem less like sysadmin work, to find something that would “just work” instead.

My GitHub and private Git server are littered with repos full of old dotfiles, configs, Ansible playbooks and shell scripts. I was determined to pre-configure and automate all the post-install Linux things. For me, this “perfect Linux laptop” idea was brewing in 2021. That’s probably when I started to get a solid base of Ansible to manage my family’s Linux systems.

Though I’ve consistently been using Linux on the server for 30 years, desktop use has been more intermittent. “The Year of the Linux Desktop” is almost a perennial joke, and laptops almost always meant more pain than a typical desktop PC. It’s been decades since I bought into the religious wars of macOS versus Windows versus Linux versus BSD. At some point, pragmatism set in. I don’t really care which OS you’re running, but maintaining a fleet of laptops for your family is still a pain, except perhaps if they are all Chromebooks.

In November 2022, I stumbled across a blog post and video by Jorge. He’d been writing (and talking) about immutable Linux OSes, and at that moment he was comparing [Fedora Silverblue and openSUSE’s MicroOS](https://www.ypsidanger.com/comparing-opensuse-microos-to-fedora-silverblue-37/). MicroOS caught my attention as something I might use to make my family’s laptops a little bit more reliable. It promised something like ChromeOS that could still function as a normal system. I found it intriguing, but there were enough rough edges that I just couldn’t switch off the Ansible-customized Ubuntu which had become the in-home standard.

In December 2022, Jorge posted something magical. Fedora had released an experimental feature for Silverblue and Kinoite: container-native rpm-ostree. It meant we could have a custom built operating system image, but built like any other Docker image. I’d been living and breathing Docker images. I’d been running Kubernetes at home. I’d packaged applications in Docker images for work and home. The promise of pre-built application images, running the same thing everywhere, was now available as a custom operating system! I could bake in customizations for my family, fixes for all the quirks that normally I had to fix after an installation, or whatever I wanted. Maybe most importantly, all of the package and upgrade conflicts which inevitably occurred for any package management system were no longer an issue.

:::note[Quote]

That whole class of problem would happen in CI, not on my laptop, certainly not on my wife’s or kids’ laptop!

:::

And NVIDIA, oh, NVIDIA: the greatest love/hate of any Linux user who’d chosen to use it. Powerful and wonderful when it works, but often a pain to get going: NVIDIA would get the same treatment.

Fun fact, I’d used both Fedora Silverblue and CoreOS before, but I found them too restrictive without a better way to customize the defaults to have a better overall user experience. It’s kind of crazy that this turned around so quickly once I could participate in building the OS image itself. Container-native truly opened the door wide for new contribution in this space. It certainly did for me!

This is where I stopped watching what Jorge was doing from afar and got involved.

The ublue-os GitHub org and a Discord server had both been created. I joined the chat and saw them working on a pre-built NVIDIA kmod. I had some of my own custom images going, but I jumped in to help with that NVIDIA kmod; I had a vested interest in making it work. My first official contribution was on [February 20, 2023](https://github.com/ublue-os/hwe/pull/47). It wasn’t much, but Universal Blue was (and still is) a welcoming community, and I quickly became involved in more and more code reviews and code contributions. Not even a month later, I’d forked Kyle Gospodnetich’s [serverblue](https://github.com/kylegospo/serverblue) repo into [uCore](https://projectucore.org/), with his blessing of course. By then Kyle was fully invested in [Bazzite](https://bazzite.gg/)!

The rest, as they say, is history! And frankly, most of the history is public record because all of our commits, issues, PRs and discussions are out in the open. It’s Open Source Software, after all. I found a passion for participating in the shared effort of building and maintaining our various Universal Blue projects; I stuck with it.

:::note[Quote]

One day I looked up and realized, “oh, I’m a maintainer.”

:::

Achieving that “status” was never a goal; rather, it was a natural progression. uCore became my primary Universal Blue project, and I’m practically its sole maintainer, though I’m also a core maintainer across all of Universal Blue, and a user of most of it. Working in the server space certainly matches my traditional interests, so I’m glad I can assist with the desktop projects but don’t need to carry that load alone.

Bluefin and Bazzite fulfilled the dream of Linux laptops that “just work.” Ansible ceased to be used for desktop/laptop management as the prebuilt images ([bOS](https://github.com/bsherman/bos), my lightly personalized version of Universal Blue images) became the new home standard. My boys got Dell laptops with NVIDIA cards which enabled some 3D gaming as well as school, and maintenance was minimal, since those failures now occur in CI and never make it to the laptops themselves. My wife and daughter got a matching pair of HP laptops with AMD integrated graphics, better battery life and still some light gaming ability.

:::note[Quote]

These systems just keep updating.

:::

Are there occasional hiccups? Yes. Is it massively easier to maintain than before, when every other update seemed to result in a broken NVIDIA kmod or some other issue? 100%! I confess the boys argued their way into Windows specifically to play a game which still doesn’t work on Linux with Proton, but they miss the Linux desktop and I think I’ll win them back soon.

There is another important thing. I want to say “thank you” to Jorge and Kyle. Each had their own dreams… Kyle’s vision was to bring the “just works” gaming experience of the Steam Deck to any desktop or handheld, while Jorge pushed for the “just works” experience of a Chromebook but with more power and flexibility. Kyle, Jorge and I worked and gamed together, and Kyle would sometimes join me and my boys for gaming sessions. I wasn’t always sure how to relate to Jorge’s ambitious goals, but he challenged me to think bigger. Beyond these two, a whole group of people came together as friends and teammates to support each other personally and technically as we built the various Universal Blue projects.

:::note[Quote]

This team has brought dreams to life.

:::

One of those dreams has been to get people jobs! Most of us did this work outside our day jobs. Eventually some folks set up sponsorship via GitHub, etc, and that’s been awesome to help offset the costs of development, but day jobs pay the bills. The community and network Jorge built here has been excellent in that regard. Contributors to Universal Blue at different career stages have found their way into new opportunities at several different software companies. I’m one of them. My fairly recent start at [Red Hat](https://www.redhat.com) is a great example. My previous years of experience were crucial, but learning specific technologies and Open Source methodologies with Universal Blue provided a direct path to what Red Hat needed. So when I say I’m thankful for this project, and for the opportunity to participate, I mean it. My Universal Blue experience had already been personally and technically rewarding, but finding a job in Open Source through this project experience was next level!

Thank you to everyone who has contributed to a Universal Blue project, however big or small! Thank you for all the users! This has been a great adventure, and in the best possible way, I don’t see an end in sight.
