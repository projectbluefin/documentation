import React, { useState, useMemo, useEffect } from "react";
import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import EChart from "../factory/EChart";
import Unavailable from "../factory/Unavailable";
import {
  seriesDash,
  withAlpha,
  type SeverityLevel,
} from "../factory/chartTheme";
import { FIRST_PARTY_PENDING_REASON } from "@site/scripts/lib/countme-sources.mjs";
import {
  DAILY_STREAMS,
  DAILY_URL,
  FIRST_PARTY_ORIGIN,
  classicPopulation,
  sumBluefinHistories,
  familyDaily,
  type ClassicHistoryDataset,
  type DailyDataset,
  type FamilyDaily,
} from "./firstPartyCountme";
import { useFactoryTheme } from "../factory/useFactoryTheme";
import "../factory/tokens.css";
import styles from "./CountmeAnalyticsCharts.module.css";

/**
 * The registry snapshot is generated at build time and is not a tracked seed,
 * so it is fetched rather than imported: a static import of a file that may not
 * exist fails the build instead of rendering a panel that says why. The path is
 * root-absolute on purpose: translated builds ship no copy of static/ and read
 * the English one (see scripts/lib/translated-locales.mjs).
 */
const REGISTRY_URL = "/data/ghcr-packages.json";
const CLASSIC_HISTORY_URL = "/data/classic-countme-history.json";

/**
 * First-party image counts come from the first-party service and nothing else.
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
 * Historical badge revisions are collected at build time for /analytics;
 * image pages can still embed the original upstream chart.
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
 * Read from source: every repo's `execute-release.yml` targets `stable`:
 *
 *   bluefin      {"source_tag":"testing","target_tag":"stable"}
 *   dakota       {"source_tag":"<build sha>","target_tag":"stable"}
 *
 * `:gts` and `:latest` still sit on some images as leftovers from retired
 * schemes. Nothing promotes through them, so they do not become chips — a
 * chip that is always a dash teaches nobody anything.
 */
export const STREAM_COLUMNS = ["testing", "stable"] as const;

export interface ProjectBluefinImageSpec {
  id: "bluefin" | "dakota" | "utah" | "server";
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
  /** `oci` families appear in the stream matrix; `ddi` families ship no container tags. */
  delivery: "oci" | "ddi";
}

/**
 * Every image family `projectbluefin/common` ships into, with the GHCR packages
 * each one promotes.
 *
 * **Derived from each repo's `execute-release.yml` promotion matrix, not from
 * `common` → `docs/skills/image-registry.md`**, which omits both dakota gaming
 * images. Re-derive before editing this list:
 *
 * ```bash
 * for r in bluefin dakota; do
 *   gh api "repos/projectbluefin/$r/contents/.github/workflows/execute-release.yml" \
 *     --jq .content | base64 -d | grep -E '"image"'
 * done
 * ```
 *
 * Utah's `execute-release.yml` reads its variants from the build matrix
 * instead (`build.yml`), and promotes the same four flavors as Dakota.
 *
 * `id` is the first-party countme `repo` identifier.
 */
