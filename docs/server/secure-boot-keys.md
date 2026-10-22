---
mdx:
  format: md
title: "Secure Boot Key Management"
slug: /server/secure-boot-keys
description: "Signing keys, Secure Boot enrollment, rotation, and release checks for Bluefin Server."
---

# Secure Boot Key Management

Bluefin Server uses separate keys for the boot chain, kernel modules, release
manifest, and Ignition configuration. Build and CI details are in the
[upstream key reference](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/secure-boot-keys.md).

## Key inventory

Build keys live in `files/boot-keys/`:

| Key | Signs | Private file | Public file |
| --- | --- | --- | --- |
| PK | KEK updates | `PK.key` | `PK.crt` |
| KEK | db updates | `KEK.key` | `KEK.crt` |
| DB | systemd-boot, UKIs, shim and MokManager | `DB.key` | `DB.crt`; also embedded in shim |
| Module | Kernel modules | `linux-module-cert.key` | `modules/linux-module-cert.crt` |
| Sysupdate | `SHA256SUMS` | `sysupdate-signing.asc` | `import-pubring.pgp` |
| Ignition | `bluefin-node.ign` | Dev: `ignition-signing.asc`; release: kept off CI | `ignition-pubring.pgp`; release: `files/release-keys/ignition-pubring.pgp` |

The module certificate is compiled into the kernel's trusted keyring. Changing
it requires a kernel rebuild. Release builds require it to match the committed
`files/release-keys/linux-module-cert.crt`.
For Ignition signing, see [booty integration](/server/booty-integration).

## Local development

```bash
just gen-dev-keys          # throwaway keys in files/boot-keys/ (gitignored)
just gen-dev-keys --force  # rotate the Secure Boot and image signing keys
just gen-dev-keys --force --private-module-key  # also a fresh module key
```

`just validate` and `just build-image` generate development keys if needed.

### The INSECURE dev module key

By default, development builds use the public module signing pair in
`files/dev-keys/INSECURE-dev-module-key.{pem,crt}` so they can reuse the cached
kernel. **Anyone can sign a module that this kernel loads under lockdown.**
For hardware you care about, use `--private-module-key`; this builds the kernel
locally. Older key sets keep their own module key until `--force` is used.

Release checks reject the public dev pair. Release kernels trust only the
release module certificate, not dev-signed modules. Private module keys are
used for signing, not shipped in image artifacts.

## Key rotation

1. Generate production keys in a secure environment. The local equivalent is
   `just gen-dev-keys --force --private-module-key`; plain `--force` installs
   the public dev module key and is not suitable for releases.
2. Update `BOOT_KEYS_TARBALL` and `SYSUPDATE_SIGNING_KEY` in the release
   environment. Commit the matching public module certificate as
   `files/release-keys/linux-module-cert.crt` in the same change.
3. Bump `image-version` in `include/image.yml` and build a new image. Existing
   images still trust their old keys; allow time for the kernel rebuild.
4. Nodes re-enroll Secure Boot keys on their next boot if firmware is in Setup
   Mode. Otherwise, enroll manually through the systemd-boot menu.

For the update signing key, follow the
[bridge-release procedure](/server/systemd-sysupdate-verification#rotating-the-signing-key)
**before switching signers**. Nodes that miss the bridge need their trust
provisioned through a trusted administrative channel.

<a id="ci-secrets"></a>

Release secrets are available only to `main`; pull requests use throwaway
keys. See the [upstream CI procedure](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/ci-tooling.md)
for secret packaging and release-key checks.

## Shim

Secure Boot currently requires enrolling Bluefin's PK/KEK/db, using firmware
Setup Mode and systemd-boot's `secure-boot-enroll`. Do not assume a stock
machine can boot Bluefin through Microsoft's trust chain.

Shim embeds the DB certificate and trusts the same systemd-boot, UKIs, and
MokManager. A Microsoft-signed shim would extend that trust to machines that
trust Microsoft's UEFI CA, so DB needs stronger custody than the CI tarball
before submission. Raising the Bluefin shim SBAT generation revokes earlier
Bluefin shims.

<a id="shim-review-submission"></a>

Microsoft signing requires [shim-review](https://github.com/rhboot/shim-review)
and the UEFI CA 2023. Release-key builds, reproducibility evidence, security
contacts, organization proof, and whole-chain SBAT requirements are covered
in the upstream key reference. See the [installer guide](/server/ddi-installer)
for shim placement and unwired parts of the boot path.

## Verification

For a generated or rotated build key set:

```bash
just validate
sbverify --cert files/boot-keys/DB.crt <uki>
gpgv --keyring files/boot-keys/import-pubring.pgp SHA256SUMS.gpg SHA256SUMS
bash scripts/check-release-keys.sh
just bst build bluefin-server/shim.bst
```

The shim build checks its vendor certificate, SBAT, and signatures. Never
commit private keys outside gitignored `files/boot-keys/`; the deliberately
public INSECURE dev module pair is the sole exception.

## See also

- [Update signature verification](/server/systemd-sysupdate-verification)
- [Upstream build guide](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/ddi-installer-build.md)
