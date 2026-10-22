---
mdx:
  format: md
title: "Booty Network Boot"
slug: /server/booty-integration
description: "Serve Bluefin Server releases and per-node configuration with Booty."
---

<a id="booty-integration"></a>

# Booty Network Boot

[Booty](https://github.com/jeefy/booty) syncs a Bluefin Server release and
serves its boot files and per-node configuration. Use its
[README](https://github.com/jeefy/booty) for deployment flags and config layout.

## What Booty serves

Select a release `v<ver>` from GitHub Releases or the OCI artifact
`ghcr.io/projectbluefin/bluefin-server:<ver>` (`--bluefinOCI`; an `http://`
prefix allows a plain-HTTP registry). Booty serves these over HTTP:

- `bluefin-server-netboot_<ver>.efi` and `bluefin-server_<ver>.raw`.
- `SHA256SUMS`, `SHA256SUMS.gpg` and listed extension assets.
- Per-MAC `bluefin-node.ign` configuration.

Booty checks checksums; supply `--bluefinKeyring` to verify their GPG signature.
The node also verifies the release signature before using the DDI. Keep all
artifacts from the same release. Booty does not sync the netboot ESP, disk UKI
or offline USB installer.

## Boot paths

| Firmware | Path and limits |
| --- | --- |
| UEFI HTTP Boot | Firmware loads `http://<booty>/bluefin/<mac>/bluefin-server-netboot.efi`. Secure Boot stays on; enroll the Bluefin DB key beforehand. |
| UEFI PXE / iPXE | Chainloads the netboot UKI with an explicit `rd.systemd.pull` URL. Secure Boot must be off. |
| Legacy BIOS / iPXE | Loads the UKI's kernel and initrd directly. Diskless only: no disk install, sysupdate or boot counting. |

## Per-node configuration

Booty renders Ignition 3.6.0 config by MAC: hostname, SSH keys (also enabling
`sshd.service`, otherwise disabled), state disk, extensions and a k0s token.
Extensions include `zfs`, `kubestellar`, `k0s`, `nvidia-container-toolkit` and
at most one `nvidia-open-<branch>` driver, which can coexist with ZFS. See
[Booty's NVIDIA rules](https://github.com/jeefy/booty#nvidia-gpu-hosts).
Image-locked extensions land in `/etc/extensions/<name>_<ver>.raw`; the toolkit
uses `/etc/extensions/nvidia-container-toolkit.raw`.

Without an `ignition.config` or `ignition.config.url` credential, the initrd
looks for `bluefin-node.ign` beside the boot UKI. An absent config is skipped.
A present config follows these rules:

- Its detached signature, `bluefin-node.ign.gpg`, must verify against
  `/usr/lib/bluefin/ignition-pubring.pgp` inside the signed UKI. There is no
  `/etc` override. The release keyring cannot authenticate node configs, and
  config signers cannot sign releases. Verified bytes are staged inline for
  Ignition; HTTP transport does not weaken this signature check.
- Only a signature **HTTP 404** permits the unsigned path, and only with a
  nonempty `bluefin.ignition.allow-unsigned` system credential. It is logged
  `UNAUTHENTICATED`. Bad signatures, unreadable keyrings and other signature
  fetch errors fail the boot, even with the opt-out.
- Remote `ignition.config.merge` / `replace` and
  `storage.files[].contents.source` content needs `verification.hash`;
  signing the top-level config does not authenticate remote content.

### The Ignition config key

Your signing public key must already be in the image's Ignition keyring.
Use the project's config signer, or build an image with your own keyring;
you cannot deliver a new trust root through HTTP config. Release images use
the committed config keyring; development images use development keys. Keep
config-signing private keys out of CI and builds.

Sign the final rendered bytes, then serve the signature alongside the config.
From the server source checkout:

```bash
scripts/sign-node-config.sh ignition-signing.asc bluefin-node.ign
# Or with a key in your GPG keyring:
gpg --local-user <fpr> --detach-sign bluefin-node.ign
```

Re-sign every changed config. A stale signature stops the boot. Mark a node
provisioned only after it passes the initrd, not after it downloads the UKI.

Rotate keys by overlap: ship an image trusting old and new public keys, switch
the signer, then remove the old key in a later image. Each keyring change needs
a new image; removal revokes the key only for nodes booting that new image.

### Transitional: unsigned configs on netboot

**Booty does not yet sign configs.** Default netboot builds carry
`bluefin.ignition.allow-unsigned:1`, so Booty's missing `.gpg` takes the unsigned
path. Disk and installer UKIs do not carry this opt-out. iPXE and BIOS use the
netboot UKI's command line and inherit it too.

This permits an on-path attacker to substitute a config and return 404 for its
signature. Bad signatures and non-404 signature errors still fail closed.
Do not treat this transitional setup as authenticated provisioning. Disabling
`ignition_allow_unsigned` requires a Booty release/deployment that signs every
rendered config with a key trusted by the image; older unsigned deployments
then fail to boot. See the [upstream cutover requirements](https://github.com/projectbluefin/server/blob/main/docs/skills/booty-integration.md#transitional-unsigned-configs-on-netboot).

## Install to disk

**Installation can erase the local target disk.** Set `doInstall` in the node's
Booty config only when that is intended. It starts `booty-install.service`,
which runs `systemd-sysinstall`. The source is the in-RAM DDI's loop partitions,
so merged extensions do not interfere.

Without Booty, use the netboot ESP and an `import.pull.cred` on USB as described
in [boot and install](/server/ddi-installer#pxe--http-boot-service).

## kubeadm workers

Run Booty with `--profile=kubeadm-worker` against an external cluster. It adds
the release's version-locked `kubeadm` extension, enables `containerd.service`
and `kubelet.service`, and runs `kubeadm join` on every diskless boot. `kubeadm`
is supplied by the profile, not the selectable `extensions` list. See the
[kubeadm runbook](/server/kubeadm-sysext) and Booty's README for configuration.

<a id="read-more"></a>

## See also

- [Booty README](https://github.com/jeefy/booty) — deployment and node configuration.
- [Boot, install and update](/server/ddi-installer).
- [Diskless troubleshooting](/server/diskless-troubleshooting).
- [Upstream technical reference](https://github.com/projectbluefin/server/blob/main/docs/skills/booty-integration.md) — key/build checks and unsigned-config cutover.
