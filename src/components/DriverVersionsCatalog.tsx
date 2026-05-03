import React from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import CodeBlock from "@theme/CodeBlock";
import driverVersionsData from "@site/static/data/driver-versions.json";
import streamPinsData from "@site/static/data/stream-pins.json";
import styles from "./DriverVersionsCatalog.module.css";

interface StreamPins {
  hweKernel?: string | null;
  kernel?: string | null;
  mesa?: string | null;
  nvidia?: string | null;
  gnome?: string | null;
}

interface PinsData {
  generatedAt?: string;
  streams?: Record<string, StreamPins>;
}

const pinsCatalog = streamPinsData as unknown as PinsData;

interface VersionSet {
  kernel: string | null;
  hweKernel: string | null;
  mesa: string | null;
  nvidia: string | null;
  gnome: string | null;
}

interface DriverRow {
  stream: string;
  tag: string;
  title: string | null;
  releaseUrl: string | null;
  publishedAt: string | null;
  versions: VersionSet;
}

interface DriverStream {
  id: string;
  name: string;
  subtitle: string;
  command: string;
  source: "cache" | "live" | "unavailable";
  rowCount: number;
  latest: DriverRow | null;
  history: DriverRow[];
}

interface DriverCatalog {
  generatedAt?: string;
  streams?: DriverStream[];
}

const catalog = driverVersionsData as unknown as DriverCatalog;

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function valueOrFallback(value: string | null | undefined, fallback = "N/A") {
  return value || fallback;
}

/**
 * Strips RPM dist/release noise from a package version string for display.
 * Kernels and apps both strip the entire -N.distTag release suffix.
 *   "6.19.12-200.fc43" → "6.19.12"   (Fedora version shown via userspace marker)
 *   "6.12.0-224.el10"  → "6.12.0"
 *   "49.5-100.el10gnomeqr.el10" → "49.5"
 *   "595.71.05-1"      → "595.71.05"
 */
function cleanVersion(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/-\d+.*$/, "");
}

function VersionValue({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className={`${styles.majorVersionValue} ${styles.versionMissing}`}>N/A</span>;
  }
  return <span className={styles.majorVersionValue}>{cleanVersion(value)}</span>;
}

function majorNumber(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function majorMinor(value: string | null | undefined) {
  if (!value) return { major: null as number | null, minor: null as number | null };
  const match = value.match(/(\d+)\.(\d+)/);
  if (!match) return { major: null, minor: null };
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
  };
}

interface UserspaceInfo {
  label: string;   // e.g. "Fedora 43 Userspace" or "CentOS Stream 10 Userspace"
  key: string;     // e.g. "fc43" or "el10" — used for transition detection
}

/** Reads the BASE kernel to determine the userspace OS and version. */
function extractUserspace(row: DriverRow): UserspaceInfo | null {
  const base = row.versions.kernel ?? "";
  const el = base.match(/\.el(\d+)/);
  if (el) return { label: `CentOS Stream ${el[1]} Userspace`, key: `el${el[1]}` };
  const fc = base.match(/\.fc(\d+)/);
  if (fc) return { label: `Fedora ${fc[1]} Userspace`, key: `fc${fc[1]}` };
  return null;
}

