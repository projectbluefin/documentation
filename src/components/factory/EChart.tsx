import React, { useEffect, useRef, useState } from "react";
import { toTableRows, FX_CHART_THEME } from "./chartTheme";
import styles from "./FactoryShell.module.css";

interface EChartsInstance {
  setOption: (o: unknown, notMerge?: boolean) => void;
  resize: () => void;
  dispose: () => void;
}

export interface EChartProps {
  /** An ECharts option object. Feed every series through gapSafe(). */
  option: Record<string, unknown>;
  height?: number;
  /** Rendered as the panel heading and used in the chart's accessible name. */
  title: string;
  /** One sentence stating the current value and the trend, in words. */
  summary: string;
  /** Real (non-null) points present. Below `minPoints` the chart is suppressed. */
  points: number;
  minPoints?: number;
  tableCaption?: string;
}

/**
 * The only sanctioned way to render an ECharts chart on /factory.
 *
 * Authorized by adr/0003-factory-two-level-navigation.md.
 *
 * Three behaviours are non-negotiable and live here so no panel can forget them:
 *   1. Nothing renders during static generation. ECharts needs a DOM, and an
 *      SSR/CSR mismatch on a page this size is expensive to debug.
 *   2. Below `minPoints`, "accumulating data" renders instead of a misleading
 *      line — never nothing (rule 5, and the visible-unavailability rule).
 *   3. A <details> data table always accompanies the canvas, so a screen reader
 *      is never told less than a sighted reader.
 *
 * Init and setOption are deliberately separate effects. Callers pass inline
 * option literals, whose identity changes every render; putting `option` in the
 * init effect's dependencies would dispose and re-import ECharts on every
 * render, which is an infinite loop.
 *
 * echarts/core plus explicit chart and component registration keeps the bundle
 * to what is used; do not switch to the `echarts` barrel import.
 */
export default function EChart({
  option,
  height = 280,
  title,
  summary,
  points,
  minPoints = 2,
  tableCaption,
}: EChartProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsInstance | null>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const enough = points >= minPoints;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !enough || !ref.current) return;
    let disposed = false;
    let observer: ResizeObserver | null = null;

    // Dynamic import keeps ECharts out of the initial route chunk.
    void (async () => {
      const [core, charts, components, renderers] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
      if (disposed || !ref.current) return;
      core.use([
        charts.LineChart,
        charts.BarChart,
        charts.PieChart,
        charts.ScatterChart,
        charts.HeatmapChart,
        components.GridComponent,
        components.TooltipComponent,
        components.LegendComponent,
        components.VisualMapComponent,
        components.CalendarComponent,
        components.MarkAreaComponent,
        components.MarkLineComponent,
        renderers.CanvasRenderer,
      ]);
      chartRef.current = core.init(ref.current) as unknown as EChartsInstance;
      observer = new ResizeObserver(() => chartRef.current?.resize());
      observer.observe(ref.current);
      setReady(true);
    })();

    return () => {
      disposed = true;
      setReady(false);
      observer?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [mounted, enough]);

  // The option is applied separately, so a new object literal costs one
  // setOption call rather than a full dispose/reimport/reinit cycle.
  // notMerge: true so a series the caller removed actually disappears.
  //
  // `optionKey` is the stable value identity of `option`; depending on `option`
  // itself would re-run this on every render, since callers pass literals.
  const optionKey = JSON.stringify(option);
  const optionRef = useRef(option);
  optionRef.current = option;
  useEffect(() => {
    if (!ready || !chartRef.current) return;
    chartRef.current.setOption(
      { ...FX_CHART_THEME, ...optionRef.current },
      true,
    );
  }, [ready, optionKey]);

  const rows = toTableRows(option as never);

  return (
    <figure className={styles.chartFigure}>
      <figcaption className={styles.chartCaption}>
        <span className={styles.chartTitle}>{title}</span>
        <span className={styles.chartSummary}>{summary}</span>
      </figcaption>

      {enough ? (
        <div
          ref={ref}
          style={{ height }}
          className={styles.chartCanvas}
          role="img"
          aria-label={`${title}. ${summary}`}
        />
      ) : (
        <div className={styles.chartEmpty} style={{ height }}>
          accumulating data
        </div>
      )}

      {rows.length > 1 && (
        <details className={styles.chartData}>
          <summary>Show the numbers</summary>
          <table>
            {tableCaption && <caption>{tableCaption}</caption>}
            <thead>
              <tr>
                {rows[0].map((h, i) => (
                  <th key={i} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) =>
                    j === 0 ? (
                      <th key={j} scope="row">
                        {c}
                      </th>
                    ) : (
                      <td key={j}>{c}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
