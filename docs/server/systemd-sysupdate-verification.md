---
mdx:
  format: md
title: "systemd-sysupdate Signature Verification"
slug: /server/systemd-sysupdate-verification
description: "Check update health, manage trusted signing keys, and verify Bluefin Server releases."
---

# systemd-sysupdate Signature Verification

## How It Works

`systemd-sysupdate` downloads `SHA256SUMS` and its detached signature,
`SHA256SUMS.gpg`, then verifies the manifest before accepting its checksums.
All transfers share one signed manifest at
`https://github.com/projectbluefin/server/releases/latest/download/`.

The trusted keyring is `/etc/systemd/import-pubring.pgp` if present; otherwise
it is `/usr/lib/systemd/import-pubring.pgp`. The old `.gpg` runtime paths are
not read by systemd.

<a id="current-implementation-status"></a>

Installed nodes stage updates in inactive A/B usr and usr-verity slots and
install a matching UKI with three boot tries. A failed image rolls back.
Image-locked extensions follow OS updates as optional sysupdate features;
k0s and NVIDIA Container Toolkit have independent component updates. See
[extensions](/server/systemd-sysext-extensions) for selection and commands.

Diskless nodes update by rebooting into a newer image;
`systemd-sysupdate.service` is disabled there. The initrd uses
`verify=signature` for the DDI download. The diskless update check verifies the
boot server's manifest with the same keyring precedence: an unsigned or
foreign-signed manifest never sets `/run/reboot-required`.

