import React from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import CodeBlock from "@theme/CodeBlock";
import driverVersionsData from "@site/static/data/driver-versions.json";
import styles from "./DriverVersionsCatalog.module.css";

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

function VersionValue({ value }: { value: string | null | undefined }) {
  if (!value) {
    return <span className={`${styles.majorVersionValue} ${styles.versionMissing}`}>N/A</span>;
  }
  return <span className={styles.majorVersionValue}>{value}</span>;
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

function rebaseCommandForTag(tag: string) {
  const safeTag = /^[a-z0-9][a-z0-9._-]*$/i.test(tag) ? tag : "stable";
  return `sudo bootc switch --enforce-container-sigpolicy "ghcr.io/$(jq -r '.["image-name"]' /usr/share/ublue-os/image-info.json):${safeTag}"`;
}

function ReleaseNode({
  row,
  previousRow,
  emphasize,
}: {
  row: DriverRow;
  previousRow?: DriverRow;
  emphasize: boolean;
}) {
  const hwe = row.versions.hweKernel;

  const kernelMajor = majorNumber(row.versions.kernel);
  const previousKernelMajor = majorNumber(previousRow?.versions.kernel);
  const kernelMajorBump =
    kernelMajor !== null &&
    previousKernelMajor !== null &&
    previousKernelMajor !== kernelMajor;
  const kernelParts = majorMinor(row.versions.kernel);
  const previousKernelParts = majorMinor(previousRow?.versions.kernel);
  const kernelMinorBump =
    !kernelMajorBump &&
    kernelParts.major !== null &&
    previousKernelParts.major !== null &&
    kernelParts.minor !== null &&
    previousKernelParts.minor !== null &&
    kernelParts.major === previousKernelParts.major &&
    kernelParts.minor !== previousKernelParts.minor;

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
  const mesaParts = majorMinor(row.versions.mesa);
  const previousMesaParts = majorMinor(previousRow?.versions.mesa);
  const mesaMinorBump =
    !mesaMajorBump &&
    mesaParts.major !== null &&
    previousMesaParts.major !== null &&
    mesaParts.minor !== null &&
    previousMesaParts.minor !== null &&
    mesaParts.major === previousMesaParts.major &&
    mesaParts.minor !== previousMesaParts.minor;

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
            <VersionValue value={row.versions.kernel} />
            {kernelMajorBump && <span className={styles.bumpTag}>Major bump</span>}
            {kernelMinorBump && <span className={styles.minorTag}>Minor bump</span>}
          </div>
          {hwe !== null && (
            <div className={styles.majorVersionCard}>
              <span className={styles.majorVersionLabel}>HWE Kernel</span>
              <VersionValue value={hwe} />
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
            <span className={styles.majorVersionLabel}>NVIDIA</span>
            <VersionValue value={row.versions.nvidia} />
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
            <VersionValue value={row.versions.mesa} />
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
            <VersionValue value={row.versions.gnome} />
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
  streamId: "bluefin-stable" | "bluefin-lts";
}

export default function DriverVersionsCatalog({ streamId }: DriverVersionsCatalogProps): React.JSX.Element {
  const allStreams = Array.isArray(catalog.streams) ? catalog.streams : [];
  const stream = allStreams.find((entry) => entry.id === streamId);
  const fallbackLabel = streamId === "bluefin-lts" ? "LTS" : "Stable";

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
        const older = stream.history.slice(1);

        return (
          <section key={stream.id} className={styles.streamSection}>
            <header className={styles.streamHeader}>
              <span className={styles.streamMeta}>
                {stream.source} · {stream.rowCount} releases in {streamId === "bluefin-lts" ? "LTS" : "Stable"} ·
                updated {formatDate(catalog.generatedAt)}
              </span>
            </header>

            {latest ? (
              <>
                <div className={styles.timeline}>
                  <ReleaseNode row={latest} previousRow={older[0]} emphasize />
                </div>

                {older.length > 0 && (
                  <div className={styles.archiveTimeline}>
                    {older.map((row, index) => (
                      <ReleaseNode
                        key={`${stream.id}-${row.tag}-${row.publishedAt || "na"}`}
                        row={row}
                        previousRow={older[index + 1]}
                        emphasize={false}
                      />
                    ))}
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
