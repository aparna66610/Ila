"use client";

import { useMemo, useRef } from "react";
import type { Cycle } from "@/lib/models";
import type { SafeInterpretation } from "@/lib/fertilityInterpretation";
import { formatShortDate, formatWeekday } from "@/lib/date";

interface SmoothCycleChartProps {
  cycle: Cycle;
  interpretation: SafeInterpretation;
}

interface Point {
  x: number;
  y: number;
  day: number;
  temp: number;
}

const chartWidth = 1180;
const left = 150;
const top = 72;
const colWidth = 30;
const tempTop = 230;
const tempHeight = 250;
const rowHeight = 26;

export function SmoothCycleChart({ cycle, interpretation }: SmoothCycleChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const logs = cycle.logs;
  const width = Math.max(chartWidth, left + logs.length * colWidth + 48);
  const height = 760;

  const temps = logs.map((log) => log.bbt).filter((temp): temp is number => typeof temp === "number");
  const minTemp = temps.length ? Math.min(35.9, Math.floor((Math.min(...temps) - 0.1) * 10) / 10) : 35.9;
  const maxTemp = temps.length ? Math.max(37.0, Math.ceil((Math.max(...temps) + 0.1) * 10) / 10) : 37.0;
  const tempRange = maxTemp - minTemp || 1;

  const points = useMemo<Point[]>(
    () =>
      logs
        .filter((log) => typeof log.bbt === "number")
        .map((log) => ({
          x: left + (log.cycleDay - 1) * colWidth + colWidth / 2,
          y: tempTop + ((maxTemp - (log.bbt ?? minTemp)) / tempRange) * tempHeight,
          day: log.cycleDay,
          temp: log.bbt ?? minTemp,
        })),
    [logs, maxTemp, minTemp, tempRange],
  );

  const path = smoothPath(points);
  const coverlineTemps = logs.filter((log) => log.cycleDay <= 18 && log.bbt && !log.bbtDisturbed).map((log) => log.bbt as number);
  const coverline = coverlineTemps.length ? Math.max(...coverlineTemps.slice(-6)) : undefined;
  const coverY = coverline ? tempTop + ((maxTemp - coverline) / tempRange) * tempHeight : undefined;

  async function downloadPng() {
    if (!svgRef.current) return;
    const svg = new XMLSerializer().serializeToString(svgRef.current);
    const image = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#f7fbfa";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(2, 2);
      context.drawImage(image, 0, 0);
      const link = document.createElement("a");
      link.download = `cycle-chart-${cycle.startDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }

  function printPdf() {
    if (!svgRef.current) return;
    const svg = new XMLSerializer().serializeToString(svgRef.current);
    const popup = window.open("", "_blank", "width=1200,height=900");
    if (!popup) return;
    popup.document.write(`
      <html>
        <head><title>Cycle chart</title><style>body{margin:0;background:#f7fbfa}svg{width:100%;height:auto}</style></head>
        <body>${svg}<script>window.onload=()=>window.print()</script></body>
      </html>
    `);
    popup.document.close();
  }

  return (
    <section className="chart-panel" aria-label="Cycle chart">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Kindara-style chart</p>
          <h2>Cycle {cycle.startDate}</h2>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={downloadPng}>PNG</button>
          <button type="button" className="secondary-button" onClick={printPdf}>PDF</button>
        </div>
      </div>
      <div className="chart-scroll">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cycle chart with smooth basal temperature line">
          <rect width={width} height={height} rx="0" fill="#f7fbfa" />
          <text x="24" y="34" className="chart-title">365 Feminine Control // Cycle chart</text>
          <text x={width - 320} y="34" className="chart-meta">Method: {interpretation.methodId}</text>
          <text x={width - 320} y="60" className="chart-meta">Mode: learning, not contraception</text>

          {logs.map((log) => {
            const x = left + (log.cycleDay - 1) * colWidth;
            return <rect key={`col-${log.id}`} x={x} y={top} width={colWidth - 1} height={620} fill={log.cycleDay % 2 ? "#edf8f6" : "#f3fbfa"} />;
          })}

          {Array.from({ length: 12 }, (_, index) => {
            const y = tempTop + index * (tempHeight / 11);
            const temp = maxTemp - index * (tempRange / 11);
            return (
              <g key={`temp-line-${index}`}>
                <line x1={left} x2={left + logs.length * colWidth} y1={y} y2={y} stroke="#d3e7e4" />
                <text x={left - 52} y={y + 4} className="axis-label">{temp.toFixed(1)}</text>
              </g>
            );
          })}

          <RowLabel y={top + 18} label="Date" />
          <RowLabel y={top + rowHeight + 18} label="Week day" />
          <RowLabel y={top + rowHeight * 2 + 18} label="Cycle day" strong />
          <rect x={left - 2} y={top + rowHeight * 2} width={logs.length * colWidth + 4} height={rowHeight} fill="#219c9a" opacity="0.9" />

          {logs.map((log) => {
            const x = left + (log.cycleDay - 1) * colWidth + colWidth / 2;
            return (
              <g key={`head-${log.id}`}>
                <text x={x} y={top + 18} className="day-label">{formatShortDate(log.date).split(" ")[1]}</text>
                <text x={x} y={top + rowHeight + 18} className="day-label">{formatWeekday(log.date)[0]}</text>
                <text x={x} y={top + rowHeight * 2 + 18} className="day-label white">{log.cycleDay}</text>
              </g>
            );
          })}

          <RowLabel y={top + rowHeight * 4} label="Mucus" />
          <RowLabel y={top + rowHeight * 5} label="LH" />
          <RowLabel y={top + rowHeight * 6} label="Temp" />
          <RowLabel y={tempTop + tempHeight + 40} label="Bleeding" />
          <RowLabel y={tempTop + tempHeight + 95} label="Sensation" />
          <RowLabel y={tempTop + tempHeight + 150} label="Intimacy" />

          {logs.map((log) => {
            const x = left + (log.cycleDay - 1) * colWidth + colWidth / 2;
            return (
              <g key={`body-${log.id}`}>
                {log.cervicalFluid && log.cervicalFluid !== "none" ? <text x={x} y={top + rowHeight * 4} className="body-label">{mucusCode(log.cervicalFluid)}</text> : null}
                {log.lhTest && log.lhTest !== "negative" ? <text x={x} y={top + rowHeight * 5} className="body-label">{log.lhTest === "peak" ? "P" : "H"}</text> : null}
                {log.bleeding !== "none" ? <rect x={x - 10} y={tempTop + tempHeight + 24} width={20} height={bleedingHeight(log.bleeding)} rx="4" fill="#e87385" /> : null}
                {log.sensation && log.sensation !== "dry" ? (
                  <text x={x} y={tempTop + tempHeight + 93} className="vertical-label" transform={`rotate(-90 ${x} ${tempTop + tempHeight + 93})`}>
                    {log.sensation}
                  </text>
                ) : null}
                {log.intimacy && log.intimacy !== "none" ? <circle cx={x} cy={tempTop + tempHeight + 142} r="8" fill={log.intimacy === "protected" ? "#d9a51f" : "#e87385"} /> : null}
              </g>
            );
          })}

          {coverY ? <line x1={left} x2={left + logs.length * colWidth} y1={coverY} y2={coverY} stroke="#219c9a" strokeWidth="3" opacity="0.8" /> : null}
          {path ? <path d={path} fill="none" stroke="#238f8f" strokeWidth="4" strokeLinecap="round" /> : null}
          {points.map((point) => (
            <g key={`point-${point.day}`}>
              <circle cx={point.x} cy={point.y} r="8" fill="#238f8f" />
              <text x={point.x} y={point.y + 4} className="point-label">{point.day > 20 ? "" : ""}</text>
            </g>
          ))}

          {interpretation.chartAnnotations.map((annotation) => {
            const x = left + (annotation.day - 1) * colWidth + colWidth / 2;
            return (
              <g key={`${annotation.label}-${annotation.day}`}>
                <line x1={x} x2={x} y1={top + 84} y2={tempTop + tempHeight + 160} stroke={annotation.tone === "caution" ? "#e87385" : "#219c9a"} strokeDasharray="6 6" opacity="0.55" />
                <rect x={x - 54} y={tempTop - 38} width="108" height="24" rx="6" fill="#ffffff" stroke="#b9ded9" />
                <text x={x} y={tempTop - 21} className="annotation-label">{annotation.label}</text>
              </g>
            );
          })}

          <rect x="56" y="686" width={width - 112} height="48" rx="8" fill="#ffffff" stroke="#6bbeb8" />
          <text x="78" y="716" className="chart-footnote">Learning note: chart markers explain observed signs. This MVP does not give contraception clearance.</text>
        </svg>
      </div>
    </section>
  );
}

function RowLabel({ y, label, strong = false }: { y: number; label: string; strong?: boolean }) {
  return <text x={left - 12} y={y} className={strong ? "row-label strong" : "row-label"}>{label}</text>;
}

function mucusCode(value: string): string {
  if (value === "eggwhite") return "E";
  if (value === "watery") return "W";
  if (value === "creamy") return "C";
  if (value === "sticky") return "S";
  return "";
}

function bleedingHeight(value: string): number {
  if (value === "heavy") return 24;
  if (value === "medium") return 18;
  if (value === "light") return 12;
  return 6;
}

function smoothPath(points: Point[]): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    commands.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return commands.join(" ");
}
