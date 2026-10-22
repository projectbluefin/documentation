import React from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import CodeBlock from "@theme/CodeBlock";
import DownloadCard, { type DownloadEntry } from "./DownloadCard";
import imageReleasesData from "@site/static/data/image-releases.json";
import sbomData from "@site/static/data/sbom-attestations.json";
import identities from "./image-identities.json";
import styles from "./ImageProductSection.module.css";
import catalogStyles from "./DriverVersionsCatalog.module.css";

export type ImageProductKey = "server" | "classic" | "dakota" | "utah" | "lts";

interface ImageReleaseAsset {
  name: string;
  url: string;
  size?: number | null;
}

interface ImageReleaseRecord {
  tag: string;
  url: string;
  publishedAt: string;
  stream: "stable" | "testing" | null;
  source: {
    repository: string;
    kind: "image" | "iso";
  };
  assets: ImageReleaseAsset[];
  versions: Record<string, string | null> | null;
  versionsSource?: string | null;
}

interface ImageDownloadRecord {
  name: string;
  url: string;
  stream: "stable" | "testing" | null;
  payloadStream?: "stable" | "testing" | null;
  sourceUrl: string;
  size?: number | null;
  lastModified?: string | null;
  versions: null;
  unavailable?: boolean;
}

interface ProductReleaseData {
  releases: ImageReleaseRecord[];
  downloads: ImageDownloadRecord[];
  unavailable?: boolean;
  stateReason?: string | null;
  streams?: {
    stable?: { unavailable?: boolean; stateReason?: string | null };
    testing?: { unavailable?: boolean; stateReason?: string | null };
  };
}

interface ImageReleasesFile {
  generatedAt?: string;
  products: Record<string, ProductReleaseData>;
}

const releasesFile = imageReleasesData as unknown as ImageReleasesFile;
const sbomFile = sbomData as unknown as {
  streams?: Record<
    string,
    {
      releases?: Record<
        string,
        {
          tag?: string;
          attestation?: {
            present: boolean | null;
            verified: boolean;
            predicateType?: string | null;
            error?: string | null;
          };
          packageVersions?: Record<string, string | null> | null;
        }
      >;
    }
  >;
};

function formatBytes(bytes?: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "";
  const units = ["B", "KiB", "MiB", "GiB"];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return "Unknown";
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return isoString;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function cleanVersion(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/-\d+.*$/, "");
}

function majorNumber(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function majorMinor(value: string | null | undefined) {
  if (!value) return { major: null, minor: null };
  const match = value.match(/(\d+)\.(\d+)/);
  if (!match) return { major: null, minor: null };
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
  };
}

function getBumpInfo(
  current: string | null | undefined,
  previous: string | null | undefined,
) {
  const curMaj = majorNumber(current);
  const prevMaj = majorNumber(previous);
  const majorBump = curMaj !== null && prevMaj !== null && curMaj !== prevMaj;
  const curParts = majorMinor(current);
  const prevParts = majorMinor(previous);
  const minorBump =
    !majorBump &&
    curParts.major !== null &&
    prevParts.major !== null &&
    curParts.minor !== null &&
    prevParts.minor !== null &&
    curParts.major === prevParts.major &&
    curParts.minor !== prevParts.minor;
  return { majorBump, minorBump };
}

