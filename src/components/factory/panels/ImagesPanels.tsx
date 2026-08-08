import React from "react";
import Link from "@docusaurus/Link";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import { useDataset } from "../FactoryDataContext";
import { FX_SEVERITY, gapSafe, type SeverityLevel } from "../chartTheme";
import type { FactoryLive } from "../../HiveFactoryDashboard";
import styles from "./ImagesPanels.module.css";

// ── Data shape from ghcr-packages.json ─────────────────────────────────────

interface GhcrStream {
  tag: string;
  publishedAt: string | null;
  ageDays: number | null;
  state: "fresh" | "recent" | "stale" | "awaiting";
  stateReason: string | null;
}

interface GhcrPackage {
  name: string;
  family: string;
  versionCount: number;
  streams: GhcrStream[];
}

interface GhcrData {
  generatedAt: string;
  orgs: string[];
  packages: GhcrPackage[];
  familyCounts: Record<string, number>;
  unavailable: boolean;
  stateReason: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function severityOf(state: string): SeverityLevel {
  switch (state) {
    case "fresh":
      return "ok";
    case "recent":
      return "watch";
    case "stale":
      return "alert";
    default:
      return "unknown";
  }
}

export default function ImagesPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;
  const { data, loading, reason } = useDataset<GhcrData>("ghcrPackages");

  if (loading) {
    return <Unavailable what="Images" reason="Loading image inventory data…" />;
  }

  if (!data || data.unavailable) {
    return (
      <Unavailable
        what="Images"
        reason={
          data?.stateReason ??
          reason ??
          "Image inventory data is not available in this environment."
        }
      />
    );
  }

  const packages = data.packages ?? [];
  const nonInternal = packages.filter((p) => p.family !== "internal");
  const allStreams = nonInternal.flatMap((p) =>
    p.streams.map((st) => ({ pkg: p.name, family: p.family, ...st })),
  );

  const freshCount = allStreams.filter((s) => s.state === "fresh").length;
  const staleCount = allStreams.filter((s) => s.state === "stale").length;
  const awaitingStreams = allStreams.filter((s) => s.state === "awaiting");
  const publishedStreams = allStreams.filter((s) => s.state !== "awaiting");

  // ── KPI strip ──────────────────────────────────────────────────────────
  const kpis = [
    {
      value: allStreams.length,
      label: "Lanes tracked",
      glyph: FX_SEVERITY.ok.glyph,
    },
    { value: freshCount, label: "Fresh", glyph: FX_SEVERITY.ok.glyph },
    { value: staleCount, label: "Stale", glyph: FX_SEVERITY.alert.glyph },
    {
      value: awaitingStreams.length,
      label: "Awaiting",
      glyph: FX_SEVERITY.unknown.glyph,
    },
  ];

  // ── Release timeline (scatter, last 90 days) ──────────────────────────
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const timelineData = publishedStreams
    .filter(
      (s) => s.publishedAt && new Date(s.publishedAt).getTime() > ninetyDaysAgo,
    )
    .map((s) => [s.publishedAt, s.pkg]);
  const timelineLanes = [...new Set(timelineData.map((d) => d[1] as string))];
  const timelinePoints = timelineData.length;

  const timelineOption = {
    xAxis: { type: "time", min: ninetyDaysAgo, max: now },
    yAxis: {
      type: "category",
      data: timelineLanes,
      axisLabel: { fontSize: 10 },
    },
    series: [
      {
        type: "scatter",
        data: timelineData,
        symbolSize: 8,
        itemStyle: { color: FX_SEVERITY.ok.color },
      },
    ],
  };

