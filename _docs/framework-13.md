---
layout: page
title: Installing Bluefin on a Framework 13
permalink: framework-13
---

1. Start by downloading the Framework Laptop image of [Project Bluefin](https://projectbluefin.io/). Make sure you select Intel or AMD depending on the mainboard in your device:

![image|690x324](upload://9Eq5wxkISTHJXEJkepfBR4H8F2e.png)

1. **Create a USB stick** using [Fedora Media Writer](https://docs.fedoraproject.org/en-US/fedora/latest/preparing-boot-media/#_on_windows) ([Windows](https://fedoraproject.org/fmw/FedoraMediaWriter-win32-latest.exe) or [Mac](https://fedoraproject.org/fmw/FedoraMediaWriter-osx-latest.dmg) or [Linux](https://flathub.org/apps/org.fedoraproject.MediaWriter))

  * Insert your USB drive (8GB or larger). Note that it will be reformatted, so make sure you are ok with erasing any data that is on it.
  * After installing Fedora Media Writer, run it. Choose Select .iso file, browse to bluefin-gts.iso and select it.
* Click the Write button.
 * Once the USB drive creation is complete, you can click Finish, close Fedora Media Writer, eject your USB drive.

1. **Booting to the Bluefin USB**

* Insert the USB drive into your powered off Framework Laptop 13, and then power on. If you have an existing OS installed on the Storage drive in your laptop, immediately after the power light comes on begin rapidly tapping (continuously ) the F12 key - you must begin tapping well before you see the Framework logo.
* Select Linpus lite (General UDisk) with your arrow keys. Enter key.
* Next select Install Bluefin. Hit the enter key.
* Select the keyboard language you'd like to use. On the next screen, click on the Installation Destination button to choose the disk.
* If there is an OS already installed on the target drive, you'll need to follow the guided steps to delete the existing partitions. 
* Click Finish Installation and then reboot into your new Bluefin install!

![boot1|592x444](upload://6Zt8cOSmHmTUKeAn69u2H6zH8E9.jpeg)
![1|690x430](upload://zxGl2UvATiu1XP04zoguUpp4tID.jpeg)
![2|690x430](upload://kb4sIlMdCz8SSj7tBJRP8u85iTl.jpeg)
![3|690x430](upload://wtnK8jYUmuyiVxxMkvLN1tw6Wtv.png)
![4|690x430](upload://eGYToO8sfECvlzAyCgWm8JRUH3D.png)
![5|690x430](upload://kun8dJOOUEYPiccTVWmQTRAwkO9.jpeg)
![6|690x431](upload://zIVUqWEBsuq5fgjR5tX5xu394OK.jpeg)
![10|690x431](upload://8OkQbsD08ucf4Y20mKoXnhDmG5N.jpeg)
![11|690x431](upload://asAygXqEZuKo94kq12Sp72td4k6.jpeg)