export function ComponentVersionBoxes({
  versions,
  previousVersions,
  title = "Major components in latest release",
}: {
  versions: Record<string, string | null> | null | undefined;
  previousVersions?: Record<string, string | null> | null | undefined;
  title?: string;
}): React.JSX.Element | null {
  if (!versions || Object.keys(versions).length === 0) return null;

  const cards = [
    { label: "Kernel", key: "kernel", nvidia: false },
    { label: "NVIDIA", key: "nvidia", nvidia: true },
    { label: "GNOME", key: "gnome", nvidia: false },
    { label: "Mesa", key: "mesa", nvidia: false },
    { label: "systemd", key: "systemd", nvidia: false },
    { label: "fsdk", key: "fsdk", nvidia: false },
    { label: "ZFS", key: "zfs", nvidia: false },
    { label: "k0s", key: "k0s", nvidia: false },
    { label: "bootc", key: "bootc", nvidia: false },
  ].filter((item) => Boolean(versions[item.key]));

  if (cards.length === 0) return null;

  return (
    <div className={styles.versionBoxesWrapper}>
      <span className={styles.versionBoxesTitle}>{title}</span>
      <div className={catalogStyles.majorVersions}>
        {cards.map(({ label, key, nvidia }) => {
          const val = versions[key];
          const prev = previousVersions ? previousVersions[key] : null;
          const { majorBump, minorBump } = getBumpInfo(val, prev);

          const cardClass = [
            catalogStyles.majorVersionCard,
            nvidia ? catalogStyles.nvidiaCard : "",
            majorBump
              ? nvidia
                ? catalogStyles.nvidiaMajorBump
                : catalogStyles.majorBump
              : "",
            minorBump
              ? nvidia
                ? catalogStyles.nvidiaMinorBump
                : catalogStyles.minorBump
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={key} className={cardClass}>
              <span className={catalogStyles.majorVersionLabel}>{label}</span>
              <span className={catalogStyles.majorVersionValue}>
                {cleanVersion(val)}
              </span>
              {majorBump && (
                <span
                  className={
                    nvidia ? catalogStyles.nvidiaBumpTag : catalogStyles.bumpTag
                  }
                >
                  ↑ Major bump
                </span>
              )}
              {minorBump && (
                <span
                  className={
                    nvidia
                      ? catalogStyles.nvidiaMinorTag
                      : catalogStyles.minorTag
                  }
                >
                  ↑ Minor bump
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductDownloadsAndVersions({
  product,
  hideHeading = false,
}: {
  product: ImageProductKey;
  hideHeading?: boolean;
}): React.JSX.Element {
  const data = releasesFile?.products?.[product] as
    ProductReleaseData | undefined;
  const downloads = data?.downloads ?? [];
  // ISO rows carry no component versions; compare image releases only.
  const imageReleases = (data?.releases ?? []).filter((r) => r.versions);
  const latestRelease = imageReleases[0] ?? null;
  const prevRelease = imageReleases[1] ?? null;

  // Separate stable and testing downloads
  const stableDownloads = downloads.filter((d) => d.stream === "stable");
  const testingDownloads = downloads.filter((d) => d.stream === "testing");

  const toEntries = (list: ImageDownloadRecord[]): DownloadEntry[] => {
    const isoEntries = list.filter((item) => item.name.endsWith(".iso"));
    return isoEntries.map((iso) => {
      const checksum = list.find(
        (item) =>
          item.name === `${iso.name}-CHECKSUM` ||
          item.name === `${iso.name}.sha256`,
      );
      const torrent = list.find((item) => item.name === `${iso.name}.torrent`);
      return {
        label: iso.name.includes("nvidia")
          ? "Nvidia"
          : iso.name.includes("gdx")
            ? "GDX (Nvidia Workstation)"
            : "AMD / Intel",
        isoUrl: iso.url,
        isoFilename: iso.name,
        torrentUrl: torrent?.url,
        checksumUrl: checksum?.url ?? `${iso.url}-CHECKSUM`,
      };
    });
  };

  const hasIso = downloads.some((d) => d.name.endsWith(".iso"));

  return (
    <section className={styles.section}>
      {!hideHeading && (
        <Heading as="h2" id="downloads-and-versions">
          Downloads &amp; Image Versions
        </Heading>
      )}
      {/* Major component version boxes */}
      {latestRelease?.versions && (
        <ComponentVersionBoxes
          versions={latestRelease.versions}
          previousVersions={prevRelease?.versions}
          title={`Major components in latest ${product} release (${latestRelease.tag})`}
        />
      )}

      {/* ISO installation cards for stable and testing */}
      {hasIso ? (
        <div className={styles.downloadGrid}>
          {stableDownloads.some((d) => d.name.endsWith(".iso")) && (
            <DownloadCard
              variant="bluefin"
              title={`${product.toUpperCase()} Stable ISO`}
              recommended
              description="Production release installer with verified checksums."
              entries={toEntries(stableDownloads)}
            />
          )}

          {testingDownloads.some((d) => d.name.endsWith(".iso")) && (
            <DownloadCard
              variant="dakotaraptor"
              title={`${product.toUpperCase()} Testing ISO`}
              recommended={
                !stableDownloads.some((d) => d.name.endsWith(".iso"))
              }
              description="Current automated testing build for verification and hardware testing."
              entries={toEntries(testingDownloads)}
            />
          )}
        </div>
      ) : product === "server" ? (
        <div className={styles.downloadGrid}>
          {(() => {
            const installerAsset = latestRelease?.assets?.find(
              (a) =>
                a.name.startsWith("bluefin-server-installer_") &&
                a.name.endsWith(".raw"),
            );
            const ddiAsset = latestRelease?.assets?.find(
              (a) =>
                a.name.startsWith("bluefin-server_") &&
                a.name.endsWith(".raw") &&
                !a.name.includes(".usr"),
            );
            const netbootUkiAsset = latestRelease?.assets?.find(
              (a) =>
                a.name.startsWith("bluefin-server-netboot_") &&
                a.name.endsWith(".efi"),
            );
            const netbootEspAsset = latestRelease?.assets?.find(
              (a) =>
                a.name.startsWith("bluefin-server-netboot_") &&
                a.name.endsWith(".esp.raw"),
            );
            const diskUkiAsset = latestRelease?.assets?.find(
              (a) =>
                a.name.startsWith("bluefin-server-") &&
                a.name.endsWith(".efi") &&
                !a.name.includes("-netboot_"),
            );
            const checksumAsset = latestRelease?.assets?.find(
              (a) => a.name === "SHA256SUMS",
            );
            const checksumUrl =
              checksumAsset?.url ??
              (latestRelease
                ? `https://github.com/projectbluefin/server/releases/download/${latestRelease.tag}/SHA256SUMS`
                : "#");

            const primaryEntries: DownloadEntry[] = [
              ...(installerAsset
                ? [
                    {
                      label: "USB Installer (x86_64 raw)",
                      isoUrl: installerAsset.url,
                      isoFilename: installerAsset.name,
                      checksumUrl,
                      buttonLabel: "Download Installer",
                    },
                  ]
                : []),
              ...(ddiAsset
                ? [
                    {
                      label: "OS DDI Image (raw diskless)",
                      isoUrl: ddiAsset.url,
                      isoFilename: ddiAsset.name,
                      checksumUrl,
                      buttonLabel: "Download DDI",
                    },
                  ]
                : []),
            ];

            const netbootEntries: DownloadEntry[] = [
              ...(netbootUkiAsset
                ? [
                    {
                      label: "Netboot UKI (UEFI HTTP/PXE)",
                      isoUrl: netbootUkiAsset.url,
                      isoFilename: netbootUkiAsset.name,
                      checksumUrl,
                      buttonLabel: "Download UKI",
                    },
                  ]
                : []),
              ...(netbootEspAsset
                ? [
                    {
                      label: "Netboot ESP (systemd-boot raw)",
                      isoUrl: netbootEspAsset.url,
                      isoFilename: netbootEspAsset.name,
                      checksumUrl,
                      buttonLabel: "Download ESP",
                    },
                  ]
                : []),
              ...(diskUkiAsset
                ? [
                    {
                      label: "Disk UKI (installed node update)",
                      isoUrl: diskUkiAsset.url,
                      isoFilename: diskUkiAsset.name,
                      checksumUrl,
                      buttonLabel: "Download UKI",
                    },
                  ]
                : []),
            ];

            return (
              <DownloadCard
                variant="server"
                title={`BLUEFIN SERVER ${latestRelease?.tag ?? "Release"}`}
                recommended
                description="Immutable, UKI-native server OS composed from freedesktop-sdk. Deploys via offline raw USB installer or UEFI netboot UKI."
                gpuLogos={false}
                entries={primaryEntries}
                sections={
                  netbootEntries.length > 0
                    ? [
                        {
                          label: "Netboot & UEFI Artifacts",
                          entries: netbootEntries,
                        },
                      ]
                    : undefined
                }
              />
            );
          })()}
        </div>
      ) : (
        <p className={styles.mutedText}>
          No standalone ISO installers are published for this image yet. Use
          container switch commands from the release section below.
        </p>
      )}
    </section>
  );
}

export function ProductReleaseAssets({
  product,
  hideHeading = false,
}: {
  product: ImageProductKey;
  hideHeading?: boolean;
}): React.JSX.Element {
  const data = releasesFile?.products?.[product] as
    ProductReleaseData | undefined;
  const releases = data?.releases ?? [];
  // Look up attestation in SBOM cache if available
  const sbomStreamKey =
    product === "dakota"
      ? "dakota-stable"
      : product === "classic"
        ? "bluefin-stable"
        : product === "lts"
          ? "bluefin-lts"
          : null;

  const sbomStream = sbomStreamKey ? sbomFile.streams?.[sbomStreamKey] : null;

  return (
    <section className={styles.section}>
      {!hideHeading && (
        <Heading as="h2" id="release-assets-and-attestations">
          Release Assets &amp; Attestations
        </Heading>
      )}
      {releases.length === 0 ? (
        <p className={styles.mutedText}>
          No published GitHub releases found for this product.
        </p>
      ) : (
        <div
          className={
            product === "server" ? styles.timelinePage : styles.releasesTimeline
          }
        >
          {product === "server" && (
            <aside className={styles.archiveRail} aria-hidden="true">
              <span className={styles.archiveNow}>Now</span>
              <span className={styles.archivePast}>Past</span>
            </aside>
          )}
          {(product === "server" ? releases.slice(0, 7) : releases).map(
            (release, index) => {
              const isIso = release.source.kind === "iso";
              const isBootc = !isIso && Boolean(identities[product].image);
              const isDdi = product === "server";

              // Find matching SBOM entry if present
              const sbomEntry = sbomStream?.releases
                ? Object.values(sbomStream.releases).find((r) =>
                    release.tag.includes(r.tag?.replace("stable-", "") ?? ""),
                  )
                : null;

              return (
                <React.Fragment key={release.tag}>
                  {product === "server" && index > 0 && (
                    <div className={styles.releaseDivider} />
                  )}
                  <article className={styles.releaseCard}>
                    <header className={styles.releaseHeader}>
                      <div className={styles.releaseTitleGroup}>
                        <Link
                          to={release.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.releaseTagLink}
                        >
                          <strong className={styles.releaseTag}>
                            {release.tag}
                          </strong>
                        </Link>
                        <span className={styles.releaseKindBadge}>
                          {isDdi
                            ? "DDI + UKI"
                            : isIso
                              ? "ISO installer"
                              : "bootc OCI"}
                        </span>
                        {release.stream && (
                          <span className={styles.streamBadge}>
                            :{release.stream}
                          </span>
                        )}
                      </div>
                      <span className={styles.releaseDate}>
                        {formatDate(release.publishedAt)}
                      </span>
                    </header>

                    {/* Major component version boxes for server releases */}
                    {isDdi && release.versions && (
                      <ComponentVersionBoxes
                        versions={release.versions}
                        previousVersions={
                          (product === "server"
                            ? releases.slice(0, 7)
                            : releases)[index + 1]?.versions
                        }
                        title={`Major components (${release.tag})`}
                      />
                    )}

                    {/* Supply Chain / Attestation Verification */}
                    {!isIso && (
                      <div className={styles.supplyChainBox}>
                        <strong>Supply chain &amp; attestation:</strong>
                        {isDdi ? (
                          <span>
                            GPG-signed SHA256SUMS manifest &amp; in-toto SLSA /
                            SPDX SBOM published with release.
                          </span>
                        ) : sbomEntry?.attestation?.verified ? (
                          <span className={styles.verifiedText}>
                            ✓ Provenance attestation verified (
                            {sbomEntry.attestation.predicateType || "SLSA v1"}).
                          </span>
                        ) : sbomEntry?.attestation?.present ? (
                          <span>
                            Provenance attestation present in GHCR referrer.
                          </span>
                        ) : (
                          <span>
                            No attestation for this tag in the SBOM cache.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Switch or deployment instructions */}
                    {isBootc && (
                      <div className={styles.commandBlock}>
                        <span className={styles.commandLabel}>
                          Bootc container switch:
                        </span>
                        <CodeBlock language="bash">
                          {`sudo bootc switch --enforce-container-sigpolicy ${identities[product].image}:${release.stream ?? "stable"}`}
                        </CodeBlock>
                      </div>
                    )}

                    {/* Downloadable assets table */}
                    {release.assets.length > 0 && (
                      <div className={styles.assetsWrapper}>
                        <table className={styles.assetsTable}>
                          <thead>
                            <tr>
                              <th>Asset file</th>
                              <th>Size</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {release.assets.map((asset) => (
                              <tr key={asset.name}>
                                <td>
                                  <code>{asset.name}</code>
                                </td>
                                <td>{formatBytes(asset.size)}</td>
                                <td>
                                  <a
                                    href={asset.url}
                                    className={styles.assetDownloadLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Download
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </article>
                </React.Fragment>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}