export const BLUEFIN_FAMILY_IMAGES: ProjectBluefinImageSpec[] = [
  {
    id: "dakota",
    name: "Bluefin",
    edition: "Flagship Workstation",
    base: "GNOME OS / BuildStream 2",
    cat: 2,
    link: "/dakota",
    status: "bootstrapping",
    statusText: "Beta · Collecting",
    images: [
      "dakota",
      "dakota-nvidia",
      "dakota-gaming",
      "dakota-nvidia-gaming",
    ],
    delivery: "oci",
  },
  {
    id: "bluefin",
    name: "Bluefin Classic",
    edition: "Legacy Workstation",
    base: "Fedora",
    cat: 0,
    link: "/downloads",
    status: "active",
    statusText: "Active Tracking",
    images: ["bluefin", "bluefin-nvidia"],
    delivery: "oci",
  },
  {
    id: "utah",
    name: "Project Bluefin Utah",
    edition: "Modular Hummingbird Prototype",
    base: "Fedora Hummingbird",
    cat: 3,
    link: "/utah",
    status: "bootstrapping",
    statusText: "Alpha · Collecting",
    images: ["utah", "utah-nvidia", "utah-gaming", "utah-nvidia-gaming"],
    delivery: "oci",
  },
  {
    id: "server",
    name: "Bluefin Server",
    edition: "Kubernetes Platform",
    base: "freedesktop-sdk 26.08",
    cat: 4,
    link: "https://github.com/projectbluefin/server",
    status: "provisioning",
    statusText: "Alpha · DDI",
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

/** What an empty daily card says until its image family reports. */
export const NO_RAPTORS = "No raptors reporting in, life finds a way";

function dailyChartSeries(daily: FamilyDaily) {
  return DAILY_STREAMS.map((stream) => ({
    name: stream,
    values: daily.streams[stream],
  }));
}

/** One frame for the total and its three source charts. Numbers come from plotted data. */
function CountPanel({
  days,
  series,
  label,
  reason,
  cat,
  theme,
  cadence = "daily",
  approximate = false,
  step = false,
}: {
  days: string[];
  series: Array<{ name: string; values: Array<number | null> }>;
  label: string;
  reason: string;
  cat: string[];
  theme: { palette: { border: string; text: string } };
  cadence?: "daily" | "weekly" | "estimated";
  approximate?: boolean;
  step?: false | "end";
}): React.JSX.Element {
  let measured = 0;
  let latestIndex = -1;
  for (let i = 0; i < days.length; i += 1) {
    if (series.some((s) => s.values[i] !== null)) {
      measured += 1;
      latestIndex = i;
    }
  }
  const latestValue =
    latestIndex < 0
      ? null
      : series.reduce((sum, s) => sum + (s.values[latestIndex] ?? 0), 0);
  const title = `${label} ${cadence} active systems`;
  const valueLabel =
    latestValue === null
      ? "accumulating data"
      : `${approximate ? "About " : ""}${latestValue.toLocaleString("en-US", { maximumSignificantDigits: approximate ? 2 : 21 })} active systems`;
  const option = useMemo(
    () => ({
      grid: { left: 40, right: 16, top: 48, bottom: 40, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "line" } },
      xAxis: {
        type: "category",
        data: days,
        boundaryGap: false,
        axisLine: { lineStyle: { color: theme.palette.border, width: 0.8 } },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: withAlpha(theme.palette.border, 0.25),
            width: 0.8,
          },
        },
        axisLabel: {
          fontSize: 12,
          hideOverlap: true,
          formatter: (value: string) => compactWeek(value),
        },
      },
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: {
            color: withAlpha(theme.palette.border, 0.25),
            width: 0.8,
          },
        },
        axisLabel: { fontSize: 12 },
      },
      legend: {
        show: true,
        right: 8,
        top: 6,
        icon: "roundRect",
        itemWidth: 14,
        itemHeight: 4,
        textStyle: { fontSize: 12 },
      },
      series: series.map(({ name, values }, i) => ({
        name,
        type: "line",
        smooth: false,
        connectNulls: false,
        step,
        showSymbol: true,
        symbolSize: 6,
        symbol: SERIES_SYMBOLS[i % SERIES_SYMBOLS.length],
        data: values,
        itemStyle: { color: cat[i % cat.length] },
        lineStyle: {
          width: 2.2,
          color: cat[i % cat.length],
          type: seriesDash(i),
        },
      })),
    }),
    [days, series, cat, theme, step],
  );
  return (
    <div className={styles.dailyChart}>
      {latestValue !== null && (
        <p className={styles.currentValue}>
          <strong>{valueLabel}</strong>
          {" · "}
          {compactWeek(days[latestIndex])}
        </p>
      )}
      {measured > 0 ? (
        <EChart
          option={option}
          title={title}
          summary={
            latestValue === null
              ? "accumulating data"
              : `${valueLabel} on ${days[latestIndex]}.`
          }
          points={measured}
          minPoints={2}
          height={320}
          tableCaption={`${label} ${cadence} active systems by UTC date`}
        />
      ) : (
        <Unavailable what={title} reason={reason} />
      )}
    </div>
  );
}

