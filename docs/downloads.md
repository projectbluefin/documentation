---
title: Downloads
slug: /downloads
---

:::warning[These are not ready]

These ISOs are experimental, please [report issues](https://github.com/ublue-os/titanoboa/issues) if you want to help!

:::

Here is a short [runbook](/installation) for the Bluefin installation process. Read the entirety of this documentation in order to ensure survival. (In case of a raptor attack).

## Status

There are currently two sets of installation media. One using the Anaconda installer, and one using the Readymade installer. We are currently defaulting to Anaconda and are experimenting with moving to Readymade in the future. The [website](https://projectbluefin.io) is the intended method for users to download Bluefin. The direct ISOs are linked below for convenience:

## Anaconda Installer Downloads

### Bluefin

The most current, based on the latest Fedora.\
📖 **[Read the documentation](/introduction)** to learn about features and differences.

| Version | Architecture | Download                                                                                                             | Checksum                                                                                       |
| ------- | ------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Bluefin | AMD/Intel    | [📥 bluefin-stable-x86_64.iso](https://download.projectbluefin.io/bluefin-stable-x86_64.iso)                         | [🔐 Verify](https://download.projectbluefin.io/bluefin-stable-x86_64.iso-CHECKSUM)             |
| Bluefin | Nvidia       | [📥 bluefin-nvidia-open-stable-x86_64.iso](https://download.projectbluefin.io/bluefin-nvidia-open-stable-x86_64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-nvidia-open-stable-x86_64.iso-CHECKSUM) |

### Bluefin GTS

The default experience for users, following the previous stable release of Fedora.\
📖 **[Read the documentation](/introduction)** to learn about features and differences.

| Version     | Architecture | Download                                                                                                       | Checksum                                                                                    |
| ----------- | ------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Bluefin GTS | AMD/Intel    | [📥 bluefin-gts-x86_64.iso](https://download.projectbluefin.io/bluefin-gts-x86_64.iso)                         | [🔐 Verify](https://download.projectbluefin.io/bluefin-gts-x86_64.iso-CHECKSUM)             |
| Bluefin GTS | Nvidia       | [📥 bluefin-nvidia-open-gts-x86_64.iso](https://download.projectbluefin.io/bluefin-nvidia-open-gts-x86_64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-nvidia-open-gts-x86_64.iso-CHECKSUM) |

### Bluefin LTS

The long term support experience.\
📖 **[Read the documentation](/lts)** to learn about features and differences.

| Version            | Architecture  | Download                                                                                 | Checksum                                                                         |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Bluefin LTS (Beta) | AMD/Intel     | [📥 bluefin-lts-x86_64.iso](https://download.projectbluefin.io/bluefin-lts-x86_64.iso)   | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-x86_64.iso-CHECKSUM)  |
| Bluefin LTS (Beta) | ARM (aarch64) | [📥 bluefin-lts-aarch64.iso](https://download.projectbluefin.io/bluefin-lts-aarch64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-lts-aarch64.iso-CHECKSUM) |

### Bluefin GDX

The AI workstation with Nvidia and CUDA.\
📖 **[Read the documentation](/gdx)** to learn about features and differences.

| Version            | Architecture  | Download                                                                                         | Checksum                                                                             |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Bluefin GDX (Beta) | Nvidia        | [📥 bluefin-gdx-x86_64.iso](https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso)       | [🔐 Verify](https://download.projectbluefin.io/bluefin-gdx-lts-x86_64.iso-CHECKSUM)  |
| Bluefin GDX (Beta) | ARM (aarch64) | [📥 bluefin-gdx-lts-aarch64.iso](https://download.projectbluefin.io/bluefin-gdx-lts-aarch64.iso) | [🔐 Verify](https://download.projectbluefin.io/bluefin-gdx-lts-aarch64.iso-CHECKSUM) |

## Older Backup ISOs

These are the older Anaconda-based installers with an older version of Bluefin, but don't worry it will autoupdate. Try this if nothing else works:

#### Bluefin (AMD/Intel)

📥 **Download:** [bluefin-stable.iso](https://projectbluefin.dev/bluefin-stable.iso)  
🔐 **Verify:** [Checksum](https://projectbluefin.dev/bluefin-stable.iso-CHECKSUM)

#### Bluefin (for Nvidia)

📥 **Download:** [bluefin-nvidia-stable.iso](https://projectbluefin.dev/bluefin-nvidia-stable.iso)  
🔐 **Verify:** [Checksum](https://projectbluefin.dev/bluefin-nvidia-stable.iso-CHECKSUM)

## Verifying Downloads with Checksums

**Checksums** allow you to verify that your download completed successfully and wasn't corrupted or tampered with. After downloading an ISO, you can compare its checksum to the official checksum file to ensure integrity. While optional, verification is recommended for important installations.

#### How to verify checksums using sha256sum

1. **Download both the ISO file and its corresponding CHECKSUM file**
   - For example: `bluefin-stable-x86_64.iso` and `bluefin-stable-x86_64.iso-CHECKSUM`

2. **Generate the checksum of your downloaded ISO:**

   ```bash
   sha256sum bluefin-stable-x86_64.iso
   ```

3. **Compare with the official checksum file:**

   ```bash
   cat bluefin-stable-x86_64.iso-CHECKSUM
   ```

4. **Verify they match:** The output from step 2 should match the hash in the CHECKSUM file. If they match, your download is verified and safe to use.

**Example:**

```bash
# Generate checksum of downloaded file
$ sha256sum bluefin-stable-x86_64.iso
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456  bluefin-stable-x86_64.iso

# Check official checksum
$ cat bluefin-stable-x86_64.iso-CHECKSUM
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456  bluefin-stable-x86_64.iso

# ✅ Match! Your download is verified
```
