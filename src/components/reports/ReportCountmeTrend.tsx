import React from "react";
import Sparkline from "../Sparkline";
import styles from "./ReportCountmeTrend.module.css";

export interface VariantStat {
  name: string;
  count: number | null;
  color?: string;
}

export interface ReportCountmeTrendProps {
  currentTotal: number | null;
  previousTotal?: number | null;
  historyPoints?: (number | null)[] | null;
  variants?: VariantStat[];
  sourceDate?: string;
  unavailableReason?: string | null;
  stateReason?: string | null;
}

export default function ReportCountmeTrend({
  currentTotal,
  previousTotal,
  historyPoints,
  variants = [],
  sourceDate,
  unavailableReason,
  stateReason,
}: ReportCountmeTrendProps): React.JSX.Element {
  const reason = unavailableReason ?? stateReason;
  if (reason || currentTotal === null || currentTotal === undefined) {
    return (
      <div className={styles.container} role="status">
        <div className={styles.unavailable}>
          <span aria-hidden="true">⚠</span>
          <strong>Data unavailable</strong>
          <span>{reason ?? "No Countme measurement is available."}</span>
        </div>
      </div>
    );
  }

  const changePct =
    previousTotal !== null && previousTotal !== undefined && previousTotal > 0
      ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1)
      : null;

  const isPositive = changePct !== null && parseFloat(changePct) >= 0;

  return (
    <div className={styles.container}>
      <div className={styles.heading}>Active Systems Adoption</div>
      <div className={styles.subtitle}>
        Estimated weekly active systems via Fedora Countme telemetry
        {sourceDate ? ` • ${sourceDate}` : ""}
      </div>

      <div className={styles.mainRow}>
        <div className={styles.totalCol}>
          <div className={styles.bigNumber}>
            {currentTotal.toLocaleString()}
          </div>
          {changePct !== null && (
            <div
              className={`${styles.changeText} ${
                isPositive ? styles.positive : styles.negative
              }`}
            >
              {isPositive ? "↑" : "↓"}{" "}
              {isPositive ? `+${changePct}%` : `${changePct}%`} from previous
              period
            </div>
          )}
        </div>

        <div className={styles.chartCol}>
          {historyPoints && historyPoints.length > 1 && (
            <Sparkline
              data={historyPoints}
              variant="line"
              width={260}
              height={50}
              color="var(--ifm-color-primary)"
              areaColor="currentColor"
              areaOpacity={0.12}
              showEnd={true}
              showExtremes={true}
              emptyLabel="Accumulating trend data"
            />
          )}
        </div>
      </div>

      {variants.length > 0 && (
        <div className={styles.variantBreakdown}>
          {variants.map((v) => (
            <div key={v.name} className={styles.variantItem}>
              <span
                className={styles.variantDot}
                style={{ background: v.color || "var(--ifm-color-primary)" }}
              />
              <span className={styles.variantName}>{v.name}:</span>
              <span className={styles.variantCount}>
                {v.count === null || v.count === undefined
                  ? "no data"
                  : v.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
