---
title: Framework 16
author: Matt Hartley
slug: /framework-16
---

1. Download the Framework Laptop image of [Project Bluefin](https://projectbluefin.io/). Make sure you select Intel or AMD depending on the mainboard in your device:

![1f55f5cddf04cfb7c1041eaf8f81a382f7797cc8](https://github.com/user-attachments/assets/b1a36424-6427-4c3e-a25e-dad8ab6fce8f)

2. **Create a USB stick** using [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_on_windows) ([Windows](https://fedoraproject.org/fmw/FedoraMediaWriter-win32-latest.exe) or [Mac](https://fedoraproject.org/fmw/FedoraMediaWriter-osx-latest.dmg) or [Linux](https://flathub.org/apps/org.fedoraproject.MediaWriter))

- Insert your USB drive (8GB or larger). Note that it will be reformatted, so make sure you are ok with erasing any data that is on it.
- After installing Fedora Media Writer, run it. Choose Select .iso file, browse to bluefin-gts.iso and select it.
- Click the Write button.
- Once the USB drive creation is complete, you can click Finish, close Fedora Media Writer, eject your USB drive.

3. **Linux Audio Compatibility**

- Before we begin the installation process with the Live USB, let's make sure you have your Linux Audio Compatibility set to Linux in the BIOS.

  - Power on the laptop, repeatedly tapping F2 in order to get into the BIOS. Note: If you're having trouble with this, try again, holding down the Fn key while rapidly tapping F2.
  - In BIOS mode, arrow key over to Setup Utility. Press the enter key. Arrow down to Advanced. Then arrow right, then arrow down to Linux Audio Compatibility. Press enter.
  - A new box for Linux Audio Compatibility will appear, arrow to Linux, then press enter. Now press F10 key to reboot.
  - Now we don't have an OS installed yet. So the reboot won't get us to a running operating system and we fully expect to see an error to this point. Press the power button to shutdown.

![audio1|592x444](upload://ljcQsFwbZxGitNcmd709Yyc6Ebt.jpeg) https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/9/95597a0cd918056ddcb1795563e8b8af8bd64237.jpeg
![audio2|592x444](upload://A1kiX4zZ71b24avCpqhGx38sfb9.jpeg) https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/f/fc74adc4a5f272f590359d13bb076d99e696176f.jpeg

4. **Booting to the Bluefin USB**

- Insert the USB drive into your powered off Framework Laptop 16, and then power on. If you have an existing OS installed on the Storage drive in your laptop, immediately after the power light comes on begin rapidly tapping (continuously ) the F12 key - you must begin tapping well before you see the Framework logo.
- Select Linpus lite (General UDisk) with your arrow keys. Enter key.
- Next select Install Bluefin. Hit the enter key.
- Select the keyboard language you'd like to use. On the next screen, click on the Installation Destination button to choose the disk.
- If there is an OS already installed on the target drive, you'll need to follow the guided steps to delete the existing partitions.
- Click Finish Installation and then reboot into your new Bluefin install!

![boot1](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/3/30ffe07e3b4fe394aaad6e11e862d42f894048b1.jpeg)

![1](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/optimized/2X/f/f91ad07482c526bfa3af0af8a3a0224a3455bf93_2_690x430.jpeg)

![2](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/8/8d6be23be14f40335a5cf7126ba6a2a831666ec7.jpeg)

![3](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/e/e397dc21974f924fd59e23b19a68c497b1525afd.png)

![4](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/6/66fa43fe0c188b4e8b656e29502d1293cfc5df7d.png)

![5](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/8/8f9a6cd5d75bc4ecc2ad60e0e466596a1ce488d5.jpeg)

![6](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/f/fa60672f8cf1cee3934430290a07c16e94dbe242.jpeg)

![7](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/3/3dc208b640503f2bd0cb5c0075745250a05c31ef.jpeg)

![8](https://canada1.discourse-cdn.com/free1/uploads/univeral_blue/original/2X/4/4951129c62cc71d6d35ea339b56580ec0cbcc456.jpeg)
