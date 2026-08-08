import React from "react";
import Unavailable from "../Unavailable";
import EChart from "../EChart";
import { useDataset } from "../FactoryDataContext";
import { gapSafe, seriesColor, seriesDash } from "../chartTheme";
import type { FactoryLive } from "../../HiveFactoryDashboard";
import styles from "./ApplicationsPanels.module.css";

/* ---------- Data shapes ---------- */

interface AppRelease {
  version: string;
  date: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  type: string;
}

interface FirehoseApp {
  id: string;
  name: string;
  summary: string | null;
  currentReleaseVersion: string | null;
  currentReleaseDate: string | null;
  releases: AppRelease[] | null;
  packageType: string;
  appSet: string | null;
  isVerified: boolean;
}

interface FirehoseData {
  stats: {
    appsTotal: number;
    appsWithGitHubRepo: number;
    appsWithGitLabRepo: number;
    appsWithChangelogs: number;
    totalReleases: number;
  };
  apps: FirehoseApp[];
}

interface FlathubOsEntry {
  id: string;
  label: string;
  downloads: number;
  share: number;
  versions: Record<string, number>;
}

interface FlathubData {
  platform: { downloads: number; apps: number; verifiedApps: number };
  downloadsPerDay: Array<{ date: string; downloads: number }>;
  byOs: FlathubOsEntry[];
  flatpakVersionsOnBluefin: Array<{ version: string; installs: number }>;
  unavailable: boolean;
  stateReason: string | null;
}

interface GnomeExtension {
  id: number;
  uuid: string;
  name: string;
  creator: string;
  creatorUrl: string;
  description: string;
  url: string;
  icon: string | null;
  screenshot: string | null;
  donateUrl: string | null;
}

/* ---------- Helpers ---------- */

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "2026-05"
}

