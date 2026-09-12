import React, { useState, useMemo, useEffect } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import {
  readableInk,
  withAlpha,
  type SeverityLevel,
} from "../factory/chartTheme";
import {
  FIRST_PARTY_PENDING_REASON,
  UPSTREAM_ALLOWED,
} from "@site/scripts/lib/countme-sources.mjs";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import "../factory/tokens.css";
import styles from "./CountmeAnalyticsCharts.module.css";

/**
 * The registry snapshot is generated at build time and is not a tracked seed,
 * so it is fetched rather than imported: a static import of a file that may not
 * exist fails the build instead of rendering a panel that says why.
 */
const REGISTRY_URL = "/data/ghcr-packages.json";

/** One published tag of one GHCR package, as `scripts/fetch-ghcr-packages.js` writes it. */
export interface GhcrStream {
  tag: string;
  publishedAt?: string | null;
  ageDays?: number | null;
  state?: string | null;
  stateReason?: string | null;
}

export interface GhcrPackage {
  name: string;
  family: string;
  streams?: GhcrStream[];
  versionCount?: number;
}

export interface GhcrDataset {
  generatedAt?: string;
  source?: string;
  packages?: GhcrPackage[];
  unavailable?: boolean;
  stateReason?: string | null;
}

/**
 * Parse a raw count value, preserving 0 as a valid measurement.
 * Returns null for undefined, null, empty string, or non-finite values.
 */
export function parseCount(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * The promotion axis, in promotion order.
 *
 * Read from source, not from `projectbluefin/common` →
 * `docs/skills/image-registry.md`, which still claims `bluefin-lts` promotes to
 * `:lts`. Every repo's `execute-release.yml` targets `stable`:
 *
 *   bluefin      {"source_tag":"testing","target_tag":"stable"}
 *   bluefin-lts  {"source_tag":"testing","target_tag":"stable"}
 *   dakota       {"source_tag":"<build sha>","target_tag":"stable"}
 *
 * `:lts`, `:gts` and `:latest` still sit on some images as leftovers from
 * retired schemes. Nothing promotes through them, so they are not columns — a
 * column that is a dash down most of the grid teaches nobody anything.
 */
export const STREAM_COLUMNS = ["testing", "stable"] as const;
export type StreamTag = (typeof STREAM_COLUMNS)[number];

export interface ProjectBluefinImageSpec {
  id: "bluefin" | "bluefin-lts" | "dakota" | "utah" | "server";
  name: string;
  edition: string;
  /** Upstream the image is composed from. */
  base: string;
  /** Index into the resolved `--fx-cat-*` ramp. Never a literal colour. */
  cat: number;
  link: string;
  status: "active" | "bootstrapping" | "provisioning";
  statusText: string;
  /** GHCR packages this family promotes, in release-workflow order. */
  images: string[];
  /** Packages still in the registry that no release workflow promotes. */
  retired?: string[];
  /** `oci` families appear in the stream matrix; `ddi` families ship no container tags. */
  delivery: "oci" | "ddi";
}

/**
 * Every image family `projectbluefin/common` ships into, with the GHCR packages
 * each one promotes.
 *
 * **Derived from each repo's `execute-release.yml` promotion matrix, not from
 * `common` → `docs/skills/image-registry.md`.** That file was the source here
 * and it is wrong on three counts: it claims `bluefin-lts` promotes to `:lts`,
 * it lists the retired `-hwe` images as live, and it omits `bluefin-lts-nvidia`
 * and both dakota gaming images entirely. Re-derive before editing this list:
 *
 * ```bash
 * for r in bluefin bluefin-lts dakota; do
 *   gh api "repos/projectbluefin/$r/contents/.github/workflows/execute-release.yml" \
 *     --jq .content | base64 -d | grep -E '"image"'
 * done
 * ```
 *
 * `id` is the first-party countme `repo` identifier.
 */
export const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
  {
    id: "bluefin",
    name: "Bluefin",
    edition: "Flagship Workstation",
    base: "Fedora",
    cat: 0,
    link: "/downloads",
    status: "active",
    statusText: "Active Tracking",
    images: ["bluefin", "bluefin-nvidia"],
    delivery: "oci",
  },
  {
    id: "bluefin-lts",
    name: "Bluefin LTS",
    edition: "Enterprise Workstation",
    base: "CentOS Stream 10",
    cat: 1,
    link: "/lts",
    status: "active",
    statusText: "Active · EPEL",
    images: ["bluefin-lts", "bluefin-lts-nvidia"],
    retired: ["bluefin-lts-hwe", "bluefin-lts-hwe-nvidia"],
    delivery: "oci",
  },
  {
    id: "dakota",
    name: "Project Bluefin Dakota",
    edition: "Next-Gen BuildStream",
    base: "GNOME OS / BuildStream 2",
    cat: 2,
    link: "/dakota",
    status: "bootstrapping",
    statusText: "Alpha · Collecting",
    images: [
      "dakota",
      "dakota-nvidia",
      "dakota-gaming",
      "dakota-nvidia-gaming",
    ],
    delivery: "oci",
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Hummingbird",
    base: "Fedora Hummingbird",
    cat: 3,
    link: "/utah",
    status: "provisioning",
    statusText: "Pre-alpha · Provisioning",
    images: [],
    delivery: "oci",
  },
  {
    id: "server",
    name: "Bluefin Server",
    edition: "Image-Based Server",
    base: "freedesktop-sdk 26.08",
    cat: 4,
    link: "https://github.com/projectbluefin/server",
    status: "provisioning",
    statusText: "Alpha · DDI delivery",
    images: [],
    delivery: "ddi",
  },
];