See [installer updates](/server/ddi-installer#updates) for scheduling, Kured,
and the boot health gate.

## Update health on the node

The console and login banner show the running version, whether automatic
updates are enabled, the last successful check, and whether an update is
staged, exhausted its boot tries, or is up to date. Before the first check it
shows `never`; the first timer run is 15 minutes to a few hours after boot.

A failed check remains visible until a later check succeeds. Signature
failures report `signature verification failed`; HTTP or transfer errors
report `update source unreachable`, followed by the first logged error.
The failed `systemd-sysupdate.service` unit also stays failed until success.
Status survives reboots in `/var/lib/bluefin-update-status/state` and is
computed locally. An operator-owned `/etc/motd` takes precedence over the
generated login message.

```bash
systemctl status systemd-sysupdate.service systemd-sysupdate.timer
journalctl -u systemd-sysupdate.service     # every check, with gpg's verdict
systemd-sysupdate list                      # installed and available versions
systemd-sysupdate check-new                 # prints a newer version, if any
systemctl start systemd-sysupdate.service   # check (and stage) now
```

<a id="signing-happens-inside-the-image-build"></a>

## Keyring overrides and recovery

The vendor keyring lives on immutable `/usr`; updates and rollbacks change it
with the image. It is not copied to persistent `/etc` on current images.

Older nodes may retain a factory copy at `/etc/systemd/import-pubring.pgp`,
which shadows the image keyring. After booting a fixed image, inspect both
keyrings. If `/etc` contains only the old factory copy, back it up **outside
systemd's keyring paths**, then remove it to follow the image keyring. Preserve
intentional operator overrides; there is no automatic deletion.

A dev-installed node cannot authenticate its first official update with a dev
key. Obtain the authenticated release public keyring through a trusted
administrative channel and provision it as the `/etc` override. After booting
the official image, remove the temporary override to follow its vendor
keyring. **Do not disable signature verification.**

## Rotating the Signing Key

1. Generate and back up a new RSA sign-only key in a secure environment. This
   example writes an unencrypted private key; protect the offline destination:

   ```bash
   export GNUPGHOME=$(mktemp -d)
   cat > "$GNUPGHOME/keygen" <<'EOF'
   %echo Generating new sysupdate signing key
   Key-Type: RSA
   Key-Length: 4096
   Key-Usage: sign
   Name-Real: Bluefin Server Release Signing
   Name-Email: releases@projectbluefin.io
   Expire-Date: 0
   %no-protection
   %commit
   %echo done
   EOF
   gpg --batch --gen-key "$GNUPGHOME/keygen"
   KEYID=$(gpg --list-keys --with-colons 'releases@projectbluefin.io' | awk -F: '/^pub:/ {print $5; exit}')
   gpg --export --output /secure/offline/new-public.pgp "$KEYID"
   gpg --export-secret-keys --armor "$KEYID" > /secure/offline/backup.asc
   rm -rf "$GNUPGHOME"
   ```

2. Combine the existing release public keys and the new public key in
   `files/os/sysupdate-keys/import-pubring.gpg`. Ship a **bridge release signed
   by the old key**, carrying this combined vendor keyring. Leave
   `SYSUPDATE_SIGNING_KEY` unchanged for the bridge.
3. Ensure nodes have booted the bridge and migrated legacy `/etc` factory
   copies. Nodes that skip it need their trust provisioned through a trusted
   administrative channel.
4. Update the release environment's `SYSUPDATE_SIGNING_KEY` with the new
   ASCII-armored private key. Rebuild and publish under a **new**
   `image-version`, never an existing version. Retire the old public key in a
   later image only after the transition is complete.

For throwaway local keys, use `just gen-dev-keys`. See
[key management](/server/secure-boot-keys) for related keys and CI secrets.

<a id="provenance-sbom-and-publishing"></a>

## Verify a downloaded release

Nodes check the GPG signature, not GitHub attestations. The build signs the
combined manifest and checks it against the shipped keyring before publishing.
To check a downloaded manifest with an authenticated keyring:

```bash
gpgv --keyring /path/to/import-pubring.pgp SHA256SUMS.gpg SHA256SUMS
```

Release attestations additionally identify the producing commit and workflow.
The SBOM, `bluefin-server_<ver>.spdx.json`, is covered by `SHA256SUMS`; nodes
do not download it. Its `2011-11-11T11:11:11Z` creation time is a reproducibility
placeholder, not the build time. Use the provenance attestation or release tag
for that. The informational `bluefin-server_<ver>.size.json` is **not signed**.

```bash
gh attestation verify bluefin-server_<ver>.raw --repo projectbluefin/server \
  --signer-workflow projectbluefin/server/.github/workflows/build.yml --source-ref refs/heads/main
gh attestation verify bluefin-server_<ver>.raw --repo projectbluefin/server \
  --predicate-type https://spdx.dev/Document/v2.3
gh attestation verify oci://ghcr.io/projectbluefin/bluefin-server:<ver> \
  --repo projectbluefin/server --bundle-from-oci
```

Or check the registry referrers with cosign:

```bash
cosign verify-attestation --new-bundle-format --type slsaprovenance1 \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity 'https://github.com/projectbluefin/server/.github/workflows/build.yml@refs/heads/main' \
  ghcr.io/projectbluefin/bluefin-server@sha256:<digest>
```

Use `--type spdxjson` for the SBOM attestation.

<a id="repository-layout"></a>
<a id="common-gotchas"></a>
<a id="verification"></a>

## Transfer configuration

- Keep `[Source] Path=` static. `@v` belongs only in `MatchPattern=`;
  putting it in the URL breaks manifest discovery.
- `Verify=` belongs in `[Transfer]` and defaults to `yes`. Do not set
  `Verify=no`, including for component transfers.
- Keep one combined manifest for the release set. OS and initrd must carry
  the public key matching its signer.

Build wiring, publication checks, and tamper-test procedures are in the
[upstream technical reference](https://github.com/projectbluefin/server/blob/06dc2aad44644b28f13128afcc22fe1a24df165b/docs/skills/systemd-sysupdate-verification.md).

## See also

- [Secure Boot and signing keys](/server/secure-boot-keys)
- `systemd-sysupdate(8)`, `sysupdate.d(5)`
