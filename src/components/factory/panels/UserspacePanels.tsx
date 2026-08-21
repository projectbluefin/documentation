import React from "react";
import Link from "@docusaurus/Link";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import { useDataset } from "../FactoryDataContext";
import { FX_SEVERITY, gapSafe, type SeverityLevel } from "../chartTheme";
import styles from "./ImagesPanels.module.css";

// ── Data shapes ────────────────────────────────────────────────────────────

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

interface FlathubData {
  platform: { downloads: number; apps: number; verifiedApps: number };
  downloadsPerDay: Array<{ date: string; downloads: number }>;
  byOs: Array<{
    id: string;
    label: string;
    downloads: number;
    share: number;
    versions: Record<string, number>;
  }>;
  flatpakVersionsOnBluefin: Array<{ version: string; installs: number }>;
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

function archOf(name: string): string {
  if (name.endsWith("-x86_64")) return "x86_64";
  if (name.endsWith("-aarch64")) return "aarch64";
  return "multi-arch";
}

export default function UserspacePanels(): React.JSX.Element {
  const ghcr = useDataset<GhcrData>("ghcrPackages");
  const flathub = useDataset<FlathubData>("flathub");

  if (ghcr.loading && flathub.loading) {
    return <Unavailable what="Userspace" reason="Loading userspace data…" />;
  }

  if (
    (!ghcr.data || ghcr.data.unavailable) &&
    (!flathub.data || flathub.data.unavailable)
  ) {
    return (
      <Unavailable
        what="Userspace"
        reason={
          ghcr.data?.stateReason ??
          ghcr.reason ??
          flathub.data?.stateReason ??
          flathub.reason ??
          "Userspace data is not available in this environment."
        }
      />
    );
  }

  const packages = ghcr.data?.packages ?? [];
  const userspacePackages = packages.filter((p) => p.family === "userspace");

  const userspaceStreams = userspacePackages.flatMap((p) =>
    p.streams.map((st) => ({ pkg: p.name, ...st })),
  );

  // KPI values
  const tracked = userspacePackages.length;
  const recentlyPublished = userspaceStreams.filter(
    (s) => s.ageDays !== null && s.ageDays <= 7,
  ).length;
  const arches = new Set(userspacePackages.map((p) => archOf(p.name)));

  // Inventory table, sorted oldest first
  const inventoryRows = [...userspaceStreams].sort((a, b) => {
    const ageA = a.ageDays ?? Infinity;
    const ageB = b.ageDays ?? Infinity;
    return ageB - ageA;
  });

  // Publish recency horizontal bar
  const recencyNames = inventoryRows
    .filter((s) => s.ageDays !== null)
    .map((s) => `${s.pkg}:${s.tag}`);
  const recencyValues = inventoryRows
    .filter((s) => s.ageDays !== null)
    .map((s) => s.ageDays!);
  const recencyColors = inventoryRows
    .filter((s) => s.ageDays !== null)
    .map((s) => FX_SEVERITY[severityOf(s.state)].color);

  const recencyOption = {
    yAxis: {
      type: "category",
      data: recencyNames,
      axisLabel: { fontSize: 10 },
    },
    xAxis: { type: "value", name: "Days" },
    series: [
      {
        type: "bar",
        data: recencyValues.map((v, i) => ({
          value: v,
          itemStyle: { color: recencyColors[i] },
        })),
      },
    ],
  };

  // Flatpak versions bar
  const fpVersions = flathub.data?.flatpakVersionsOnBluefin ?? [];
  const fpLabels = fpVersions.map((v) => v.version);
  const fpValues = fpVersions.map((v) => v.installs);
  const fpOption = {
    xAxis: { type: "category", data: fpLabels },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: gapSafe(fpValues),
        itemStyle: { color: FX_SEVERITY.ok.color },
      },
    ],
  };

  return (
    <div>
      <p className={styles.cardReason}>
        This is Bluefin&apos;s userspace stack. Build-farm internals
        (BuildStream caches, the registry, cluster hardware) live on the lab
        site and are deliberately not reproduced here.
      </p>

      {/* KPI strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>
            {FX_SEVERITY.ok.glyph} {tracked}
          </span>
          <span className={styles.kpiLabel}>Userspace images</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>
            {FX_SEVERITY.ok.glyph} {recentlyPublished}
          </span>
          <span className={styles.kpiLabel}>Published ≤7d</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiValue}>
            {FX_SEVERITY.ok.glyph} {arches.size}
          </span>
          <span className={styles.kpiLabel}>Architectures</span>
        </div>
      </div>

      {/* Userspace image inventory table */}
      <h2 className={styles.sectionHeading}>Userspace image inventory</h2>
      <table className={styles.inventoryTable}>
        <thead>
          <tr>
            <th>Image</th>
            <th>Architecture</th>
            <th>Tag</th>
            <th>Age (days)</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {inventoryRows.map((row) => {
            const sev = severityOf(row.state);
            return (
              <tr key={`${row.pkg}-${row.tag}`}>
                <td>{row.pkg}</td>
                <td>{archOf(row.pkg)}</td>
                <td>{row.tag}</td>
                <td>{row.ageDays ?? "—"}</td>
                <td>
                  {FX_SEVERITY[sev].glyph} {FX_SEVERITY[sev].word}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Publish recency */}
      <EChart
        option={recencyOption}
        title="Publish recency"
        summary={`${recencyNames.length} userspace images; oldest is ${recencyValues[0] ?? 0} days`}
        points={recencyNames.length}
        height={Math.max(280, recencyNames.length * 24)}
      />

      {/* Flatpak runtime versions */}
      {flathub.data && !flathub.data.unavailable ? (
        <EChart
          option={fpOption}
          title="Flatpak runtime versions on Bluefin"
          summary={`${fpVersions.length} runtime versions detected. This dataset is Bluefin-specific and available nowhere else on the site.`}
          points={fpVersions.length}
        />
      ) : (
        <Unavailable
          what="Flatpak runtime versions"
          reason={
            flathub.data?.stateReason ??
            flathub.reason ??
            "Flathub data unavailable."
          }
        />
      )}

      {/* Where the rest lives */}
      <div className={styles.labBlock}>
        <h2 className={styles.sectionHeading}>Where the rest lives</h2>
        <p>
          Build-farm internals — BuildStream caches, the container registry, and
          cluster hardware metrics — are measured by the lab site. Those panels
          are deliberately not reproduced here because they require
          authenticated access to the lab cluster.
        </p>
        <p>
          <Link to="https://github.com/projectbluefin/lab">
            projectbluefin/lab →
          </Link>
        </p>
      </div>
    </div>
  );
}