/**
 * Publication recency as one hue at four intensities plus a glyph.
 *
 * `fetch-ghcr-packages.js` already decides `fresh` vs `stale` per tag against
 * that lane's own cadence budget, so this only splits `stale` by how far past
 * the budget it has drifted. An absent stream is `unknown` — a gap, not a zero.
 */
export function freshnessLevel(stream?: GhcrStream | null): SeverityLevel {
  const age = parseCount(stream?.ageDays);
  if (!stream || age === null) return "unknown";
  if (stream.state === "fresh") return "ok";
  return age >= 30 ? "alert" : "watch";
}

const LEVEL_ORDINAL: Record<SeverityLevel, number> = {
  unknown: 0,
  ok: 1,
  watch: 2,
  alert: 3,
};

export interface MatrixRow {
  image: string;
  family: ProjectBluefinImageSpec;
}

export interface MatrixCell {
  x: number;
  y: number;
  image: string;
  stream: StreamTag;
  level: SeverityLevel;
  ageDays: number | null;
  publishedAt: string | null;
  reason: string | null;
}

/** Every OCI image the families publish, flattened into heatmap rows. */
export function matrixRows(
  families: ProjectBluefinImageSpec[] = BLUEFIN_FAMILY_IMAGES,
): MatrixRow[] {
  return families
    .filter((f) => f.delivery === "oci")
    .flatMap((family) => family.images.map((image) => ({ image, family })));
}

/**
 * Join the image catalogue against the registry snapshot.
 *
 * The catalogue drives the grid, not the snapshot: an image the factory is
 * supposed to publish but the registry does not carry still gets a cell, marked
 * unknown. A silently missing row and a published-but-stale row are different
 * claims.
 */
export function buildStreamMatrix(
  rows: MatrixRow[],
  packages: GhcrPackage[],
): MatrixCell[] {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const cells: MatrixCell[] = [];
  rows.forEach((row, y) => {
    STREAM_COLUMNS.forEach((stream, x) => {
      const published = byName
        .get(row.image)
        ?.streams?.find((s) => s.tag === stream);
      cells.push({
        x,
        y,
        image: row.image,
        stream,
        level: freshnessLevel(published),
        ageDays: parseCount(published?.ageDays),
        publishedAt: published?.publishedAt ?? null,
        reason:
          published?.stateReason ??
          (published ? null : "no version published under this tag"),
      });
    });
  });
  return cells;
}

export interface CountmeAnalyticsChartsProps {
  registry?: GhcrDataset;
}

export default function CountmeAnalyticsCharts({
  registry,
}: CountmeAnalyticsChartsProps = {}): React.JSX.Element {
  const [themeRef, fxTheme] = useFactoryTheme();
  const cat = fxTheme.categorical;
  const sev = fxTheme.severity;
  const [fetchedRegistry, setFetchedRegistry] = useState<GhcrDataset | null>(
    null,
  );
  const [registryReason, setRegistryReason] = useState<string | null>(null);
  const base = useBaseUrl("/");

  useEffect(() => {
    if (registry) return;
    const url = base.replace(/\/$/, "") + REGISTRY_URL;
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFetchedRegistry((await res.json()) as GhcrDataset);
      } catch (err) {
        setRegistryReason(
          `${REGISTRY_URL} could not be read (${(err as Error).message}). ` +
            `It is generated at build time and may not exist in this environment.`,
        );
      }
    })();
  }, [base, registry]);

  const ghcr = registry ?? fetchedRegistry;

  // ── Image × stream publication matrix ──────────────────────────────────
  const ghcrPackages = ghcr?.packages ?? [];
  const rows = useMemo(() => matrixRows(), []);
  const cells = useMemo(
    () => buildStreamMatrix(rows, ghcrPackages),
    [rows, ghcrPackages],
  );
  const publishedCells = cells.filter((c) => c.ageDays !== null).length;

  const matrixOption = useMemo(
    () => ({
      // The shared option supplies a legend; a single-series heatmap has no use
      // for one, and it lands on top of the stream labels.
      legend: { show: false },
      grid: { left: 200, right: 32, top: 12, bottom: 44, containLabel: false },
      tooltip: {
        trigger: "item",
        formatter: (p: { data: { tip: string } }) => p.data.tip,
      },
      xAxis: {
        type: "category",
        position: "bottom",
        data: STREAM_COLUMNS.map((s) => `:${s}`),
        axisLabel: { fontSize: 13, fontWeight: 600 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((r) => r.image),
        axisLabel: { fontSize: 12 },
        splitArea: { show: false },
      },
      visualMap: {
        show: false,
        type: "piecewise",
        pieces: (Object.keys(LEVEL_ORDINAL) as SeverityLevel[]).map(
          (level) => ({
            value: LEVEL_ORDINAL[level],
            color: sev[level].color,
          }),
        ),
      },
      series: [
        {
          name: "Stream freshness",
          type: "heatmap",
          data: cells.map((c) => {
            const level = sev[c.level];
            return {
              value: [c.x, c.y, LEVEL_ORDINAL[c.level]],
              text: c.ageDays === null ? "—" : `${level.glyph} ${c.ageDays}d`,
              label: { color: readableInk(level.color) },
              tip: [
                `${c.image}:${c.stream}`,
                c.ageDays === null
                  ? "No published version"
                  : `Published ${c.ageDays} day${c.ageDays === 1 ? "" : "s"} ago — ${level.word}`,
                c.publishedAt
                  ? `Last push ${c.publishedAt.slice(0, 10)}`
                  : null,
                c.reason,
              ]
                .filter(Boolean)
                .join("\n"),
            };
          }),
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 600,
            formatter: (p: { data: { text: string } }) => p.data.text,
          },
          itemStyle: {
            borderColor: withAlpha(fxTheme.palette.border, 0.9),
            borderWidth: 2,
            borderRadius: 6,
          },
          emphasis: {
            itemStyle: { borderColor: cat[0], borderWidth: 3 },
          },
        },
      ],
    }),
    [rows, cells, sev, cat, fxTheme.palette.border],
  );

  const packageIndex = new Map(ghcrPackages.map((p) => [p.name, p]));

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {/* ── 1. Where a Project Bluefin count comes from ──────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Weekly Active Systems
          </Heading>
          <p className={styles.sectionSubtext}>
            Project Bluefin counts its own images. Every number for{" "}
            <code>bluefin</code>, <code>bluefin-lts</code>, <code>dakota</code>,{" "}
            <code>utah</code> and <code>server</code> comes from{" "}
            <code>countme.projectbluefin.io</code> and nothing else.
          </p>
        </header>

        <Unavailable
          what="Weekly active systems"
          reason={FIRST_PARTY_PENDING_REASON}
        />

        <p className={styles.chartNote}>
          <strong>Why not Fedora&rsquo;s numbers:</strong> Fedora and{" "}
          <code>ublue-os/countme</code> only see a machine when it reaches a
          Fedora or EPEL mirror. They undercount bootc, and they cannot see
          stream, flavor or game mode at all. Bluefin LTS is the sharpest case:
          it is CentOS Stream based, so upstream sees it only through whichever
          EPEL mirrors it happens to hit, which is not a population and must not
          be published as one. The one upstream figure that is still upstream
          &rsquo;s to publish is{" "}
          <Link href={UPSTREAM_ALLOWED.source}>
            <code>{UPSTREAM_ALLOWED.id}</code>
          </Link>{" "}
          &mdash; the pre-migration image, counted by{" "}
          <code>ublue-os/countme</code>.
        </p>
      </section>

      {/* ── 2. Image × stream publication matrix ────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Image &times; Stream Publication Matrix
          </Heading>
          <p className={styles.sectionSubtext}>
            Days since each published image last pushed to each promotion
            stream. One hue at four intensities, plus a glyph:
          </p>
          <p className={styles.legendRow}>
            {(["ok", "watch", "alert", "unknown"] as SeverityLevel[]).map(
              (level) => (
                <span key={level} className={styles.legendChip}>
                  <span
                    aria-hidden="true"
                    className={styles.legendGlyph}
                    style={{ color: sev[level].color }}
                  >
                    {sev[level].glyph}
                  </span>
                  {sev[level].word}
                </span>
              ),
            )}
          </p>
        </header>

        {ghcr?.unavailable || !ghcrPackages.length ? (
          <Unavailable
            what="Image stream matrix"
            reason={
              ghcr?.stateReason ??
              registryReason ??
              "Reading the registry snapshot…"
            }
          />
        ) : (
          <EChart
            option={matrixOption}
            title="Image stream freshness"
            summary={`${publishedCells} of ${cells.length} image-stream lanes carry a published version, across ${rows.map((r) => r.image).join(", ")} and the :${STREAM_COLUMNS.join(", :")} streams.`}
            points={publishedCells}
            minPoints={1}
            height={rows.length * 46 + 64}
            tableCaption="Days since last publish per image and promotion stream"
          />
        )}

        <p className={styles.chartNote}>
          <strong>Streams:</strong> every image promotes <code>:testing</code>{" "}
          &rarr; <code>:stable</code>, which is the whole axis. Read from each
          repository&rsquo;s <code>execute-release.yml</code> promotion matrix.
          The <code>:lts</code>, <code>:gts</code> and <code>:latest</code> tags
          still sit on some images as leftovers from retired schemes; nothing
          promotes through them, so they are not columns here.
        </p>
      </section>

      {/* ── 4. Family cards ─────────────────────────────────────────────── */}
      <section className={styles.familySection}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Project Bluefin Image Family
          </Heading>
          <p className={styles.sectionSubtext}>
            Every image <code>projectbluefin/common</code> ships into, with the
            GHCR flavors each family publishes.
          </p>
        </header>

        <div className={styles.familyGrid}>
          {BLUEFIN_FAMILY_IMAGES.map((img) => (
            <article key={img.id} className={styles.familyCard}>
              <div className={styles.familyCardHeader}>
                <div className={styles.familyCardTitleGroup}>
                  <Heading as="h4" className={styles.familyName}>
                    {img.name}
                  </Heading>
                  <span className={styles.familyEdition}>
                    {img.edition} · {img.base}
                  </span>
                </div>
                <span
                  className={`${styles.statusPill} ${
                    img.status === "active"
                      ? styles.statusActive
                      : styles.statusPending
                  }`}
                >
                  {img.statusText}
                </span>
              </div>

              <ul className={styles.variantList}>
                {img.images.length === 0 ? (
                  <li className={styles.variantEmpty}>
                    {img.delivery === "ddi"
                      ? "DDI + systemd-sysupdate delivery — no container stream"
                      : "No image published to GHCR yet"}
                  </li>
                ) : (
                  img.images.map((name) => (
                    <li key={name} className={styles.variantRow}>
                      <code className={styles.variantName}>{name}</code>
                      <span className={styles.variantStreams}>
                        {STREAM_COLUMNS.map((stream) => {
                          const published = packageIndex
                            .get(name)
                            ?.streams?.find((s) => s.tag === stream);
                          const level = freshnessLevel(published);
                          const age = parseCount(published?.ageDays);
                          return (
                            <span
                              key={stream}
                              className={styles.streamChip}
                              title={`${name}:${stream} — ${sev[level].word}${
                                age === null ? "" : `, ${age} days old`
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={styles.legendGlyph}
                                style={{ color: sev[level].color }}
                              >
                                {sev[level].glyph}
                              </span>
                              {stream} {age === null ? "—" : `${age}d`}
                            </span>
                          );
                        })}
                      </span>
                    </li>
                  ))
                )}
                {img.retired?.length ? (
                  <li className={styles.variantEmpty}>
                    Retired, still in the registry:{" "}
                    {img.retired.map((name, i) => (
                      <React.Fragment key={name}>
                        {i > 0 && ", "}
                        <code>{name}</code>
                      </React.Fragment>
                    ))}
                  </li>
                ) : null}
              </ul>

              <div className={styles.familyFooter}>
                <Link to={img.link} className={styles.familyLink}>
                  {img.name} details &rarr;
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
