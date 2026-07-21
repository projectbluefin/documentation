import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import "./factory-charts.css";

type FactoryChartsProps = {
  snapshot?: string;
};

const chartText = "#cbd5e1";
const mutedText = "#64748b";
const gridLine = "rgba(148, 163, 184, 0.14)";

export default function FactoryCharts({
  snapshot = "July 20, 2026 snapshot",
}: FactoryChartsProps) {
  const verdictRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);
  const freshnessRef = useRef<HTMLDivElement>(null);
  const adoptionRef = useRef<HTMLDivElement>(null);
  const trendRef = useRef<HTMLDivElement>(null);
  const coverageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = [
      verdictRef.current,
      durationRef.current,
      freshnessRef.current,
      adoptionRef.current,
      trendRef.current,
      coverageRef.current,
    ];
    if (elements.some((element) => !element)) return;

    const verdictChart = echarts.init(elements[0] as HTMLDivElement);
    const durationChart = echarts.init(elements[1] as HTMLDivElement);
    const freshnessChart = echarts.init(elements[2] as HTMLDivElement);
    const adoptionChart = echarts.init(elements[3] as HTMLDivElement);
    const trendChart = echarts.init(elements[4] as HTMLDivElement);
    const coverageChart = echarts.init(elements[5] as HTMLDivElement);

    verdictChart.setOption({
      animationDuration: 700,
      title: {
        text: "Release status",
        subtext: "4 bad · 1 pending",
        left: "center",
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: { trigger: "item", formatter: "{b}: {c} lanes ({d}%)" },
      legend: {
        bottom: 12,
        textStyle: { color: chartText },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          center: ["50%", "52%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: "#101827", borderWidth: 4 },
          label: {
            color: chartText,
            formatter: "{b}\n{c}",
            fontSize: 12,
            fontWeight: 700,
          },
          data: [
            { value: 4, name: "Bad", itemStyle: { color: "#fb7185" } },
            { value: 1, name: "Pending", itemStyle: { color: "#fbbf24" } },
          ],
        },
      ],
    });

    durationChart.setOption({
      animationDuration: 700,
      title: {
        text: "Build time",
        subtext: "minutes · previous → current",
        left: 20,
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: number) => `${value} min`,
      },
      legend: {
        top: 22,
        right: 20,
        textStyle: { color: chartText },
        data: ["Previous", "Current"],
      },
      grid: { left: 48, right: 24, top: 82, bottom: 40 },
      xAxis: {
        type: "category",
        data: ["LTS stable", "Dakota"],
        axisLabel: { color: chartText, fontWeight: 600 },
        axisLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: "value",
        name: "minutes",
        nameTextStyle: { color: mutedText },
        axisLabel: { color: mutedText },
        splitLine: { lineStyle: { color: gridLine } },
      },
      series: [
        {
          name: "Previous",
          type: "line",
          data: [11, 114],
          smooth: true,
          symbolSize: 10,
          lineStyle: { color: "#64748b", width: 3 },
          itemStyle: { color: "#94a3b8" },
          label: { show: true, color: "#94a3b8", formatter: "{c}m" },
        },
        {
          name: "Current",
          type: "line",
          data: [15, 273],
          smooth: true,
          symbolSize: 10,
          lineStyle: { color: "#fb923c", width: 4 },
          itemStyle: { color: "#fb923c" },
          label: { show: true, color: "#fdba74", formatter: "{c}m" },
        },
      ],
    });

    freshnessChart.setOption({
      animationDuration: 700,
      title: {
        text: "Image freshness",
        subtext: "days since release",
        left: 20,
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: { trigger: "axis", valueFormatter: (value: number) => `${value} days` },
      grid: { left: 86, right: 36, top: 82, bottom: 28 },
      xAxis: {
        type: "value",
        max: 7,
        axisLabel: { color: mutedText, formatter: "{value}d" },
        splitLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: ["Bluefin", "LTS", "Bazzite", "Aurora", "Dakota"],
        axisLabel: { color: chartText, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: "bar",
          barWidth: 18,
          data: [
            { value: 0, itemStyle: { color: "#4ade80" } },
            { value: 0, itemStyle: { color: "#4ade80" } },
            { value: 3, itemStyle: { color: "#fbbf24" } },
            { value: 6, itemStyle: { color: "#fb7185" } },
            { value: 6, itemStyle: { color: "#fb7185" } },
          ],
          label: { show: true, position: "right", color: chartText, formatter: "{c}d" },
          itemStyle: { borderRadius: [0, 5, 5, 0] },
        },
      ],
    });

    adoptionChart.setOption({
      animationDuration: 700,
      title: {
        text: "Active devices",
        subtext: "countme snapshot",
        left: 20,
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: { trigger: "axis", valueFormatter: (value: number) => value.toLocaleString() },
      grid: { left: 82, right: 42, top: 82, bottom: 28 },
      xAxis: {
        type: "value",
        axisLabel: { color: mutedText, formatter: (value: number) => `${Math.round(value / 1000)}k` },
        splitLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: ["Bazzite", "Bluefin", "Aurora"],
        axisLabel: { color: chartText, fontWeight: 600 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: "bar",
        barWidth: 22,
        data: [
          { value: 71550, itemStyle: { color: "#fb923c" } },
          { value: 3502, itemStyle: { color: "#38bdf8" } },
          { value: 2527, itemStyle: { color: "#4ade80" } },
        ],
        label: { show: true, position: "right", color: chartText, formatter: (params: { value: number }) => params.value.toLocaleString() },
        itemStyle: { borderRadius: [0, 5, 5, 0] },
      }],
    });

    trendChart.setOption({
      animationDuration: 700,
      title: {
        text: "Ecosystem adoption",
        subtext: "active devices · monthly total",
        left: 20,
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: { trigger: "axis", valueFormatter: (value: number) => value.toLocaleString() },
      grid: { left: 54, right: 24, top: 82, bottom: 40 },
      xAxis: {
        type: "category",
        data: ["Feb", "Mar", "Apr", "May", "Jun"],
        axisLabel: { color: chartText },
        axisLine: { lineStyle: { color: gridLine } },
      },
      yAxis: {
        type: "value",
        name: "devices",
        nameTextStyle: { color: mutedText },
        axisLabel: { color: mutedText, formatter: (value: number) => `${Math.round(value / 1000)}k` },
        splitLine: { lineStyle: { color: gridLine } },
      },
      series: [{
        type: "line",
        data: [75146, 78371, 81591, 85978, 87045],
        smooth: true,
        symbolSize: 9,
        lineStyle: { color: "#a78bfa", width: 4 },
        itemStyle: { color: "#c4b5fd" },
        areaStyle: { color: "rgba(167, 139, 250, 0.16)" },
        label: { show: true, color: "#ddd6fe", formatter: (params: { value: number }) => `${Math.round(params.value / 1000)}k` },
      }],
    });

    coverageChart.setOption({
      animationDuration: 700,
      title: {
        text: "Telemetry coverage",
        subtext: "tracked image lanes",
        left: "center",
        top: 16,
        textStyle: { color: chartText, fontSize: 18, fontWeight: 700 },
        subtextStyle: { color: mutedText, fontSize: 12 },
      },
      tooltip: { trigger: "item", formatter: "{b}: {c} lanes ({d}%)" },
      legend: { bottom: 12, textStyle: { color: chartText }, itemWidth: 10, itemHeight: 10 },
      series: [{
        type: "pie",
        radius: ["48%", "72%"],
        center: ["50%", "52%"],
        itemStyle: { borderColor: "#101827", borderWidth: 4 },
        label: { color: chartText, formatter: "{b}\n{c}", fontSize: 12, fontWeight: 700 },
        data: [
          { value: 6, name: "Countme data", itemStyle: { color: "#4ade80" } },
          { value: 7, name: "Awaiting data", itemStyle: { color: "#475569" } },
        ],
      }],
    });

    const resizeObserver = new ResizeObserver(() => {
      verdictChart.resize();
      durationChart.resize();
      freshnessChart.resize();
      adoptionChart.resize();
      trendChart.resize();
      coverageChart.resize();
    });
    elements.forEach((element) => resizeObserver.observe(element as HTMLDivElement));

    return () => {
      resizeObserver.disconnect();
      verdictChart.dispose();
      durationChart.dispose();
      freshnessChart.dispose();
      adoptionChart.dispose();
      trendChart.dispose();
      coverageChart.dispose();
    };
  }, []);

  return (
    <section className="factory-charts" aria-label="Factory snapshot charts">
      <div className="factory-charts__eyebrow">Factory snapshot · {snapshot}</div>
      <div className="factory-charts__grid">
        <div ref={verdictRef} className="factory-chart" role="img" aria-label="Release status: four bad lanes and one pending lane." />
        <div ref={durationRef} className="factory-chart" role="img" aria-label="Build time: LTS 11 to 15 minutes, Dakota 114 to 273 minutes." />
        <div ref={freshnessRef} className="factory-chart" role="img" aria-label="Image freshness: Bluefin and LTS are current, Bazzite is three days old, Aurora and Dakota are six days old." />
        <div ref={adoptionRef} className="factory-chart" role="img" aria-label="Active devices: Bazzite 71,550, Bluefin 3,502, Aurora 2,527." />
        <div ref={trendRef} className="factory-chart" role="img" aria-label="Monthly ecosystem active devices grew from 75,146 in February to 87,045 in June." />
        <div ref={coverageRef} className="factory-chart" role="img" aria-label="Telemetry coverage: six of thirteen tracked image lanes have countme data." />
      </div>
    </section>
  );
}
