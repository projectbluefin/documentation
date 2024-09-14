---
layout: page
title: Frequently Asked Questions
permalink: FAQ
---

The [general FAQ](https://projectbluefin.io/#scene-faq) on the website covers some of the most common questions. This section containers more specific questions: 

#  What about codecs?

Everything you need is included.

# How is this different from Fedora Silverblue?

Other than the visual differences, and codecs, there are some other key differences between Bluefin and Fedora Silverblue from a usage perspective:

- Bluefin takes a [greenfield approach](https://en.wikipedia.org/wiki/Greenfield_project) to Linux applications by defaulting to Flathub and `brew` by default
- Bluefin doesn't recommend using Toolbx - it instead focuses on [devcontainers](bluefin-dx#the-cloud-native-development-approach) for declarative containerized development. 
- Bluefin *tries* to remove the need for the user to use `rpm-ostree` or `bootc` directly
- Bluefin focuses on automation of OS services and upgrades instead of user interaction

# Who is this for? 

We **strongly** believe that new users to Linux should be introduced by via atomic image and not the traditional desktop. It is clear to us that this is a generational shift. We're purposely here to help existing users bury the past and move on to something more useful than wrestling with their operating system. One of the co-creators of Bluefin, using his experience from helping launch askubuntu.com, uses this as the reason for starting the project in the first place: 

![image](https://github.com/user-attachments/assets/6165e0e3-b60b-4bd1-82a8-b2fdd0595933)

Why spend decades documenting workarounds when you can just remove the problem entirely! Check out [Jorge Castro's blog](https://www.ypsidanger.com/) for years of back story on our quest to improve the desktop. 

## But old docs are still valuable!

![image](https://imgs.xkcd.com/comics/wisdom_of_the_ancients.png)

Are they though? We believe in automating as much as possible, better to fix the problem than have to document it. Just document the new stuff, which, if we're doing our job right is mostly upstream documentation anyway. 

These days Linux is more generalized than ever before, it's one of the reasons we believe the old model of Linux distribution just doesn't work on client-focused Linux desktops. We're here to help get that out of dated stuff and put it in a museum. Where it rightfully belongs, an entire epoch of evolution of our desktops. This is like moving from the Jurassic to the Cretaceous. An important but vital part of our history, but it's time to upgrade to a new model.

Bluefin users continually use the Arch wiki for just about everything anyway, just like everyone else. We just choose to consume it differently. The docs are purposely mostly pointers to documentation of the things that we ship. And then documentation that should take only 15 minutes to consume. This is why we are passionate about the whole "We are not a distribution" thing. We are trying to become as invisible as possible. Arch wiki, flatpak docs, brew docs, distrobox docs, and whatever container stack you use, including, all the traditional package managers in a container. This is your next mission. Congratulations, you've complete the Linux starter dungeon!

## My friends make fun of me because they think this is a fad or a toy like a chromebook, what do I tell them? 

They probably make fun of terms like "cloud native" too! Universal Blue images like Bluefin are designed by infrastructure experts who have decades of combined Linux experience. We are purposely funneling the expertise of world-leading experts in Linux, open source, and the things that the modern world _depend on_. By catering to this audience we know we can help make _fundamental improvements_ to the Linux desktop by bringing in experts who can help with the pipeline. 

## What is it with the Cloud Native Stuff Anyway? 

We reuse the same technology that is well funded due to its very nature. You can learn all about Cloud Native here at [cncf.io](https://www.cncf.io/). Our summary of that is, **Linux geeks built empires**, let's use all that stuff to make the Linux desktop better. We want the Linux desktop to be _peers_ with cloud native, and that means we need to make a generational shift in how we consume Linux desktops. 

There is also great economic benefit. `podman` is a great tool for enthusiasts but also a highly valuable one that is part of a portfolio of Red Hat products that people pay good money for. We feel that this is a great way for a community of enthusiasts to have a positive relationship with fellow open source community members that work for companies. And it's not just Red Hat, we have excellent working relationships with Linux teams at Microsoft, Canonical, SUSE, Chainguard, Equinix, Amazon, Google, you name it. Not in any official capacity, but the bond between Linux desktop nerds crosses all affiliations. 

Containers have been in Linux for over a decade, and gave birth to an entire multi-billion dollar industry. There's plenty of people who don't like containers, but that's fine, we're not taking your old distro away. It's all still Linux, it's a huge world. We consider this specific part of the kernel and the ecosystem that was built around it to be a prerequisite for true mastery of Linux, which we strive for. 

And that mastery is important for those users that want to learn the technology. Because the cloud native industry and all of open source in general is in dire need of more maintainers. Good ones. The ones that spent the first part of their journey learning the tools that are most important to learn. That's why it's economical for companies, and for users as well. Enthusiasts getting things for free and then providing direct feedback for things that will be valuable products is a great partnership, and plenty of communities are doing it right, the Linux desktop can be one of them.  

Learning this skillset will give you the skills you need to get a job in this industry if you want. We need you!

# But this isn't ready, Flatpaks have annoyed me for a bunch of reasons, and I like my Linux the way it is.

We **strongly** believe that there is no mass market future for application distribution for traditional packages. The majority of people who have tried Linux have overwhelmingly rejected the old model. We also purposely [do not cater to existing Linux users](https://www.youtube.com/watch?v=4CyWH6jx2pE), we choose to put that toil behind us. 

# Starship is not for me, how do I disable it?

You can remove or comment the line below in `/etc/bashrc` to restore the default prompt.

```bash
eval "$(starship init bash)"
```

# How do I get my GNOME back to normal Fedora defaults?

You can turn off the Dash to Dock and appindicator extensions to get a more stock Fedora experience by following [these instructions](administration#managing-extensions).

We set the default dconf keys in `/etc/dconf/db/local`, removing those keys and updating the database will take you back to the fedora default:

```bash
sudo rm -f /etc/dconf/db/local.d/01-ublue
sudo dconf update
```

# Should I trust you?

This is all hosted, built, signed, and pushed on GitHub. As far as if I'm a trustable fellow, here's my [bio](https://www.ypsidanger.com/about/). If you've made it this far, then welcome to the future! :smile:
