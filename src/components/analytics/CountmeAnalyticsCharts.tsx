import React, { useState, useMemo, useEffect } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import {
  readableInk,
  seriesDash,
  withAlpha,
  type SeverityLevel,
} from "../factory/chartTheme";
import { FIRST_PARTY_PENDING_REASON } from "@site/scripts/lib/countme-sources.mjs";
import {
  DAILY_STREAMS,
  DAILY_URL,
  FIRST_PARTY_ORIGIN,
  familyDaily,
  latestDaily,
  measuredDays,
  type DailyDataset,
  type FamilyDaily,
} from "./firstPartyCountme";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import "../factory/tokens.css";
import styles from "./CountmeAnalyticsCharts.module.css";

/**
 * The registry snapshot is generated at build time and is not a tracked seed,
 * so it is fetched rather than imported: a static import of a file that may not
 * exist fails the build instead of rendering a panel that says why.
 */
const REGISTRY_URL = "/data/ghcr-packages.json";

/**
 * Active-system counts come from the first-party service and nothing else.
 *
 * The reader lives in `./firstPartyCountme`, and is imported rather than
 * re-exported from here. This file holds the image catalogue, and
 * `scripts/countme-first-party.test.js` forbids one file from holding both a
 * catalogue of our image ids and a computed index into a countme week. That
 * pairing twice published a Fedora-derived number under a Project Bluefin name,
 * so the two stay in separate files and the gate stays a real gate.
 */

/**
 * The one upstream series anyone may publish, per `UPSTREAM_ALLOWED`:
 * `ublue-os/bluefin:stable`, counted by `ublue-os/countme`.
 *
 * Both are read through our own worker rather than from GitHub directly, so the
 * page talks to a single origin and `raw.githubusercontent.com` does not need
 * to appear in `connect-src` for this.
 *
 * Upstream publishes a rendered chart and a rounded badge value, and no
 * time-series file, so this panel shows the image it publishes rather than
 * replotting a series that does not exist.
 */
const LEGACY_CHART_URL = `${FIRST_PARTY_ORIGIN}/legacy/bluefin.svg`;
const LEGACY_BADGE_URL = `${FIRST_PARTY_ORIGIN}/badge-endpoints/bluefin.json`;

/**
 * `2026-07-13` as `Jul 13`.
 *
 * Nine ISO dates across one axis repeat the year nine times and leave no room
 * to read any of them. The full date stays on the axis data, so the tooltip and
 * the numbers table below still carry it.
 */
export function compactWeek(week: string): string {
  const d = new Date(`${week}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? week
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
}

/**
 * Marker shapes, paired with the palette index like `seriesDash`.
 *
 * The Bluefin categorical ramp is six shades of a single blue, so hue alone
 * cannot tell two series apart. Shape and dash carry the distinction instead,
 * which is also what makes the chart readable in greyscale.
 */
export const SERIES_SYMBOLS = ["circle", "triangle", "diamond"] as const;

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

/** What an empty daily card says until its image family reports. */
export const NO_RAPTORS = "No raptors reporting in, life finds a way";

/**
 * One image family's systems active per day, by stream: the latest value of
 * each stream as text, then the chart, or the reason there is no chart.
 */
function DailyPanel({
  daily,
  label,
  reason,
  cat,
}: {
  daily: FamilyDaily;
  label: string;
  reason: string;
  cat: string[];
}): React.JSX.Element {
  const measured = measuredDays(daily);
  const readings = DAILY_STREAMS.map((stream) => {
    const values = daily.streams[stream];
    for (let i = values.length - 1; i >= 0; i -= 1) {
      if (values[i] !== null) {
        return {
          stream,
          text: `${values[i]!.toLocaleString()} (${daily.days[i]})`,
        };
      }
    }
    return { stream, text: "accumulating data" };
  });
  const option = useMemo(
    () => ({
      grid: { left: 56, right: 24, top: 16, bottom: 48, containLabel: true },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: daily.days,
        axisLabel: {
          fontSize: 13,
          hideOverlap: true,
          formatter: (value: string) => compactWeek(value),
        },
      },
      // Anchored at zero: a floating floor turns a flat series into a cliff.
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 1,
        axisLabel: { fontSize: 13 },
      },
      legend: { textStyle: { fontSize: 13 }, itemGap: 18 },
      series: DAILY_STREAMS.map((stream, i) => ({
        name: `${label} :${stream}`,
        type: "line",
        // Gaps break the line rather than being bridged or turned into zero.
        smooth: false,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 7,
        symbol: SERIES_SYMBOLS[i],
        data: daily.streams[stream],
        itemStyle: { color: cat[i % cat.length] },
        lineStyle: {
          width: 2,
          color: cat[i % cat.length],
          type: seriesDash(i),
        },
      })),
    }),
    [daily, label, cat],
  );
  return (
    <>
      <p className={styles.legendRow}>
        {readings.map(({ stream, text }, i) => (
          <span key={stream} className={styles.legendChip}>
            <span
              className={styles.legendGlyph}
              aria-hidden="true"
              style={{ color: cat[i % cat.length] }}
            >
              ●
            </span>
            {label} :{stream}: {text}
          </span>
        ))}
      </p>
      {measured > 0 ? (
        <EChart
          option={option}
          title={`${label} daily active systems`}
          summary={`Systems active per day across ${measured} measured day${
            measured === 1 ? "" : "s"
          } — ${readings.map((r) => `${label} :${r.stream} ${r.text}`).join(", ")}.`}
          points={measured}
          minPoints={2}
          height={300}
          tableCaption={`${label} systems active per day by stream`}
        />
      ) : (
        // Rule 6: unavailability is visible and carries its reason.
        <Unavailable what={`${label} daily active systems`} reason={reason} />
      )}
    </>
  );
}

export interface CountmeAnalyticsChartsProps {
  registry?: GhcrDataset;
  /** Injected by tests; production fetches the daily ping counts. */
  daily?: DailyDataset;
}

export default function CountmeAnalyticsCharts({
  registry,
  daily,
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

  // ── Upstream image, the one permitted legacy series ────────────────────
  //
  // UPSTREAM_ALLOWED is the single exception to the first-party rule:
  // ublue-os/bluefin:stable, counted by ublue-os/countme. Both the badge and
  // the chart are proxied by our worker, so this stays on one origin and needs
  // no second CSP entry.
  const [legacyActive, setLegacyActive] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(LEGACY_BADGE_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const badge = (await res.json()) as { message?: string };
        setLegacyActive(badge?.message ?? null);
      } catch {
        setLegacyActive(null);
      }
    })();
  }, []);

  // ── Bluefin and Bluefin Utah: daily pings from projectbluefin-countme ─
  const [fetchedDaily, setFetchedDaily] = useState<DailyDataset | null>(null);
  const [dailyReason, setDailyReason] = useState<string | null>(null);

  useEffect(() => {
    if (daily) return;
    void (async () => {
      try {
        const res = await fetch(DAILY_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFetchedDaily((await res.json()) as DailyDataset);
      } catch {
        // A panel reason is published copy: generic, no service posture.
        setDailyReason(FIRST_PARTY_PENDING_REASON);
      }
    })();
  }, [daily]);

  const dailyData = daily ?? fetchedDaily;
  const emptyReason = dailyData?.stateReason ?? dailyReason ?? NO_RAPTORS;
  const bluefin = useMemo(
    () => familyDaily(dailyData?.days ?? [], "dakota"),
    [dailyData],
  );
  const utah = useMemo(
    () => familyDaily(dailyData?.days ?? [], "utah"),
    [dailyData],
  );
  const bluefinLatest = latestDaily(bluefin);

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
      {/* ── 1. Bluefin: daily active systems ─────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin
          </Heading>
          <p className={styles.sectionSubtext}>Systems active per day.</p>
        </header>
        <DailyPanel
          daily={bluefin}
          label="Bluefin"
          reason={emptyReason}
          cat={cat}
        />
      </section>

      {/* ── 2. Bluefin Utah: daily active systems ────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin Utah
          </Heading>
          <p className={styles.sectionSubtext}>Systems active per day.</p>
        </header>
        <DailyPanel
          daily={utah}
          label="Bluefin Utah"
          reason={emptyReason}
          cat={cat}
        />
      </section>

      {/* ── 3. Upstream image, for watching the migration ────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin Classic (ublue-os/bluefin)
          </Heading>
          <p className={styles.sectionSubtext}>
            <code>ublue-os/bluefin:stable</code>, counted by{" "}
            <Link to="https://github.com/ublue-os/countme">
              ublue-os/countme
            </Link>
            . Metalink hits, not image check-ins.
          </p>
        </header>
        {/* Rule 1: both sides of the comparison carry their current value. */}
        <p className={styles.legendRow}>
          <span className={styles.legendChip}>
            <span className={styles.legendGlyph} aria-hidden="true">
              ◇
            </span>
            Bluefin Classic: {legacyActive ?? "unavailable"}
          </span>
          <span className={styles.legendChip}>
            <span className={styles.legendGlyph} aria-hidden="true">
              ●
            </span>
            Bluefin:{" "}
            {bluefinLatest
              ? `${bluefinLatest.value.toLocaleString()} (${bluefinLatest.day})`
              : "accumulating data"}
          </span>
        </p>

        {legacyActive === null ? (
          <Unavailable
            what="Upstream count"
            reason="The upstream badge could not be read."
          />
        ) : (
          <figure className={styles.legacyFigure}>
            <img
              className={styles.legacyChart}
              src={LEGACY_CHART_URL}
              alt={`Bluefin Classic (ublue-os/bluefin) growth chart. Current upstream active users: ${legacyActive}.`}
              loading="lazy"
              width={1200}
              height={700}
            />
            <figcaption className={styles.chartNote}>
              Published by <code>ublue-os/countme</code>, recoloured only.
              Upstream&rsquo;s scale.
            </figcaption>
          </figure>
        )}
      </section>

      {/* ── 4. Image × stream publication matrix ────────────────────────── */}
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

      {/* ── 5. Family cards ─────────────────────────────────────────────── */}
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
