import React, { useState, useEffect } from "react";
import styles from "./BrewOsChart.module.css";

interface OsEntry {
  number: number;
  os_version: string;
  count: string;
  percent: string;
}

interface ApiResponse {
  start_date: string;
  end_date: string;
  total_count: string;
  items: OsEntry[];
}

// OS names that belong to the Universal Blue family — highlighted in primary colour
const UBLUE_FAMILY = [
  "Bluefin", "Aurora", "Bazzite", "Bluefin LTS", "Zirconium",
  "uCore", "secureblue", "Bluefin DX", "Aurora DX",
];

function isUBlue(name: string): boolean {
  return UBLUE_FAMILY.some((f) => name.toLowerCase().startsWith(f.toLowerCase()));
}

const BrewOsChart: React.FC<{ topN?: number }> = ({ topN = 20 }) => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("https://formulae.brew.sh/api/analytics/os-version/90d.json")
      .then((r) => r.json())
      .then((d: ApiResponse) => setData(d))
      .catch(() => setError(true));
  }, []);

  if (error) return (
    <p className={styles.error}>
      Could not load Homebrew analytics.{" "}
      <a href="https://formulae.brew.sh/analytics/os-version/90d/" target="_blank" rel="noopener noreferrer">
        View on formulae.brew.sh →
      </a>
    </p>
  );

  if (!data) return <div className={styles.loading}>Loading Homebrew analytics…</div>;

  const items = data.items.slice(0, topN);
  const maxPct = parseFloat(items[0].percent);

  return (
    <div className={styles.wrapper}>
      <div className={styles.meta}>
        Homebrew installs by OS — {data.start_date} → {data.end_date}
        <a
          href="https://formulae.brew.sh/analytics/os-version/90d/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.source}
        >
          Full data →
        </a>
      </div>

      <div className={styles.chart}>
        {items.map((item) => {
          const pct = parseFloat(item.percent);
          const barWidth = (pct / maxPct) * 100;
          const ublue = isUBlue(item.os_version);

          return (
            <div key={item.number} className={styles.row}>
              <span className={`${styles.rank} ${ublue ? styles.ublueRank : ""}`}>
                {item.number}
              </span>
              <span className={`${styles.label} ${ublue ? styles.ublueLabel : ""}`}>
                {item.os_version}
              </span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.bar} ${ublue ? styles.ublueBar : ""}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={`${styles.pct} ${ublue ? styles.ubluePct : ""}`}>
                {item.percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrewOsChart;