  // ── Freshness brackets (bar) ──────────────────────────────────────────
  const stateCounts = { fresh: 0, recent: 0, stale: 0, awaiting: 0 };
  for (const s of allStreams) {
    stateCounts[s.state] = (stateCounts[s.state] ?? 0) + 1;
  }
  const bracketLabels = ["Fresh", "Recent", "Stale", "Awaiting"];
  const bracketValues = [
    stateCounts.fresh,
    stateCounts.recent,
    stateCounts.stale,
    stateCounts.awaiting,
  ];
  const bracketColors = [
    FX_SEVERITY.ok.color,
    FX_SEVERITY.watch.color,
    FX_SEVERITY.alert.color,
    FX_SEVERITY.unknown.color,
  ];
  const bracketOption = {
    xAxis: { type: "category", data: bracketLabels },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: bracketValues.map((v, i) => ({
          value: v,
          itemStyle: { color: bracketColors[i] },
        })),
      },
    ],
  };

  // ── Availability by family (stacked bar) ──────────────────────────────
  const families = [...new Set(nonInternal.map((p) => p.family))];
  const availableByFamily = families.map(
    (f) =>
      allStreams.filter((s) => s.family === f && s.state !== "awaiting").length,
  );
  const awaitingByFamily = families.map(
    (f) =>
      allStreams.filter((s) => s.family === f && s.state === "awaiting").length,
  );
  const familyOption = {
    xAxis: { type: "category", data: families },
    yAxis: { type: "value" },
    series: [
      {
        name: "Available",
        type: "bar",
        stack: "total",
        data: gapSafe(availableByFamily),
        itemStyle: { color: FX_SEVERITY.ok.color },
      },
      {
        name: "Awaiting",
        type: "bar",
        stack: "total",
        data: gapSafe(awaitingByFamily),
        itemStyle: { color: FX_SEVERITY.unknown.color },
      },
    ],
  };

  return (
    <div>
      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        {kpis.map((k) => (
          <div key={k.label} className={styles.kpi}>
            <span className={styles.kpiValue}>
              {k.glyph} {k.value}
            </span>
            <span className={styles.kpiLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Lane freshness cards */}
      <h2 className={styles.sectionHeading}>Lane freshness</h2>
      {awaitingStreams.length > 0 && (
        <div className={styles.awaitingSummary} data-testid="awaiting-summary">
          {FX_SEVERITY.unknown.glyph} {awaitingStreams.length} lane
          {awaitingStreams.length === 1 ? " has" : "s have"} no published
          version yet
        </div>
      )}
      <div className={styles.cardGrid}>
        {publishedStreams.map((s) => {
          const sev = severityOf(s.state);
          return (
            <div key={`${s.pkg}-${s.tag}`} className={styles.card}>
              <div className={styles.cardName}>
                {s.pkg}:{s.tag}
              </div>
              <div className={styles.cardAge}>
                {FX_SEVERITY[sev].glyph} {s.ageDays}d
              </div>
              {s.state !== "fresh" && s.stateReason && (
                <div className={styles.cardReason}>{s.stateReason}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Release timeline */}
      <EChart
        option={timelineOption}
        title="Release timeline"
        summary={`${timelinePoints} publishes in the last 90 days`}
        points={timelinePoints}
        height={Math.max(280, timelineLanes.length * 24)}
      />

      {/* Freshness brackets */}
      <EChart
        option={bracketOption}
        title="Freshness brackets"
        summary={`${stateCounts.fresh} fresh, ${stateCounts.stale} stale, ${stateCounts.awaiting} awaiting across ${allStreams.length} lanes`}
        points={allStreams.length}
      />

      {/* Availability by family */}
      <EChart
        option={familyOption}
        title="Availability by family"
        summary={`${families.length} families; ${awaitingStreams.length} lanes still awaiting first publish`}
        points={families.length}
      />

      {/* Provenance */}
      <div className={styles.provenanceBlock}>
        <h2 className={styles.sectionHeading}>Provenance</h2>
        <p>
          Image digests and attestations are published by the SBOM pipeline. See
          the full catalog at <Link to="/images">Images</Link>.
        </p>
        <p>
          Per-image CVE counts are not published here because no public source
          provides them without the lab.
        </p>
      </div>
    </div>
  );
}