/** Build release-per-month series from actual release dates. */
function releaseCadence(apps: FirehoseApp[]): {
  months: string[];
  values: Array<number | null>;
  points: number;
} {
  const allDates: string[] = [];
  for (const app of apps) {
    if (!app.releases) continue;
    for (const r of app.releases) {
      if (r.date) allDates.push(r.date);
    }
  }
  if (allDates.length === 0) return { months: [], values: [], points: 0 };

  const counts = new Map<string, number>();
  for (const d of allDates) {
    const m = monthKey(d);
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }

  const sorted = [...counts.keys()].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Fill the range; months inside range with no releases are 0, not null
  const months: string[] = [];
  const values: Array<number | null> = [];
  let cur = first;
  while (cur <= last) {
    months.push(cur);
    values.push(counts.get(cur) ?? 0);
    // Advance month
    const [y, m] = cur.split("-").map(Number);
    const next =
      m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    cur = next;
  }

  const points = values.filter((v) => v !== null && v > 0).length;
  return { months, values, points };
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/* Source URL: derive from the most recent release that has a url */
function sourceUrl(app: FirehoseApp): string | null {
  if (!app.releases) return null;
  for (const r of app.releases) {
    if (r.url) return r.url;
  }
  return null;
}

/* ---------- Component ---------- */

export default function ApplicationsPanels({
  s,
}: {
  s: FactoryLive;
}): React.JSX.Element {
  void s;

  const {
    data: firehose,
    loading: fhLoading,
    reason: fhReason,
  } = useDataset<FirehoseData>("firehoseApps");
  const {
    data: flathub,
    loading: flLoading,
    reason: flReason,
  } = useDataset<FlathubData>("flathub");
  const {
    data: extensions,
    loading: extLoading,
    reason: extReason,
  } = useDataset<GnomeExtension[]>("gnomeExtensions");

  const fhReady = firehose && !fhLoading;
  const flReady = flathub && !flLoading && !flathub.unavailable;
  const extReady = extensions && !extLoading;

  /* Derived data */
  const cadence = fhReady ? releaseCadence(firehose.apps) : null;

  const bluefinOs = flReady
    ? (flathub.byOs.find((e) => e.id === "bluefin") ?? null)
    : null;

  const peerEntries = flReady
    ? flathub.byOs
        .filter((e) =>
          ["bluefin", "aurora", "bazzite", "fedora"].includes(e.id),
        )
        .sort((a, b) => b.downloads - a.downloads)
    : [];

  /* App table sorted by most recent release */
  const sortedApps = fhReady
    ? [...firehose.apps].sort((a, b) => {
        const ad = a.currentReleaseDate ?? "";
        const bd = b.currentReleaseDate ?? "";
        return bd.localeCompare(ad);
      })
    : [];

  return (
    <>
      {/* 1. Framing */}
      <p className={styles.framing}>
        This page tracks the applications Bluefin ships — Flatpaks, OS images,
        and Homebrew packages. Cluster and GitOps internals are not measured
        here; those live on the lab site.
      </p>

      {/* 2. KPI strip */}
      {fhReady ? (
        <div className={styles.kpiStrip}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>{firehose.stats.appsTotal}</div>
            <div className={styles.kpiLabel}>apps tracked</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {firehose.stats.totalReleases}
            </div>
            <div className={styles.kpiLabel}>releases tracked</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {firehose.stats.appsWithChangelogs}
            </div>
            <div className={styles.kpiLabel}>apps with changelogs</div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiValue}>
              {firehose.stats.appsWithGitHubRepo +
                firehose.stats.appsWithGitLabRepo}
            </div>
            <div className={styles.kpiLabel}>apps with source repo</div>
          </div>
        </div>
      ) : fhReason ? (
        <Unavailable what="Application stats" reason={fhReason} />
      ) : null}

      {/* 3. Release cadence */}
      {fhReady && cadence && cadence.months.length > 0 ? (
        <EChart
          title="Release cadence"
          summary={`${cadence.values.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)} releases across ${cadence.months.length} months covered.`}
          points={cadence.points}
          minPoints={2}
          height={260}
          option={{
            xAxis: { type: "category", data: cadence.months },
            yAxis: { type: "value", name: "Releases" },
            series: [
              {
                type: "bar",
                name: "Releases per month",
                data: gapSafe(cadence.values),
                itemStyle: { color: seriesColor(0) },
                connectNulls: false,
              },
            ],
          }}
        />
      ) : fhReason ? (
        <Unavailable what="Release cadence" reason={fhReason} />
      ) : null}

      {/* 4. Flathub downloads attributed to Bluefin */}
      {flReady && bluefinOs ? (
        <div className={styles.section}>
          <h2 className={styles.heading}>
            Flathub downloads attributed to Bluefin
          </h2>
          <div className={styles.bigNumber}>
            {formatNumber(bluefinOs.downloads)}
          </div>
          <div className={styles.bigLabel}>
            {(bluefinOs.share * 100).toFixed(3)}% of all Flathub downloads
          </div>
          <EChart
            title="Bluefin Flathub downloads by Fedora version"
            summary={`${formatNumber(bluefinOs.downloads)} total downloads across ${Object.keys(bluefinOs.versions).length} Fedora versions.`}
            points={Object.keys(bluefinOs.versions).length}
            minPoints={1}
            height={220}
            option={{
              xAxis: {
                type: "category",
                data: Object.keys(bluefinOs.versions).sort(),
              },
              yAxis: { type: "value", name: "Downloads" },
              series: [
                {
                  type: "bar",
                  name: "Downloads",
                  data: gapSafe(
                    Object.keys(bluefinOs.versions)
                      .sort()
                      .map((k) => bluefinOs.versions[k]),
                  ),
                  itemStyle: { color: seriesColor(0) },
                },
              ],
            }}
          />
        </div>
      ) : flathub?.unavailable ? (
        <Unavailable
          what="Flathub attribution"
          reason={flathub.stateReason ?? "Flathub data is unavailable."}
        />
      ) : flReason ? (
        <Unavailable what="Flathub attribution" reason={flReason} />
      ) : null}

      {/* 5. Peer comparison (log scale) */}
      {flReady && peerEntries.length > 0 ? (
        <EChart
          title="Bluefin vs peer immutable distributions on Flathub (log scale)"
          summary={`Bluefin: ${formatNumber(bluefinOs?.downloads ?? 0)}. Bazzite and Fedora are 1–2 orders of magnitude larger; a logarithmic scale is used so all bars remain visible.`}
          points={peerEntries.length}
          minPoints={2}
          height={280}
          option={{
            xAxis: {
              type: "category",
              data: peerEntries.map((e) => e.label),
            },
            yAxis: {
              type: "log",
              name: "Downloads (log scale)",
              min: 1,
            },
            series: [
              {
                type: "bar",
                name: "Flathub downloads",
                data: gapSafe(peerEntries.map((e) => e.downloads)),
                itemStyle: { color: seriesColor(2) },
              },
            ],
          }}
        />
      ) : null}

      {/* 6. Flathub platform context — downloads per day */}
      {flReady && flathub.downloadsPerDay.length > 0 ? (
        <EChart
          title="Flathub daily downloads (platform-wide)"
          summary={`${flathub.downloadsPerDay.length} days of data. This is the denominator for Bluefin's share above.`}
          points={flathub.downloadsPerDay.length}
          minPoints={7}
          height={240}
          option={{
            xAxis: {
              type: "category",
              data: flathub.downloadsPerDay.map((d) => d.date),
            },
            yAxis: { type: "value", name: "Downloads" },
            series: [
              {
                type: "line",
                name: "Daily downloads",
                data: gapSafe(flathub.downloadsPerDay.map((d) => d.downloads)),
                lineStyle: {
                  color: seriesColor(1),
                  type: seriesDash(1),
                },
                itemStyle: { color: seriesColor(1) },
                showSymbol: false,
                connectNulls: false,
              },
            ],
          }}
        />
      ) : null}

      {/* 7. App catalog table */}
      {fhReady && sortedApps.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.heading}>App catalog</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Version</th>
                <th>Release date</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {sortedApps.map((app) => {
                const src = sourceUrl(app);
                return (
                  <tr key={app.id}>
                    <td>{app.name}</td>
                    <td>{app.currentReleaseVersion ?? ""}</td>
                    <td>{formatDate(app.currentReleaseDate)}</td>
                    <td>
                      {src ? (
                        <a
                          className={styles.link}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          link
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* 8. GNOME extensions */}
      {extReady && extensions.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.heading}>GNOME extensions</h2>
          <div className={styles.extGrid}>
            {extensions.map((ext) => (
              <div key={ext.uuid} className={styles.extCard}>
                <div className={styles.extName}>
                  <a
                    className={styles.link}
                    href={ext.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ext.name}
                  </a>
                </div>
                <div className={styles.extCreator}>by {ext.creator}</div>
              </div>
            ))}
          </div>
        </div>
      ) : extReason ? (
        <Unavailable what="GNOME extensions" reason={extReason} />
      ) : null}
    </>
  );
}
