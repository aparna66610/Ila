"use client";

import { useMemo, useState } from "react";
import { runMethod } from "@/lib/fabm-engine/dispatcher";
import { METHOD_REGISTRY } from "@/lib/fabm-engine/registry";
import type { AlgorithmResult, CycleHistoryEntry, DayObservation, FabmType, FertilityStatus } from "@/lib/fabm-engine/types";

const HISTORY: CycleHistoryEntry[] = [
  { cycleLength: 28, temperatureShiftDay: 16 },
  { cycleLength: 29, temperatureShiftDay: 17 },
  { cycleLength: 27, temperatureShiftDay: 15 },
];

const STATUS_COPY: Record<FertilityStatus, { label: string; text: string; tone: string }> = {
  pre_ovulatory_infertile: {
    label: "Early low-fertility pattern",
    text: "The selected method has not opened the fertile window yet.",
    tone: "positive",
  },
  potentially_fertile: {
    label: "Potentially fertile",
    text: "The selected method is treating this day cautiously.",
    tone: "caution",
  },
  peak_fertile: {
    label: "Peak fertile signs",
    text: "Fertile-quality mucus, sensation, or hormone signs are visible.",
    tone: "alert",
  },
  post_ovulatory_infertile: {
    label: "Post-ovulatory pattern",
    text: "A close marker appears in this educational replay.",
    tone: "info",
  },
  method_not_applicable: {
    label: "Method not applicable",
    text: "This method does not fit the available observations.",
    tone: "neutral",
  },
  insufficient_data: {
    label: "Insufficient data",
    text: "Add more observations to see an interpretation.",
    tone: "neutral",
  },
};

const CF_COLORS: Record<string, string> = {
  none: "#e4ece9",
  sticky: "#d8c586",
  creamy: "#f0dca0",
  watery: "#8fd2e4",
  eggwhite: "#4eb2cf",
};

const TYPE_LABELS: Record<FabmType, string> = {
  symptothermal_double_check: "Double-check",
  symptothermal_single_check: "Single-check",
  cervical_mucus_only: "Mucus-only",
  symptohormonal: "Symptohormonal",
  calculothermal: "Temp/calendar",
  calendar_only: "Calendar-only",
};

const TYPE_ORDER: FabmType[] = [
  "symptothermal_double_check",
  "symptothermal_single_check",
  "cervical_mucus_only",
  "symptohormonal",
  "calculothermal",
  "calendar_only",
];

export function MethodReplayLab() {
  const [methodId, setMethodId] = useState("sensiplan");
  const [compareId, setCompareId] = useState("billings");
  const [dayIndex, setDayIndex] = useState(11);

  const visibleDays = useMemo(() => TEXTBOOK_CYCLE.slice(0, dayIndex + 1), [dayIndex]);
  const result = useMemo(() => runMethod(methodId, visibleDays, HISTORY), [methodId, visibleDays]);
  const compareResult = useMemo(() => runMethod(compareId, visibleDays, HISTORY), [compareId, visibleDays]);
  const groupedMethods = useMemo(() => groupMethods(), []);
  const method = METHOD_REGISTRY.find((item) => item.id === methodId) ?? METHOD_REGISTRY[0];
  const compareMethod = METHOD_REGISTRY.find((item) => item.id === compareId) ?? METHOD_REGISTRY[14];

  return (
    <section className="panel method-lab">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Method Lab</p>
          <h2>Replay the same cycle through different FABM rules</h2>
        </div>
        <span className="status-dot on">Engine-backed</span>
      </div>

      <p className="muted lab-intro">
        This lab turns the pasted demo into a safer product feature: it reuses the tested TypeScript engine and shows how method families disagree on the same observations. It is for education, not medical or contraception guidance.
      </p>

      <div className="lab-grid">
        <div className="lab-control">
          <div className="lab-label">Primary method</div>
          <MethodButtons groupedMethods={groupedMethods} selectedId={methodId} onSelect={setMethodId} />
        </div>

        <div className="lab-control">
          <div className="lab-label">Compare with</div>
          <MethodButtons groupedMethods={groupedMethods} selectedId={compareId} onSelect={setCompareId} compact />
        </div>
      </div>

      <div className="cycle-scrubber">
        <div className="section-heading compact-heading">
          <div>
            <p className="eyebrow">Cycle replay</p>
            <h2>Day {dayIndex + 1} of {TEXTBOOK_CYCLE.length}</h2>
          </div>
          <span className="privacy-pill">Textbook fixture</span>
        </div>
        <input
          aria-label="Cycle day"
          type="range"
          min={0}
          max={TEXTBOOK_CYCLE.length - 1}
          value={dayIndex}
          onChange={(event) => setDayIndex(Number(event.target.value))}
        />
        <div className="day-strip">
          {TEXTBOOK_CYCLE.map((day, index) => (
            <button
              type="button"
              key={day.day}
              className={index === dayIndex ? "day-chip active" : index < dayIndex ? "day-chip seen" : "day-chip"}
              style={{ "--mucus-color": CF_COLORS[day.cervicalFluid ?? "none"] } as React.CSSProperties}
              title={`Day ${day.day}: ${day.cervicalFluid}, ${day.bbt?.toFixed(2)} C`}
              onClick={() => setDayIndex(index)}
            >
              <span>{day.day}</span>
            </button>
          ))}
        </div>
        <div className="legend-row">
          {Object.entries(CF_COLORS).map(([label, color]) => (
            <span key={label}><i style={{ background: color }} />{label}</span>
          ))}
        </div>
      </div>

      <div className="comparison-grid">
        <StatusCard methodLabel={method.label} result={result} />
        <StatusCard methodLabel={compareMethod.label} result={compareResult} />
      </div>

      {result.status !== compareResult.status ? (
        <div className="lab-callout">
          These methods disagree on cycle day {dayIndex + 1}. That difference is the teaching moment: each method opens and closes the fertile window using different evidence and different safety buffers.
        </div>
      ) : (
        <div className="lab-callout quiet">
          These methods agree on cycle day {dayIndex + 1}. Scrub across the cycle or compare with mucus-only/calendar-only methods to see where assumptions diverge.
        </div>
      )}

      <TracePanel result={result} />
    </section>
  );
}