/** Extracts the numeric Fedora release from HWE kernel (used for HWE pin context only). */
function extractFedoraRelease(row: DriverRow): number | null {
  const kernelStr = row.versions.hweKernel ?? row.versions.kernel ?? "";
  const m = kernelStr.match(/\.fc(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Banner shown at the transition point where the userspace version changed. */
function UserspaceMarker({ toLabel, fromLabel }: { toLabel: string; fromLabel: string }) {
  return (
    <div className={styles.userspaceMarker}>
      <span className={styles.userspaceMarkerLabel}>
        ↑ {toLabel}
      </span>
      <div className={styles.userspaceMarkerLine} />
      <span className={styles.userspaceMarkerCenter}>
        {toLabel.replace("Userspace", "Release")}
      </span>
      <div className={styles.userspaceMarkerLine} />
      <span className={`${styles.userspaceMarkerLabel} ${styles.userspaceMarkerLabelOld}`}>
        ↓ {fromLabel}
      </span>
    </div>
  );
}

function rebaseCommandForTag(tag: string) {
  const safeTag = /^[a-z0-9][a-z0-9._-]*$/i.test(tag) ? tag : "stable";
  return `sudo bootc switch --enforce-container-sigpolicy "ghcr.io/$(jq -r '.\"image-name\"' /usr/share/ublue-os/image-info.json):${safeTag}"`;
}

function ReleaseNode({
  row,
  previousRow,
  emphasize,
  pins,
  isLts,
  pinnedHweKernels,
}: {
  row: DriverRow;
  previousRow?: DriverRow;
  emphasize: boolean;
  pins?: StreamPins | null;
  isLts?: boolean;
  pinnedHweKernels?: Set<string>;
}) {
  const kernel = valueOrFallback(row.versions.kernel);
  const nvidia = valueOrFallback(row.versions.nvidia);
  const mesa = valueOrFallback(row.versions.mesa);
  const hwe = row.versions.hweKernel;
  const gnome = valueOrFallback(row.versions.gnome);

  // Badge fires if: workflow pin matches (current pin) OR SBOM history shows
  // this kernel version repeated across 2+ releases (historically pinned).
  const hweIsPinned = Boolean(
    (pins?.hweKernel && hwe && hwe === pins.hweKernel) ||
    (hwe && pinnedHweKernels?.has(hwe)),
  );

  const kernelMajor = majorNumber(row.versions.kernel);
  const previousKernelMajor = majorNumber(previousRow?.versions.kernel);
  const kernelMajorBump =
    kernelMajor !== null &&
    previousKernelMajor !== null &&
    previousKernelMajor !== kernelMajor;
  const kernelMinorBump =
    !kernelMajorBump &&
    kernelMajor !== null &&
    previousKernelMajor !== null &&
    kernelMajor === previousKernelMajor &&
    !!row.versions.kernel &&
    !!previousRow?.versions.kernel &&
    row.versions.kernel !== previousRow.versions.kernel;

  const nvidiaMajor = majorNumber(row.versions.nvidia);
  const previousNvidiaMajor = majorNumber(previousRow?.versions.nvidia);
  const nvidiaMajorBump =
    nvidiaMajor !== null &&
    previousNvidiaMajor !== null &&
    previousNvidiaMajor !== nvidiaMajor;
  const nvidiaParts = majorMinor(row.versions.nvidia);
  const previousNvidiaParts = majorMinor(previousRow?.versions.nvidia);
  const nvidiaMinorBump =
    !nvidiaMajorBump &&
    nvidiaParts.major !== null &&
    previousNvidiaParts.major !== null &&
    nvidiaParts.minor !== null &&
    previousNvidiaParts.minor !== null &&
    nvidiaParts.major === previousNvidiaParts.major &&
    nvidiaParts.minor !== previousNvidiaParts.minor;

  const mesaMajor = majorNumber(row.versions.mesa);
  const previousMesaMajor = majorNumber(previousRow?.versions.mesa);
  const mesaMajorBump =
    mesaMajor !== null &&
    previousMesaMajor !== null &&
    previousMesaMajor !== mesaMajor;
  const mesaMinorBump =
    !mesaMajorBump &&
    mesaMajor !== null &&
    previousMesaMajor !== null &&
    mesaMajor === previousMesaMajor &&
    !!row.versions.mesa &&
    !!previousRow?.versions.mesa &&
    row.versions.mesa !== previousRow.versions.mesa;

  const gnomeMajor = majorNumber(row.versions.gnome);
  const previousGnomeMajor = majorNumber(previousRow?.versions.gnome);
  const gnomeMajorBump =
    gnomeMajor !== null &&
    previousGnomeMajor !== null &&
    previousGnomeMajor !== gnomeMajor;
  const gnomeParts = majorMinor(row.versions.gnome);
  const previousGnomeParts = majorMinor(previousRow?.versions.gnome);
  const gnomeMinorBump =
    !gnomeMajorBump &&
    gnomeParts.major !== null &&
    previousGnomeParts.major !== null &&
    gnomeParts.minor !== null &&
    previousGnomeParts.minor !== null &&
    gnomeParts.major === previousGnomeParts.major &&
    gnomeParts.minor !== previousGnomeParts.minor;

  return (
    <article className={styles.timelineNode}>
      <div className={emphasize ? `${styles.nodeBody} ${styles.nodeBodyLatest}` : styles.nodeBody}>
        <header className={styles.nodeHeader}>
          {row.releaseUrl ? (
            <Link to={row.releaseUrl} target="_blank" rel="noopener noreferrer" className={styles.releaseTagLink}>
              <strong className={styles.releaseTag}>{row.tag}</strong>
            </Link>
          ) : (
            <strong className={styles.releaseTag}>{row.tag}</strong>
          )}
          <span className={styles.releaseDate}>{formatDate(row.publishedAt)}</span>
        </header>

        <div className={styles.majorVersions}>
          <div
            className={
              kernelMajorBump
                ? `${styles.majorVersionCard} ${styles.majorBump}`
                : kernelMinorBump
                  ? `${styles.majorVersionCard} ${styles.minorBump}`
                  : styles.majorVersionCard
            }
          >
            <span className={styles.majorVersionLabel}>Kernel</span>
            <VersionValue value={kernel} />
            {kernelMajorBump && <span className={styles.bumpTag}>Major bump</span>}
            {kernelMinorBump && <span className={styles.minorTag}>Minor bump</span>}
          </div>
          {hwe !== null && (
            <div className={styles.majorVersionCard}>
              <span className={styles.majorVersionLabel}>HWE Kernel</span>
              <VersionValue value={hwe} />
              {hweIsPinned && (
                <span
                  className={styles.pinnedTag}
                  title={`Pinned to ${cleanVersion(pins!.hweKernel)} by maintainer — not following upstream`}
                >
                  📌 Pinned
                </span>
              )}
            </div>
          )}
          <div
            className={
              nvidiaMajorBump
                ? `${styles.majorVersionCard} ${styles.nvidiaCard} ${styles.nvidiaMajorBump}`
                : nvidiaMinorBump
                  ? `${styles.majorVersionCard} ${styles.nvidiaCard} ${styles.nvidiaMinorBump}`
                  : `${styles.majorVersionCard} ${styles.nvidiaCard}`
            }
          >
            <span className={styles.majorVersionLabel}>{isLts ? "NVIDIA (GDX)" : "NVIDIA"}</span>
            <VersionValue value={nvidia} />
            {nvidiaMajorBump && <span className={styles.nvidiaBumpTag}>Major bump</span>}
            {nvidiaMinorBump && <span className={styles.nvidiaMinorTag}>Minor bump</span>}
          </div>
          <div
            className={
              mesaMajorBump
                ? `${styles.majorVersionCard} ${styles.mesaCard} ${styles.mesaMajorBump}`
                : mesaMinorBump
                  ? `${styles.majorVersionCard} ${styles.mesaCard} ${styles.mesaMinorBump}`
                  : `${styles.majorVersionCard} ${styles.mesaCard}`
            }
          >
            <span className={styles.majorVersionLabel}>Mesa</span>
            <VersionValue value={mesa} />
            {mesaMajorBump && <span className={styles.mesaBumpTag}>Major bump</span>}
            {mesaMinorBump && <span className={styles.mesaMinorTag}>Minor bump</span>}
          </div>
          <div
            className={
              gnomeMajorBump
                ? `${styles.majorVersionCard} ${styles.gnomeCard} ${styles.gnomeMajorBump}`
                : gnomeMinorBump
                  ? `${styles.majorVersionCard} ${styles.gnomeCard} ${styles.gnomeMinorBump}`
                  : `${styles.majorVersionCard} ${styles.gnomeCard}`
            }
          >
            <span className={styles.majorVersionLabel}>GNOME</span>
            <VersionValue value={gnome} />
            {gnomeMajorBump && <span className={styles.gnomeBumpTag}>Major bump</span>}
            {gnomeMinorBump && <span className={styles.gnomeMinorTag}>Minor bump</span>}
          </div>
        </div>

        <div className={styles.rebaseInline}>
          <span className={styles.rebaseInlineLabel}>Rebase to this release</span>
          <div className={styles.commandBlock}>
            <CodeBlock language="bash">{rebaseCommandForTag(row.tag)}</CodeBlock>
          </div>
        </div>
      </div>
    </article>
  );
}

interface DriverVersionsCatalogProps {
  streamId: "bluefin-stable" | "bluefin-lts" | "dakota-latest";
}

export default function DriverVersionsCatalog({ streamId }: DriverVersionsCatalogProps): React.JSX.Element {
  const allStreams = Array.isArray(catalog.streams) ? catalog.streams : [];
  const stream = allStreams.find((entry) => entry.id === streamId);
  const fallbackLabel = streamId === "bluefin-lts" ? "LTS and GDX" : streamId === "dakota-latest" ? "Dakotaraptor" : "Stable";

  if (!stream && allStreams.length > 0) {
    return (
      <div className={styles.timelinePage}>
        <aside className={styles.archiveRail} aria-hidden="true">
          <span className={styles.archiveNow}>Now</span>
          <span className={styles.archivePast}>Past</span>
        </aside>
        <section className={styles.streamSection}>
          <header className={styles.streamHeader}>
            <span className={styles.streamMeta}>cache · 0 releases in {fallbackLabel}</span>
          </header>
          <p className={styles.emptyText}>No releases in the last 90 days for this stream.</p>
        </section>
      </div>
    );
  }

  if (!stream) {
    return <p className={styles.emptyText}>No driver version data available yet.</p>;
  }

  return (
    <div className={styles.timelinePage}>
      <aside className={styles.archiveRail} aria-hidden="true">
        <span className={styles.archiveNow}>Now</span>
        <span className={styles.archivePast}>Past</span>
      </aside>

      {(() => {
        const latest = stream.latest;
        const older = stream.history
          .slice(1)
          .filter(
            (row) =>
              row.versions.kernel ||
              row.versions.nvidia ||
              row.versions.mesa ||
              row.versions.gnome,
          );

        const streamPins = pinsCatalog.streams?.[streamId] ?? null;

        // Detect historically-pinned HWE kernels from SBOM data:
        // a kernel version that appears in 2+ consecutive rows was held intentionally.
        const allRows = stream.history.filter((r) => r.versions.hweKernel);
        const hweCounts = new Map<string, number>();
        for (const r of allRows) {
          const v = r.versions.hweKernel!;
          hweCounts.set(v, (hweCounts.get(v) ?? 0) + 1);
        }
        const pinnedHweKernels = new Set(
          [...hweCounts.entries()].filter(([, count]) => count >= 2).map(([v]) => v),
        );

        const currentUserspace = latest ? extractUserspace(latest) : null;

        return (
          <section key={stream.id} className={styles.streamSection}>
            <header className={styles.streamHeader}>
              <span className={styles.streamMeta}>
                {stream.source} · {stream.rowCount} releases in {streamId === "bluefin-lts" ? "LTS and GDX" : streamId === "dakota-latest" ? "Dakotaraptor" : "Stable"} ·
                updated {formatDate(catalog.generatedAt)}
              </span>
              {currentUserspace && (
                <span className={styles.fedoraPill}>
                  {currentUserspace.label}
                </span>
              )}
            </header>

            {latest ? (
              <>
                <div className={styles.timeline}>
                  <ReleaseNode row={latest} previousRow={older[0]} emphasize pins={streamPins} isLts={streamId === "bluefin-lts"} pinnedHweKernels={pinnedHweKernels} />
                </div>

                {older.length > 0 && (
                  <div className={styles.archiveTimeline}>
                    {older.map((row, index) => {
                      const prevRow = index === 0 ? latest : older[index - 1];
                      const prevUs = prevRow ? extractUserspace(prevRow) : null;
                      const rowUs = extractUserspace(row);
                      const showMarker = prevUs !== null && rowUs !== null && prevUs.key !== rowUs.key;
                      return (
                        <React.Fragment key={`${stream.id}-${row.tag}-${row.publishedAt || "na"}`}>
                          {showMarker
                            ? <UserspaceMarker toLabel={prevUs!.label} fromLabel={rowUs!.label} />
                            : <div className={styles.releaseDivider} />
                          }
                          <ReleaseNode
                            row={row}
                            previousRow={older[index + 1]}
                            emphasize={false}
                            pins={streamPins}
                            isLts={streamId === "bluefin-lts"}
                            pinnedHweKernels={pinnedHweKernels}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                <section className={styles.rebaseSection}>
                  <Heading as="h3" className={styles.rebaseTitle}>
                    Final Step: Reboot
                  </Heading>
                  <ol className={styles.rebaseList}>
                    <li>
                      After running one of the per-release rebase commands above, reboot to activate the deployment:
                      <div className={styles.commandBlock}>
                        <CodeBlock language="bash">sudo systemctl reboot</CodeBlock>
                      </div>
                    </li>
                  </ol>
                </section>
              </>
            ) : (
              <p className={styles.emptyText}>No release rows parsed for this stream yet.</p>
            )}
          </section>
        );
      })()}
    </div>
  );
}
