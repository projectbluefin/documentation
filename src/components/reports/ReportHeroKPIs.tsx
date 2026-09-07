import React from "react";
import styles from "./ReportHeroKPIs.module.css";

export interface HeroKPI {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

export interface ReportHeroKPIsProps {
  kpis: HeroKPI[];
}

export default function ReportHeroKPIs({
  kpis,
}: ReportHeroKPIsProps): React.JSX.Element {
  if (!kpis || kpis.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.grid}>
      {kpis.map((kpi, idx) => {
        const trendClass =
          kpi.trendDirection === "up"
            ? styles.trendUp
            : kpi.trendDirection === "down"
              ? styles.trendDown
              : styles.trendNeutral;

        return (
          <div key={idx} className={styles.card}>
            <div className={styles.header}>
              <span className={styles.label}>{kpi.label}</span>
              {kpi.trend && (
                <span className={`${styles.trendBadge} ${trendClass}`}>
                  {kpi.trend}
                </span>
              )}
            </div>
            <div className={styles.value}>{kpi.value}</div>
            {kpi.sublabel && (
              <div className={styles.sublabel}>{kpi.sublabel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
