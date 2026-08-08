import React, { useState } from "react";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import { gapSafe, seriesColor, seriesDash } from "../chartTheme";
import { useDataset } from "../FactoryDataContext";
import Sparkline from "../../Sparkline";
import type { FactoryLive } from "../../HiveFactoryDashboard";
import styles from "./MetricsPanels.module.css";

// ── Data shapes ────────────────────────────────────────────────────────────

interface CountmeWeek {
  week: string;
  bluefin?: number;
  "bluefin-lts"?: number;
  aurora?: number;
  bazzite?: number;
  fedora?: number;
  [key: string]: string | number | undefined;
}
interface CountmeData {
  unit: string;
  variants: string[];
  weeks: CountmeWeek[];
  unavailable?: boolean;
  stateReason?: string | null;
}

interface BrewRow {
  id: string;
  label: string;
  rank: number;
  count: number;
  percent: number;
}
interface BrewWindow {
  startDate: string;
  endDate: string;
  totalCount: number;
  trackedItems: number;
  rows: BrewRow[];
  peers: BrewRow[];
  unavailable?: boolean;
  stateReason?: string | null;
}
interface BrewData {
  windows: Record<string, BrewWindow>;
  unavailable?: boolean;
  stateReason?: string | null;
}

interface DoraMonthly {
  month: string;
  releases: number;
  publishRuns: number;
  passed: number;
  failed: number;
  running?: number;
  failureRate: number;
  medianDurationMin: number;
}
interface DoraCurrent {
  deploymentsPerWeek: number;
  changeFailureRate: number;
  medianLeadTimeHours: number | null;
  leadTimeReason?: string;
}
interface DoraData {
  windowDays: number;
  repos: string[];
  monthly: DoraMonthly[];
  current: DoraCurrent;
  unavailable?: boolean;
  stateReason?: string | null;
}

