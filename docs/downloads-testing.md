---
title: ISO Testing
slug: /downloads-testing
---

Here is a short [runbook](/installation) for the Bluefin installation process. Read the entirety of this documentation in order to ensure survival. (In case of a raptor attack).

## Things to Test For

- Installation experience
- Secure Boot
- Bare metal if possible but not required
- If you've got the time, go through the docs and run through the new user experience. These bugs are highly prized, so if you find one, file it!

## Bluefin

The most current, based on the latest Fedora.\
📖 **[Read the documentation](/introduction)** to learn about features and differences.

| Version | GPU       | Download                                                                                                     | Checksum                                                                               |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Bluefin | AMD/Intel | [📥 bluefin-stable-x86_64.iso](https://projectbluefin.dev/bluefin-stable-x86_64.iso)                         | [🔐 Verify](https://projectbluefin.dev/bluefin-stable-x86_64.iso-CHECKSUM)             |
| Bluefin | Nvidia    | [📥 bluefin-nvidia-open-stable-x86_64.iso](https://projectbluefin.dev/bluefin-nvidia-open-stable-x86_64.iso) | [🔐 Verify](https://projectbluefin.dev/bluefin-nvidia-open-stable-x86_64.iso-CHECKSUM) |

## Bluefin LTS

The long term support experience.\
📖 **[Read the documentation](/lts)** to learn about features and differences. The HWE images stand for "Hardware Enablement", these ISOs come with updated kernels and are recommended for newer devices such as Framework Computers. Note that `ujust rebase-helper` allows for users to switch back and forth, the ISOs are provided for convenience.

| Version                           | GPU           | Download                                                                                 | Checksum                                                                     |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Bluefin LTS                       | AMD/Intel     | [📥 bluefin-lts-x86_64.iso](https://projectbluefin.dev/bluefin-lts-x86_64.iso)           | [🔐 Verify](https://projectbluefin.dev/bluefin-lts-x86_64.iso-CHECKSUM)      |
| Bluefin LTS                       | ARM (aarch64) | [📥 bluefin-lts-aarch64.iso](https://projectbluefin.dev/bluefin-lts-aarch64.iso)         | [🔐 Verify](https://projectbluefin.dev/bluefin-lts-aarch64.iso-CHECKSUM)     |
| Bluefin LTS (Hardware Enablement) | AMD/Intel     | [📥 bluefin-lts-hwe-x86_64.iso](https://projectbluefin.dev/bluefin-lts-hwe-x86_64.iso)   | [🔐 Verify](https://projectbluefin.dev/bluefin-lts-hwe-x86_64.iso-CHECKSUM)  |
| Bluefin LTS (Hardware Enablement) | ARM (aarch64) | [📥 bluefin-lts-hwe-aarch64.iso](https://projectbluefin.dev/bluefin-lts-hwe-aarch64.iso) | [🔐 Verify](https://projectbluefin.dev/bluefin-lts-hwe-aarch64.iso-CHECKSUM) |

## Bluefin GDX

The AI workstation with Nvidia and CUDA.\
📖 **[Read the documentation](/gdx)** to learn about features and differences.

| Version     | GPU           | Download                                                                                 | Checksum                                                                     |
| ----------- | ------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Bluefin GDX | Nvidia        | [📥 bluefin-gdx-x86_64.iso](https://projectbluefin.dev/bluefin-gdx-lts-x86_64.iso)       | [🔐 Verify](https://projectbluefin.dev/bluefin-gdx-lts-x86_64.iso-CHECKSUM)  |
| Bluefin GDX | ARM (aarch64) | [📥 bluefin-gdx-lts-aarch64.iso](https://projectbluefin.dev/bluefin-gdx-lts-aarch64.iso) | [🔐 Verify](https://projectbluefin.dev/bluefin-gdx-lts-aarch64.iso-CHECKSUM) |

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

# 🦖 Rawr! Your download is verified
```