function useDailyDataset(daily?: DailyDataset, enabled = true) {
  const [fetchedDaily, setFetchedDaily] = useState<DailyDataset | null>(null);
  const [dailyReason, setDailyReason] = useState<string | null>(null);

  useEffect(() => {
    if (daily || !enabled) return;
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
  }, [daily, enabled]);

  const dailyData = daily ?? fetchedDaily;
  return {
    dailyData,
    emptyReason: dailyData?.stateReason ?? dailyReason ?? NO_RAPTORS,
  };
}

function useLegacyActive(enabled = true) {
  const [reading, setReading] = useState<{ value: string | null; day: string }>(
    { value: null, day: "" },
  );
  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      try {
        const res = await fetch(LEGACY_BADGE_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const badge = (await res.json()) as { message?: string };
        setReading({
          value: typeof badge?.message === "string" ? badge.message : null,
          day: new Date().toISOString().slice(0, 10),
        });
      } catch {
        setReading({ value: null, day: "" });
      }
    })();
  }, [enabled]);
  return reading;
}

function LegacyChart({
  active,
  onError,
}: {
  active: string;
  onError?: () => void;
}): React.JSX.Element {
  return (
    <figure className={styles.legacyFigure}>
      <img
        className={styles.legacyChart}
        src={LEGACY_CHART_URL}
        alt={`Bluefin Classic (ublue-os/bluefin) growth chart. Current upstream active users: ${active}.`}
        loading="lazy"
        width={1200}
        height={700}
        onError={onError}
      />
      <figcaption className={styles.chartNote}>
        Published by <code>ublue-os/countme</code>, recoloured only.
        Upstream&rsquo;s scale.
      </figcaption>
    </figure>
  );
}

export function PerImageUsage({
  family,
  daily,
  hideHeading = false,
}: {
  family: "server" | "classic" | "dakota" | "utah" | "lts";
  /** Production reads the first-party service; callers can inject its dataset. */
  daily?: DailyDataset;
  hideHeading?: boolean;
}): React.JSX.Element {
  const [themeRef, fxTheme] = useFactoryTheme();
  const firstParty = family !== "classic" && family !== "lts";
  const { dailyData, emptyReason } = useDailyDataset(daily, firstParty);
  const { value: legacyActive } = useLegacyActive(family === "classic");
  const [legacyChartFailed, setLegacyChartFailed] = useState(false);
  const usage = useMemo(
    () => familyDaily(firstParty ? (dailyData?.days ?? []) : [], family),
    [dailyData, family, firstParty],
  );
  const label = {
    server: "Bluefin Server",
    classic: "Bluefin Classic",
    dakota: "Bluefin Dakota",
    utah: "Bluefin Utah",
    lts: "Bluefin LTS",
  }[family];

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          {!hideHeading && (
            <Heading as="h2" className={styles.sectionTitle}>
              {label} usage
            </Heading>
          )}
          <p className={styles.sectionSubtext}>
            {family === "classic" ? (
              <>
                <code>ublue-os/bluefin:stable</code>, counted by{" "}
                <Link to="https://github.com/ublue-os/countme">
                  ublue-os/countme
                </Link>
                . Metalink hits, not image check-ins.
              </>
            ) : (
              "Systems active per day."
            )}
          </p>
        </header>
        {family === "lts" ? (
          <Unavailable
            what={`${label} usage`}
            reason="No supported usage dataset is available for Bluefin LTS."
          />
        ) : family === "classic" ? (
          <>
            <p className={styles.legendRow}>
              <span className={styles.legendChip}>
                <span className={styles.legendGlyph} aria-hidden="true">
                  ◇
                </span>
                Bluefin Classic: {legacyActive ?? "unavailable"}
              </span>
            </p>
            {legacyActive === null || legacyChartFailed ? (
              <Unavailable
                what={`${label} usage`}
                reason={
                  legacyChartFailed
                    ? "The upstream chart could not be read."
                    : "The upstream badge could not be read."
                }
              />
            ) : (
              <LegacyChart
                active={legacyActive}
                onError={() => setLegacyChartFailed(true)}
              />
            )}
          </>
        ) : (
          <CountPanel
            days={usage.days}
            series={dailyChartSeries(usage)}
            label={label}
            reason={emptyReason}
            cat={fxTheme.categorical}
            theme={fxTheme}
          />
        )}
      </section>
    </div>
  );
}