interface ScorecardCheck {
  name: string;
  score: number | null;
  reason?: string;
}
interface ScorecardRepo {
  repo: string;
  current: { date: string; score: number; checks: ScorecardCheck[] };
  history: Array<{ date: string; score: number }>;
  unavailable?: boolean;
  stateReason?: string | null;
}
interface ScorecardData {
  repos: ScorecardRepo[];
  unavailable?: boolean;
  stateReason?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type Range = "30d" | "90d" | "365d" | "all";
const RANGE_WEEKS: Record<Range, number | null> = {
  "30d": 4,
  "90d": 13,
  "365d": 52,
  all: null,
};

function sliceWeeks(weeks: CountmeWeek[], range: Range): CountmeWeek[] {
  const n = RANGE_WEEKS[range];
  if (n == null || weeks.length <= n) return weeks;
  return weeks.slice(-n);
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MetricsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;

  const countme = useDataset<CountmeData>("countme");
  const brew = useDataset<BrewData>("brew");
  const dora = useDataset<DoraData>("dora");
  const scorecard = useDataset<ScorecardData>("scorecard");

  return (
    <>
      <ActiveDevices countme={countme} />
      <EcosystemShare countme={countme} />
      <HomebrewPanel brew={brew} />
      <DeliveryFrequency dora={dora} />
      <SecurityPosture scorecard={scorecard} />
      <PerLaneBreakdown countme={countme} />
    </>
  );
}

// ── Panel 1: Active devices ────────────────────────────────────────────────

function ActiveDevices({
  countme,
}: {
  countme: {
    data: CountmeData | null;
    loading: boolean;
    reason: string | null;
  };
}) {
  const [range, setRange] = useState<Range>("all");

  if (countme.reason || (!countme.loading && !countme.data)) {
    return (
      <Unavailable
        what="Active devices"
        reason={
          countme.reason ?? "countme data is not available in this environment."
        }
      />
    );
  }
  if (countme.loading || !countme.data) return null;
  if (countme.data.unavailable) {
    return (
      <Unavailable
        what="Active devices"
        reason={countme.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  const weeks = sliceWeeks(countme.data.weeks, range);
  const latest = countme.data.weeks[countme.data.weeks.length - 1];
  const currentBluefin = latest?.bluefin;
  const currentLts = latest?.["bluefin-lts"];

  const bluefinSeries = gapSafe(weeks.map((w) => w.bluefin ?? null));
  const ltsSeries = gapSafe(weeks.map((w) => w["bluefin-lts"] ?? null));
  const labels = weeks.map((w) => w.week);

  const realPoints = bluefinSeries.filter((v) => v !== null).length;

  const option = {
    xAxis: { type: "category", data: labels },
    yAxis: { type: "value" },
    series: [
      {
        name: "Bluefin",
        type: "line",
        data: bluefinSeries,
        connectNulls: false,
        itemStyle: { color: seriesColor(0) },
        lineStyle: { type: seriesDash(0) },
      },
      {
        name: "Bluefin LTS",
        type: "line",
        data: ltsSeries,
        connectNulls: false,
        itemStyle: { color: seriesColor(1) },
        lineStyle: { type: seriesDash(1) },
      },
    ],
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Active devices</h2>
      <div className={styles.currentValue}>
        {fmt(currentBluefin)} Bluefin · {fmt(currentLts)} LTS
      </div>
      <div className={styles.rangeToggle}>
        {(["30d", "90d", "365d", "all"] as Range[]).map((r) => (
          <button
            key={r}
            className={`${styles.rangeBtn} ${range === r ? styles.rangeBtnActive : ""}`}
            onClick={() => setRange(r)}
            aria-pressed={range === r}
          >
            {r === "all" ? "All" : r}
          </button>
        ))}
      </div>
      <EChart
        option={option}
        title="Weekly active devices"
        summary={`Bluefin: ${fmt(currentBluefin)} devices this week. LTS: ${fmt(currentLts)}.`}
        points={realPoints}
        minPoints={2}
        tableCaption="Weekly countme hits for Bluefin and Bluefin LTS"
      />
    </section>
  );
}

// ── Panel 2: Ecosystem share ───────────────────────────────────────────────

function EcosystemShare({
  countme,
}: {
  countme: {
    data: CountmeData | null;
    loading: boolean;
    reason: string | null;
  };
}) {
  if (countme.reason || (!countme.loading && !countme.data)) {
    return (
      <Unavailable
        what="Ecosystem share"
        reason={
          countme.reason ?? "countme data is not available in this environment."
        }
      />
    );
  }
  if (countme.loading || !countme.data) return null;
  if (countme.data.unavailable) {
    return (
      <Unavailable
        what="Ecosystem share"
        reason={countme.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  const latest = countme.data.weeks[countme.data.weeks.length - 1];
  if (!latest) return null;

  const slices: Array<{ name: string; value: number }> = [];
  const peers = ["bluefin", "bluefin-lts", "aurora", "bazzite"] as const;
  for (const p of peers) {
    const v = latest[p];
    if (v != null) slices.push({ name: p, value: v });
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const realPoints = slices.length;

  const option = {
    series: [
      {
        type: "pie",
        data: slices.map((s, i) => ({
          ...s,
          itemStyle: { color: seriesColor(i) },
          label: {
            formatter: `{b}\n${fmt(s.value)} (${total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}%)`,
          },
        })),
        label: { color: "#e6edf3" },
      },
    ],
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Ecosystem share</h2>
      <EChart
        option={option}
        title="Immutable desktop ecosystem share"
        summary={`Latest week across ${slices.length} peer distributions (excluding Fedora, which dwarfs the rest and is not a peer immutable desktop).`}
        points={realPoints}
        minPoints={2}
        height={320}
        tableCaption="Weekly countme hits by distribution"
      />
    </section>
  );
}

// ── Panel 3: Homebrew on Bluefin ───────────────────────────────────────────

function HomebrewPanel({
  brew,
}: {
  brew: { data: BrewData | null; loading: boolean; reason: string | null };
}) {
  if (brew.reason || (!brew.loading && !brew.data)) {
    return (
      <Unavailable
        what="Homebrew on Bluefin"
        reason={brew.reason ?? "Homebrew analytics data is not available."}
      />
    );
  }
  if (brew.loading || !brew.data) return null;
  if (brew.data.unavailable) {
    return (
      <Unavailable
        what="Homebrew on Bluefin"
        reason={brew.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  const w365 = brew.data.windows["365d"];
  if (!w365) {
    return (
      <Unavailable what="Homebrew on Bluefin" reason="365d window missing." />
    );
  }

  const bluefin365 = w365.rows.find((r) => r.id === "bluefin");
  const lts365 = w365.rows.find((r) => r.id === "bluefin-lts");

  // Bar chart: Bluefin + peers sorted by count
  const barItems = [...w365.rows, ...w365.peers].sort(
    (a, b) => b.count - a.count,
  );
  const realPoints = barItems.length;
  const option = {
    xAxis: { type: "value" },
    yAxis: {
      type: "category",
      data: barItems.map((r) => r.label),
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: barItems.map((r, i) => ({
          value: r.count,
          itemStyle: {
            color:
              r.id === "bluefin" || r.id === "bluefin-lts"
                ? seriesColor(0)
                : seriesColor(3),
          },
        })),
        name: "Installs",
      },
    ],
  };

  // Windows table
  const windowKeys = ["30d", "90d", "365d"] as const;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Homebrew on Bluefin</h2>
      <p
        style={{ fontSize: "var(--fx-text-sm)", color: "var(--fx-text-muted)" }}
      >
        Homebrew's own public analytics measuring real installs on Bluefin
        machines.
      </p>
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>#{bluefin365?.rank ?? "—"}</div>
          <div className={styles.kpiLabel}>
            world rank out of {fmt(w365.trackedItems)} OS environments
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{fmt(bluefin365?.count)}</div>
          <div className={styles.kpiLabel}>installs (365d)</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>
            {bluefin365 ? `${bluefin365.percent}%` : "—"}
          </div>
          <div className={styles.kpiLabel}>of all Homebrew activity</div>
        </div>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Window</th>
            <th>Bluefin</th>
            <th>Bluefin LTS</th>
          </tr>
        </thead>
        <tbody>
          {windowKeys.map((wk) => {
            const win = brew.data!.windows[wk];
            if (!win) return null;
            const bf = win.rows.find((r) => r.id === "bluefin");
            const lt = win.rows.find((r) => r.id === "bluefin-lts");
            return (
              <tr key={wk}>
                <td>{wk}</td>
                <td>{bf ? `#${bf.rank} — ${fmt(bf.count)}` : "—"}</td>
                <td>{lt ? `#${lt.rank} — ${fmt(lt.count)}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <EChart
        option={option}
        title="Homebrew installs: Bluefin among peers"
        summary={`Bluefin ranks #${bluefin365?.rank ?? "?"} with ${fmt(bluefin365?.count)} installs over 365 days.`}
        points={realPoints}
        minPoints={2}
        height={Math.max(barItems.length * 32, 200)}
        tableCaption="Homebrew install counts by OS environment"
      />
    </section>
  );
}

// ── Panel 4: Delivery frequency ────────────────────────────────────────────

function DeliveryFrequency({
  dora,
}: {
  dora: { data: DoraData | null; loading: boolean; reason: string | null };
}) {
  if (dora.reason || (!dora.loading && !dora.data)) {
    return (
      <Unavailable
        what="Delivery frequency"
        reason={dora.reason ?? "DORA metrics data is not available."}
      />
    );
  }
  if (dora.loading || !dora.data) return null;
  if (dora.data.unavailable) {
    return (
      <Unavailable
        what="Delivery frequency"
        reason={dora.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  const { monthly, current } = dora.data;
  const labels = monthly.map((m) => m.month);
  const releaseSeries = gapSafe(monthly.map((m) => m.releases));
  const passedSeries = gapSafe(monthly.map((m) => m.passed));
  const failedSeries = gapSafe(monthly.map((m) => m.failed));
  const realPoints = monthly.length;

  const option = {
    xAxis: { type: "category", data: labels },
    yAxis: [
      { type: "value", name: "Releases" },
      { type: "value", name: "Runs" },
    ],
    series: [
      {
        name: "Releases",
        type: "bar",
        data: releaseSeries,
        itemStyle: { color: seriesColor(0) },
        yAxisIndex: 0,
      },
      {
        name: "Passed runs",
        type: "line",
        data: passedSeries,
        connectNulls: false,
        itemStyle: { color: seriesColor(2) },
        lineStyle: { type: seriesDash(2) },
        yAxisIndex: 1,
      },
      {
        name: "Failed runs",
        type: "line",
        data: failedSeries,
        connectNulls: false,
        itemStyle: { color: seriesColor(3) },
        lineStyle: { type: seriesDash(3) },
        yAxisIndex: 1,
      },
    ],
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Delivery frequency</h2>
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>{current.deploymentsPerWeek}</div>
          <div className={styles.kpiLabel}>deployments per week</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiValue}>
            {pct(current.changeFailureRate)}
          </div>
          <div className={styles.kpiLabel}>change failure rate</div>
        </div>
      </div>
      <div className={styles.leadTimeNote} data-testid="lead-time">
        <strong>Median lead time:</strong> not measured here.{" "}
        {current.leadTimeReason ?? ""}
      </div>
      <EChart
        option={option}
        title="Monthly delivery"
        summary={`${current.deploymentsPerWeek} deployments/week, ${pct(current.changeFailureRate)} change failure rate.`}
        points={realPoints}
        minPoints={2}
        tableCaption="Monthly release and publish-run outcomes"
      />
    </section>
  );
}

// ── Panel 5: Security posture ──────────────────────────────────────────────

function SecurityPosture({
  scorecard,
}: {
  scorecard: {
    data: ScorecardData | null;
    loading: boolean;
    reason: string | null;
  };
}) {
  if (scorecard.reason || (!scorecard.loading && !scorecard.data)) {
    return (
      <Unavailable
        what="Security posture"
        reason={scorecard.reason ?? "Scorecard data is not available."}
      />
    );
  }
  if (scorecard.loading || !scorecard.data) return null;
  if (scorecard.data.unavailable) {
    return (
      <Unavailable
        what="Security posture"
        reason={scorecard.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Security posture</h2>
      {scorecard.data.repos.map((repo) => (
        <ScorecardRepoPanel key={repo.repo} repo={repo} />
      ))}
    </section>
  );
}

function ScorecardRepoPanel({ repo }: { repo: ScorecardRepo }) {
  if (repo.unavailable) {
    return (
      <Unavailable
        what={repo.repo}
        reason={
          repo.stateReason ?? "Repository not found in Scorecard database."
        }
      />
    );
  }

  const score = repo.current.score;
  const checks = repo.current.checks;
  const history = repo.history;

  // Only include checks with non-null scores in bar chart
  const validChecks = checks.filter((c) => c.score !== null);
  const realPoints = validChecks.length;

  const option = {
    xAxis: { type: "value", max: 10 },
    yAxis: {
      type: "category",
      data: validChecks.map((c) => c.name),
      inverse: true,
    },
    series: [
      {
        type: "bar",
        data: validChecks.map((c) => ({
          value: c.score,
          itemStyle: { color: seriesColor(0) },
        })),
        name: "Score",
      },
    ],
  };

  // History line
  const historyPoints = history.map((h) => h.score);
  const historyRealPoints = historyPoints.filter(
    (v) => v !== null && v !== undefined,
  ).length;

  const historyOption = {
    xAxis: { type: "category", data: history.map((h) => h.date) },
    yAxis: { type: "value", min: 0, max: 10 },
    series: [
      {
        name: "Score",
        type: "line",
        data: gapSafe(historyPoints),
        connectNulls: false,
        itemStyle: { color: seriesColor(0) },
      },
    ],
  };

  // n/a checks listed separately
  const naChecks = checks.filter((c) => c.score === null);

  return (
    <div style={{ marginBottom: "var(--fx-space-5)" }}>
      <h3 style={{ color: "var(--fx-text)", fontSize: "var(--fx-text-md)" }}>
        {repo.repo}
      </h3>
      <div className={styles.scoreBlock}>
        <div>
          <div className={styles.currentValue} data-testid="scorecard-score">
            {score}/10
          </div>
          <Sparkline
            data={[score]}
            variant="bullet"
            target={10}
            domain={[0, 10]}
            width={160}
            height={24}
            color="#58a6ff"
            label={`OpenSSF Scorecard: ${score} out of 10`}
          />
        </div>
      </div>
      {naChecks.length > 0 && (
        <p
          style={{
            fontSize: "var(--fx-text-sm)",
            color: "var(--fx-text-muted)",
          }}
        >
          {naChecks.map((c) => c.name).join(", ")}:{" "}
          <span data-testid="na-check">n/a</span>
        </p>
      )}
      <EChart
        option={option}
        title={`${repo.repo} check scores`}
        summary={`Current overall score: ${score}/10 across ${validChecks.length} scored checks.`}
        points={realPoints}
        minPoints={1}
        height={Math.max(validChecks.length * 28, 120)}
        tableCaption="OpenSSF Scorecard check breakdown"
      />
      <EChart
        option={historyOption}
        title={`${repo.repo} score history`}
        summary={`Score trend: currently ${score}/10.`}
        points={historyRealPoints}
        minPoints={3}
        height={180}
        tableCaption="OpenSSF Scorecard score over time"
      />
    </div>
  );
}

// ── Panel 6: Per-lane breakdown ────────────────────────────────────────────

function PerLaneBreakdown({
  countme,
}: {
  countme: {
    data: CountmeData | null;
    loading: boolean;
    reason: string | null;
  };
}) {
  if (countme.reason || (!countme.loading && !countme.data)) {
    return (
      <Unavailable
        what="Per-lane breakdown"
        reason={countme.reason ?? "countme data is not available."}
      />
    );
  }
  if (countme.loading || !countme.data) return null;
  if (countme.data.unavailable) {
    return (
      <Unavailable
        what="Per-lane breakdown"
        reason={countme.data.stateReason ?? "Data unavailable."}
      />
    );
  }

  const { weeks, variants } = countme.data;
  if (weeks.length === 0) return null;

  // Compute shared domain across all variants
  let domainMin = Infinity;
  let domainMax = -Infinity;
  for (const variant of variants) {
    for (const w of weeks) {
      const v = (w as Record<string, unknown>)[variant];
      if (typeof v === "number") {
        if (v < domainMin) domainMin = v;
        if (v > domainMax) domainMax = v;
      }
    }
  }
  if (!Number.isFinite(domainMin)) domainMin = 0;
  if (!Number.isFinite(domainMax)) domainMax = 1;
  const domain: [number, number] = [domainMin, domainMax];

  const latest = weeks[weeks.length - 1];
  const prev4 = weeks.length >= 5 ? weeks[weeks.length - 5] : weeks[0];

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Per-lane breakdown</h2>
      <table className={styles.laneTable} data-testid="lane-table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>Latest</th>
            <th>4-week Δ</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant, i) => {
            const series = weeks.map((w) => {
              const v = (w as Record<string, unknown>)[variant];
              return typeof v === "number" ? v : null;
            });
            const latestVal = (latest as Record<string, unknown>)[variant] as
              number | undefined;
            const prevVal = (prev4 as Record<string, unknown>)[variant] as
              number | undefined;
            const change =
              latestVal != null && prevVal != null ? latestVal - prevVal : null;
            return (
              <tr key={variant}>
                <td>{variant}</td>
                <td className={styles.laneValue}>{fmt(latestVal ?? null)}</td>
                <td>
                  {change != null
                    ? `${change >= 0 ? "+" : ""}${fmt(change)}`
                    : "—"}
                </td>
                <td>
                  <Sparkline
                    data={series}
                    domain={domain}
                    scale="zero"
                    width={100}
                    height={24}
                    color={seriesColor(i)}
                    showEnd
                  />{" "}
                  <span className={styles.laneValue}>
                    {fmt(latestVal ?? null)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
