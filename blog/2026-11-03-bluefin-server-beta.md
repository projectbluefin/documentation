---
title: "Bluefin Server 26.11 (Beta)"
slug: bluefin-server-beta
authors: [jeefy]
tags: [server, announcements]
description: "Announcing the first beta Bluefin Server, the premier cloud native OS built on Freedesktop SDK libraries."

---

![banner](https://github.com/user-attachments/assets/f42ef8f7-7ec8-43b0-982d-c294dda7244b)

We'll be announcing the fall releases of Bluefin over the next coming weeks, first up is Bluefin Server! 

Bluefin Server is built from the bottom up to be the premier cloud native OS built on Freedesktop SDK libraries. It is built using the same tools as Dakota, giving us an entire holistic set of Bluefins for server and cloud use cases. The idea is simple, bring the best of cloud native to the home. We take inspiration from CoreOS and Flatcar Linux. Then we move on up to Kubernetes:

- [Homepage](https://github.com/projectbluefin/server/)
- [Download it here](https://github.com/projectbluefin/server/releases)
- [Documentation](https://docs.projectbluefin.io/server/)

In this case we're skipping bootc entirely and going pure DDI - this is [buildstream's real super power](https://buildstream.apache.org/) for us, the ability to have either bootc or DDI artifacts from the same source of truth. Everything is in the infrastructure and fully automated. We feel that is a good representation of the [UAPI Group's](https://uapi-group.org/) intent for a modern Linux. Bluefin Server is essentially complete, including Nvidia and ZFS support. If you need a good foundation to a homelab it's basically finished. It covers two use cases, and options in the install menu:

- Fully automated declarative Kubernetes deployments
- Home server "pet" deployments

![server boot screen](https://github.com/user-attachments/assets/09519410-df33-4f09-a171-848ad405874a)

## Kubernetes Support
#### Jeefy's Home Lab

The features are included in the boot menu during installation. Here are the Kubernetes options: 

| Boot Menu Option | Best For | Included Software | First Boot Login |
|---|---|---|---|
| **Bluefin Server** *(Default)* | Minimal servers and automated deployments | Base OS only (read-only system root, systemd, SSH). No container engines or Kubernetes. | Prompts on the local console (tty1) to set the root password. |
| **Homelab: Control Plane** | Primary node for a multi-machine Kubernetes cluster | Base OS + kubeadm, containerd, Argo Workflows, and a KubeStellar dashboard | Prompts on tty1 for a root password. Prints the cluster join passphrase on the screen. |
| **Homelab: Node** | Worker nodes joining an existing Homelab cluster | Base OS + kubeadm, containerd, and auto-join service. | Prompts for the cluster join passphrase during install; prompts on tty1 for a root password on first boot. |

### Why diskless? 
#### Why you'd want Jeefy's setup

The worker nodes have an option to run in diskless mode. That means the OS itself is just in the UEFI partition - there is no installed OS, the "upgrade" is just a reboot, the OS itself is loaded in RAM. 

- First: everything is completely stateless. A reboot wipes the entire slate clean. Your cluster state drives everything.
- Second: Patches are a reboot. The way this homelab is set up is using [booty](https://github.com/jeefy/booty) to manage iPXE-booting nodes, and [kured](https://github.com/kubereboot/kured) to drain nodes when a reboot is signaled (via Booty)
- Third: Everything but the control-plane is automated. 

It's not for everyone, but it's a fantastic exercise in "everything is ephemeral, even infra"

## Homeserver Support
#### Jorge's Home Lab

This mode is more useful for people who are coming from legacy setups and want to learn Kubernetes with airbags. Sometimes you just need a shell on a box. It offers Homebrew so you can just `brew install tmux` and setup a simple server without all of the complexity. Note that this profile is unfinished and we're still unhappy with the brew setup, but it's enough to get you going. 

| Boot Menu Option | Best For | Included Software | First Boot Login |
|---|---|---|---|
| **Bluefin Home Server** | Standalone personal server running containers and tools | Base OS + Podman (default) + Homebrew inside an isolated nspawn system container. Root stays locked. | Prompts on the local console to create a regular user account and password (or accepts an SSH key via credential). |

All modes use the systemd installer, which takes about 2 minutes to complete: 

![installer](https://github.com/user-attachments/assets/5711f1f2-4926-4ca4-85fb-bf0516e103a6)


## Example Commands

Check out [the documentation](https://docs.projectbluefin.io/server/) for instructions on how to use Bluefin Server. You can use the `updatectl` commands to browse around and enable what you want. 

```bash
updatectl features                  # what the image offers
sudo updatectl enable --now zfs     # updates carry it, and download it now
sudo systemd-sysext refresh         # merge the new image into /usr
```

... and so on. 

## Future Work

This Bluefin is specifically minimal and provided as is as a basic lego block. We look forward to seeing what you build with it! 

The homeserver profile still doesn't do the magical KubeStellar setup we want, but we'll keep working on it.