function MethodButtons({
  groupedMethods,
  selectedId,
  compact = false,
  onSelect,
}: {
  groupedMethods: Record<FabmType, typeof METHOD_REGISTRY>;
  selectedId: string;
  compact?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={compact ? "method-button-groups compact" : "method-button-groups"}>
      {TYPE_ORDER.map((type) => (
        <div key={type} className="method-button-group">
          <span>{TYPE_LABELS[type]}</span>
          <div>
            {groupedMethods[type].map((method) => (
              <button
                type="button"
                key={method.id}
                className={selectedId === method.id ? "mini-method active" : "mini-method"}
                onClick={() => onSelect(method.id)}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusCard({ methodLabel, result }: { methodLabel: string; result: AlgorithmResult }) {
  const copy = STATUS_COPY[result.status] ?? STATUS_COPY.insufficient_data;
  return (
    <article className={`lab-status ${copy.tone}`}>
      <p>{methodLabel}</p>
      <h3>{copy.label}</h3>
      <span>{copy.text}</span>
      <div className="lab-metrics">
        {result.fertileWindowOpenDay ? <Metric label="Opens" value={`Day ${result.fertileWindowOpenDay}`} /> : null}
        {result.mucusPeakDay ? <Metric label="Peak" value={`Day ${result.mucusPeakDay}`} /> : null}
        {result.temperatureShiftDay ? <Metric label="Temp shift" value={`Day ${result.temperatureShiftDay}`} /> : null}
        {result.fertileWindowCloseDay ? <Metric label="Closes" value={`Day ${result.fertileWindowCloseDay}`} /> : null}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function TracePanel({ result }: { result: AlgorithmResult }) {
  return (
    <div className="trace-panel">
      <div className="lab-label">Algorithm trace</div>
      {result.trace.length ? (
        result.trace.map((line) => <p key={line}><span>{">"}</span>{line}</p>)
      ) : (
        <p><span>{">"}</span>No trace yet.</p>
      )}
      {result.warnings.map((warning) => <p key={warning} className="trace-warning"><span>!</span>{warning}</p>)}
    </div>
  );
}

function groupMethods(): Record<FabmType, typeof METHOD_REGISTRY> {
  return TYPE_ORDER.reduce((groups, type) => {
    groups[type] = METHOD_REGISTRY.filter((method) => method.fabmType === type);
    return groups;
  }, {} as Record<FabmType, typeof METHOD_REGISTRY>);
}

function buildTextbookCycle(): DayObservation[] {
  return [
    { day: 1, bleeding: "heavy", cervicalFluid: "none", sensation: "dry", bbt: 36.2, lhTest: "low" },
    { day: 2, bleeding: "medium", cervicalFluid: "none", sensation: "dry", bbt: 36.22, lhTest: "low" },
    { day: 3, bleeding: "light", cervicalFluid: "none", sensation: "dry", bbt: 36.21, lhTest: "low" },
    { day: 4, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.19, lhTest: "low" },
    { day: 5, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.2, lhTest: "low" },
    { day: 6, bleeding: "none", cervicalFluid: "sticky", sensation: "dry", bbt: 36.21, lhTest: "low" },
    { day: 7, bleeding: "none", cervicalFluid: "creamy", sensation: "moist", bbt: 36.22, lhTest: "high" },
    { day: 8, bleeding: "none", cervicalFluid: "watery", sensation: "wet", bbt: 36.2, lhTest: "high" },
    { day: 9, bleeding: "none", cervicalFluid: "eggwhite", sensation: "slippery", bbt: 36.19, lhTest: "peak" },
    { day: 10, bleeding: "none", cervicalFluid: "creamy", sensation: "moist", bbt: 36.23, lhTest: "high" },
    { day: 11, bleeding: "none", cervicalFluid: "sticky", sensation: "dry", bbt: 36.25, lhTest: "low" },
    { day: 12, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.24, lhTest: "low" },
    { day: 13, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.58, lhTest: "low" },
    { day: 14, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.61, lhTest: "low" },
    { day: 15, bleeding: "none", cervicalFluid: "none", sensation: "dry", bbt: 36.69, lhTest: "low" },
  ];
}

const TEXTBOOK_CYCLE = buildTextbookCycle();