export interface CountmeAnalyticsChartsProps {
  registry?: GhcrDataset;
  /** Injected by tests; production fetches the daily ping counts. */
  daily?: DailyDataset;
  /** Injected snapshot; production reads the permitted Classic badge. */
  classic?: string | null;
  history?: ClassicHistoryDataset;
}

export default function CountmeAnalyticsCharts({
  registry,
  daily,
  classic,
  history,
}: CountmeAnalyticsChartsProps = {}): React.JSX.Element {
  const [themeRef, fxTheme] = useFactoryTheme();
  const cat = fxTheme.categorical;
  const sev = fxTheme.severity;
  const [fetchedRegistry, setFetchedRegistry] = useState<GhcrDataset | null>(
    null,
  );
  const [registryReason, setRegistryReason] = useState<string | null>(null);

  useEffect(() => {
    if (registry) return;
    void (async () => {
      try {
        const res = await fetch(REGISTRY_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFetchedRegistry((await res.json()) as GhcrDataset);
      } catch (err) {
        setRegistryReason(
          `${REGISTRY_URL} could not be read (${(err as Error).message}). ` +
          `It is generated at build time and may not exist in this environment.`,
        );
      }
    })();
  }, [registry]);

  // Classic is ublue-os/bluefin from ublue-os/countme: the current badge is
  // proxied by our worker; real badge revisions are collected at build time.
  const fetchedClassic = useLegacyActive(classic === undefined);
  const legacyActive = classic === undefined ? fetchedClassic.value : classic;
  const observedDay =
    classic === undefined
      ? fetchedClassic.day
      : new Date().toISOString().slice(0, 10);
  const [fetchedHistory, setFetchedHistory] =
    useState<ClassicHistoryDataset | null>(null);
  const [historyReason, setHistoryReason] = useState<string | null>(null);
  useEffect(() => {
    if (history) return;
    void (async () => {
      try {
        const res = await fetch(CLASSIC_HISTORY_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFetchedHistory((await res.json()) as ClassicHistoryDataset);
      } catch {
        setHistoryReason("Classic count history could not be read.");
      }
    })();
  }, [history]);
  const historyData = history ?? fetchedHistory;
  const classicCurve = useMemo(
    () => classicPopulation(historyData, legacyActive, observedDay),
    [historyData, legacyActive, observedDay],
  );
  const classicReason =
    historyData?.stateReason ??
    historyReason ??
    "Reading Classic count history…";
  const { dailyData, emptyReason } = useDailyDataset(daily);
  const bluefin = useMemo(
    () =>
      familyDaily(
        dailyData?.unavailable ? [] : (dailyData?.days ?? []),
        "dakota",
      ),
    [dailyData],
  );
  const utah = useMemo(
    () =>
      familyDaily(
        dailyData?.unavailable ? [] : (dailyData?.days ?? []),
        "utah",
      ),
    [dailyData],
  );
  const totalCurve = useMemo(
    () => sumBluefinHistories(bluefin, utah, classicCurve),
    [bluefin, utah, classicCurve],
  );
  const printerRows = useMemo(
    () => (dailyData?.unavailable ? [] : (dailyData?.days ?? [])),
    [dailyData],
  );
  const printerAppSeries = useMemo(() => {
    const families = [
      { id: "ghostscript-printer-app", name: "Ghostscript" },
      { id: "hplip-printer-app", name: "HPLIP" },
      { id: "gutenprint-printer-app", name: "Gutenprint" },
      { id: "ps-printer-app", name: "PostScript" },
    ] as const;
    const familyDatasets = families.map((f) => ({
      ...f,
      daily: familyDaily(printerRows, f.id),
    }));
    const allDays = familyDaily(
      printerRows.filter((row) =>
        families.some((family) => row.image.startsWith(`${family.id}/`)),
      ),
    ).days;
    const series = familyDatasets.map((f) => {
      const dayMap = new Map<string, number | null>();
      f.daily.days.forEach((day, i) => {
        const vals = DAILY_STREAMS.map((s) => f.daily.streams[s][i]).filter(
          (v): v is number => v !== null,
        );
        dayMap.set(day, vals.length ? vals.reduce((a, b) => a + b, 0) : null);
      });
      return {
        name: f.name,
        values: allDays.map((d) => dayMap.get(d) ?? null),
      };
    });
    return { days: allDays, series };
  }, [printerRows]);

  const ghcr = registry ?? fetchedRegistry;
  const ghcrPackages = ghcr?.packages ?? [];
  // Rule 6: the family cards read stream ages out of this snapshot, so a
  // missing snapshot is stated, not rendered as a card full of "—".
  const snapshotUnavailable =
    (ghcr?.unavailable ?? false) || ghcrPackages.length === 0;
  const snapshotReason =
    ghcr?.stateReason ?? registryReason ?? "Reading the registry snapshot…";

  const packageIndex = new Map(ghcrPackages.map((p) => [p.name, p]));

  return (
    <div ref={themeRef} className={`fxRoot ${styles.container}`}>
      {/* ── Summary: All Bluefins combined ─────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            All Bluefins (Total)
          </Heading>
          <p className={styles.sectionSubtext}>
            Bluefin + Bluefin Classic + Bluefin Utah.
          </p>
        </header>
        <CountPanel
          days={totalCurve.days}
          series={[{ name: "All Bluefins", values: totalCurve.values }]}
          label="All Bluefins"
          cadence="estimated"
          approximate
          reason={
            classicCurve.days.length
              ? "A total needs counts from all three Bluefins on the same date."
              : classicReason
          }
          cat={cat}
          theme={fxTheme}
        />
      </section>

      {/* ── 1. Bluefin: daily active systems ─────────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin
          </Heading>
          <p className={styles.sectionSubtext}>Systems active per day.</p>
        </header>
        <CountPanel
          days={bluefin.days}
          series={dailyChartSeries(bluefin)}
          label="Bluefin"
          reason={emptyReason}
          cat={cat}
          theme={fxTheme}
        />
      </section>

      {/* ── 2. Bluefin Classic: weekly active systems ────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin Classic (ublue-os/bluefin)
          </Heading>
          <p className={styles.sectionSubtext}>
            Weekly counts from{" "}
            <Link to="https://github.com/ublue-os/countme">
              ublue-os/countme
            </Link>
          </p>
        </header>
        <CountPanel
          days={classicCurve.days}
          series={[{ name: "Classic", values: classicCurve.values }]}
          label="Bluefin Classic"
          cadence="weekly"
          approximate
          step="end"
          reason={classicReason}
          cat={cat}
          theme={fxTheme}
        />
      </section>

      {/* ── 3. Bluefin Utah: daily active systems ────────────────────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Bluefin Utah
          </Heading>
          <p className={styles.sectionSubtext}>Systems active per day.</p>
        </header>
        <CountPanel
          days={utah.days}
          series={dailyChartSeries(utah)}
          label="Bluefin Utah"
          reason={emptyReason}
          cat={cat}
          theme={fxTheme}
        />
      </section>

      {/* ── 4. Printer Applications: daily active installations ──────────── */}
      <section className={styles.panelCard}>
        <header className={styles.sectionHeader}>
          <Heading as="h3" className={styles.sectionTitle}>
            Printer Applications
          </Heading>
          <p className={styles.sectionSubtext}>
            Active printer container instances per day.
          </p>
        </header>
        <CountPanel
          days={printerAppSeries.days}
          series={printerAppSeries.series}
          label="Printer Applications"
          reason={emptyReason}
          cat={cat}
          theme={fxTheme}
        />
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

        {snapshotUnavailable ? (
          <Unavailable what="Image stream freshness" reason={snapshotReason} />
        ) : null}

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
                  className={`${styles.statusPill} ${img.status === "active"
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
                      {snapshotUnavailable ? null : (
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
                                title={`${name}:${stream} — ${sev[level].word}${age === null ? "" : `, ${age} days old`
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
                      )}
                    </li>
                  ))
                )}
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
