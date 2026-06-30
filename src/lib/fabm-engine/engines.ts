// ============================================================
// FABM ALGORITHM ENGINES — one per type, per the corrected
// taxonomy (community "Types of FABMs" doc + r/FAMnNFP wiki)
// ============================================================
import type { DayObservation, CycleHistoryEntry, AlgorithmResult } from "./types.ts";
import {
  isFertileMucus,
  findMucusPeakDay,
  findFirstFertileMucusDay,
  findTemperatureShiftDay,
  doringCalendarDay,
  findFirstLhHighDay,
  findLhPeakDay,
} from "./signals.ts";

const today = (days: DayObservation[]) => days[days.length - 1];
const todayDayNum = (days: DayObservation[]) => days.length;

// ────────────────────────────────────────────────────────────
// ENGINE 1: SYMPTOTHERMAL DOUBLE-CHECK
// Opens: mucus OR calendar calc (whichever first)
// Closes: mucus dried (peak +3) AND BBT shift confirmed
// Covers: Sensiplan, NFPTA, Fertility UK, Natural Fertility NZ,
//         SymptoPro, CCL, NFPI, SymptoTherm Foundation, Serena
// ────────────────────────────────────────────────────────────
export function symptothermalDoubleCheck(
  days: DayObservation[],
  history: CycleHistoryEntry[] = [],
  config: { tempThreshold?: number; doringMinus?: number } = {}
): AlgorithmResult {
  const { tempThreshold = 0.2, doringMinus = 8 } = config;
  const trace: string[] = [];
  const warnings: string[] = [];
  const t = todayDayNum(days);

  if (t === 0) return insufficientData();

  const peakDay = findMucusPeakDay(days);
  const firstMucusDay = findFirstFertileMucusDay(days);
  const { shiftDay, highestOfSixLows } = findTemperatureShiftDay(days, tempThreshold);
  const calendarDay = doringCalendarDay(history, doringMinus);

  // ── OPEN: whichever comes first, mucus or calendar calc ──
  let openDay: number | null = null;
  let openReason: "mucus" | "calendar_calc" | "both" | undefined;
  if (firstMucusDay && calendarDay) {
    openDay = Math.min(firstMucusDay, calendarDay);
    openReason = firstMucusDay === calendarDay ? "both" : firstMucusDay < calendarDay ? "mucus" : "calendar_calc";
  } else if (firstMucusDay) {
    openDay = firstMucusDay; openReason = "mucus";
  } else if (calendarDay) {
    openDay = calendarDay; openReason = "calendar_calc";
  }

  if (calendarDay) trace.push(`Calendar calc (Doring -${doringMinus}): infertile through day ${calendarDay - 1}.`);
  if (firstMucusDay) trace.push(`First fertile mucus observed: day ${firstMucusDay}.`);

  // ── Before window opens: pre-ovulatory infertile ──
  if (!openDay || t < openDay) {
    trace.push(openDay ? `Day ${t} < open day ${openDay}. Pre-ovulatory infertile.` : "Awaiting first mucus or calendar threshold.");
    return { status: "pre_ovulatory_infertile", fertileWindowOpenDay: openDay ?? undefined, fertileWindowOpenReason: openReason, warnings, trace };
  }

  // ── CLOSE: double-check requires peak >=3 days before temp shift AND today >= shift ──
  const peakBeforeShift = peakDay != null && shiftDay != null && shiftDay - peakDay >= 3;
  if (shiftDay && peakBeforeShift && t >= shiftDay) {
    trace.push(`Double-check satisfied: peak day ${peakDay}, temp shift confirmed day ${shiftDay} (P+${shiftDay - peakDay}).`);
    if (highestOfSixLows != null) trace.push(`Highest of 6 lows: ${highestOfSixLows.toFixed(2)}C.`);
    return {
      status: "post_ovulatory_infertile",
      fertileWindowOpenDay: openDay, fertileWindowOpenReason: openReason,
      fertileWindowCloseDay: shiftDay, mucusPeakDay: peakDay ?? undefined, temperatureShiftDay: shiftDay,
      warnings, trace,
    };
  }

  // ── Still in fertile window, double-check pending ──
  const pending: string[] = [];
  if (!shiftDay) pending.push("temperature shift not yet confirmed");
  if (!peakDay) pending.push("mucus peak day not yet confirmed");
  if (shiftDay && peakDay && !peakBeforeShift) pending.push(`peak must be >=3 days before shift (currently P+${shiftDay - peakDay})`);
  trace.push(`Window open since day ${openDay} (${openReason}). Pending: ${pending.join("; ")}.`);

  if (today(days)?.bbtDisturbed) warnings.push("Today's BBT marked disturbed — excluded from temperature rule.");

  return {
    status: isFertileMucus(today(days)) ? "peak_fertile" : "potentially_fertile",
    fertileWindowOpenDay: openDay, fertileWindowOpenReason: openReason,
    mucusPeakDay: peakDay ?? undefined, temperatureShiftDay: shiftDay ?? undefined,
    warnings, trace,
  };
}

// ────────────────────────────────────────────────────────────
// ENGINE 2: SYMPTOTHERMAL SINGLE-CHECK
// Opens: mucus ONLY (no calendar backup — the key difference)
// Closes: mucus dried (peak+3) AND BBT shift confirmed
// Covers: TCOYF, Justisse, The Well, Natural Fertility Ed. Australia
// ────────────────────────────────────────────────────────────
export function symptothermalSingleCheck(
  days: DayObservation[],
  config: { tempThreshold?: number } = {}
): AlgorithmResult {
  const { tempThreshold = 0.2 } = config;
  const trace: string[] = [];
  const warnings: string[] = [];
  const t = todayDayNum(days);
  if (t === 0) return insufficientData();

  const peakDay = findMucusPeakDay(days);
  const firstMucusDay = findFirstFertileMucusDay(days);
  const { shiftDay } = findTemperatureShiftDay(days, tempThreshold);

  // NO calendar fallback — window can ONLY open via mucus.
  if (!firstMucusDay) {
    trace.push("No mucus observed yet. Single-check methods have no calendar backup — pre-ovulatory infertile by default, but this is less conservative than double-check.");
    warnings.push("Single-check: no calendar safety net. Relies entirely on accurate mucus observation to open the window.");
    return { status: "pre_ovulatory_infertile", warnings, trace };
  }

  if (t < firstMucusDay) {
    return { status: "pre_ovulatory_infertile", fertileWindowOpenDay: firstMucusDay, fertileWindowOpenReason: "mucus", warnings, trace };
  }

  const peakBeforeOrAtShift = peakDay != null && shiftDay != null && shiftDay >= peakDay;
  if (shiftDay && peakBeforeOrAtShift && t >= shiftDay) {
    trace.push(`Closed: peak day ${peakDay}, temp shift day ${shiftDay}. Single-check (no 3-day buffer requirement).`);
    return {
      status: "post_ovulatory_infertile",
      fertileWindowOpenDay: firstMucusDay, fertileWindowOpenReason: "mucus",
      fertileWindowCloseDay: shiftDay, mucusPeakDay: peakDay ?? undefined, temperatureShiftDay: shiftDay,
      warnings, trace,
    };
  }

  trace.push(`Fertile window open since day ${firstMucusDay} (mucus only). Awaiting close.`);
  return {
    status: isFertileMucus(today(days)) ? "peak_fertile" : "potentially_fertile",
    fertileWindowOpenDay: firstMucusDay, fertileWindowOpenReason: "mucus",
    mucusPeakDay: peakDay ?? undefined, temperatureShiftDay: shiftDay ?? undefined,
    warnings, trace,
  };
}

// ────────────────────────────────────────────────────────────
// ENGINE 3: CERVICAL MUCUS-ONLY
// Opens AND closes on mucus alone — no BBT exists in this type.
// Covers: Billings, Creighton
// ────────────────────────────────────────────────────────────
export function cervicalMucusOnly(
  days: DayObservation[],
  config: { mode?: "billings" | "creighton" } = {}
): AlgorithmResult {
  const trace: string[] = [];
  const warnings: string[] = [];
  const t = todayDayNum(days);
  if (t === 0) return insufficientData();

  const peakDay = findMucusPeakDay(days);
  const daysSincePeak = peakDay ? t - peakDay : null;
  const td = today(days);

  if (config.mode === "billings" && (td.bleeding === "heavy" || td.bleeding === "medium")) {
    trace.push("Rule 1: avoid intercourse on heavy/medium bleeding days.");
    return { status: "potentially_fertile", warnings, trace };
  }

  if (peakDay && daysSincePeak != null && daysSincePeak >= 3) {
    trace.push(`Peak day ${peakDay} confirmed. Now P+${daysSincePeak}. Post-peak infertile phase.`);
    return { status: "post_ovulatory_infertile", mucusPeakDay: peakDay, fertileWindowCloseDay: peakDay + 3, warnings, trace };
  }

  if (isFertileMucus(td) || (peakDay && daysSincePeak! < 3)) {
    trace.push("Fertile-quality mucus present, or within 3-day post-peak buffer.");
    return { status: "peak_fertile", mucusPeakDay: peakDay ?? undefined, warnings, trace };
  }

  const noFertileMucusYet = !days.slice(0, t - 1).some(isFertileMucus);
  if (t <= 5 && noFertileMucusYet) {
    trace.push("Early dry day, no fertile mucus yet this cycle — basic infertile pattern.");
    return { status: "pre_ovulatory_infertile", warnings, trace };
  }

  trace.push("Dry/non-fertile day mid-cycle, no confirmed basic infertile pattern — treat cautiously.");
  return { status: "potentially_fertile", warnings, trace };
}

// ────────────────────────────────────────────────────────────
// ENGINE 4: SYMPTOHORMONAL
// Opens: mucus or LH rise; Closes: LH peak + 3 days
// Covers: Marquette, Boston Cross-Check, FEMM
// ────────────────────────────────────────────────────────────
export function symptohormonal(
  days: DayObservation[],
  config: { useBBTCrossCheck?: boolean } = {}
): AlgorithmResult {
  const trace: string[] = [];
  const warnings: string[] = [];
  const t = todayDayNum(days);
  if (t === 0) return insufficientData();

  const firstHigh = findFirstLhHighDay(days);
  const peak = findLhPeakDay(days);
  const firstMucus = findFirstFertileMucusDay(days);
  const openDay = firstHigh ?? firstMucus ?? null;

  if (!openDay) {
    trace.push("No LH rise or fertile mucus detected yet.");
    return { status: "pre_ovulatory_infertile", warnings, trace };
  }

  if (peak) {
    const sincePeak = t - peak;
    if (sincePeak >= 3) {
      if (config.useBBTCrossCheck) {
        const { shiftDay } = findTemperatureShiftDay(days);
        if (!shiftDay) {
          warnings.push("LH peak+3 reached but BBT cross-check not confirmed (Boston Cross-Check protocol) — remain cautious.");
          return { status: "potentially_fertile", fertileWindowOpenDay: openDay, warnings, trace };
        }
      }
      trace.push(`LH peak day ${peak}. Now P+${sincePeak}. Post-ovulatory infertile.`);
      return { status: "post_ovulatory_infertile", fertileWindowOpenDay: openDay, fertileWindowCloseDay: peak + 3, warnings, trace };
    }
    trace.push(`LH peak day ${peak}. Now P+${sincePeak}. Still fertile, awaiting P+3.`);
    return { status: "peak_fertile", fertileWindowOpenDay: openDay, warnings, trace };
  }

  trace.push(`Fertile window open since day ${openDay}. No LH peak yet.`);
  return { status: "potentially_fertile", fertileWindowOpenDay: openDay, warnings, trace };
}

// ────────────────────────────────────────────────────────────
// ENGINE 5: CALCULOTHERMAL  (Natural Cycles / Daysy-style)
// Opens: calendar calc; Closes: BBT only. Flagged not-recommended.
// ────────────────────────────────────────────────────────────
export function calculothermal(
  days: DayObservation[],
  history: CycleHistoryEntry[] = [],
  config: { tempThreshold?: number } = {}
): AlgorithmResult {
  const warnings = ["Calculothermal methods are not usually recommended due to higher failure rates."];
  const trace: string[] = [];
  const t = todayDayNum(days);
  if (t === 0) return insufficientData();

  const { shiftDay } = findTemperatureShiftDay(days, config.tempThreshold ?? 0);
  const calendarDay = doringCalendarDay(history, 6);

  if (!shiftDay) {
    trace.push("No confirmed BBT shift yet — entire pre-ovulatory phase treated as fertile (cannot open window prospectively).");
    return { status: "potentially_fertile", fertileWindowOpenDay: calendarDay ?? 1, fertileWindowOpenReason: "calendar_calc", warnings, trace };
  }

  trace.push(`BBT shift confirmed day ${shiftDay}.`);
  return { status: "post_ovulatory_infertile", fertileWindowCloseDay: shiftDay, temperatureShiftDay: shiftDay, warnings, trace };
}

// ────────────────────────────────────────────────────────────
// ENGINE 6: CALENDAR-ONLY  (Rhythm method)
// Opens/closes purely on past cycle-length arithmetic.
// ────────────────────────────────────────────────────────────
export function calendarOnly(
  todayDay: number,
  history: CycleHistoryEntry[]
): AlgorithmResult {
  const warnings = ["Calendar-only methods are not usually recommended due to higher failure rates."];
  const trace: string[] = [];
  const lengths = history.map((h) => h.cycleLength).filter((l) => l > 0);

  if (lengths.length < 6) {
    return { status: "insufficient_data", warnings, trace: [`Need 6+ past cycles, have ${lengths.length}.`] };
  }

  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  const fertileStart = shortest - 18;
  const fertileEnd = longest - 11;
  trace.push(`Shortest ${shortest}, longest ${longest} -> fertile window days ${fertileStart}-${fertileEnd}.`);

  if (todayDay < fertileStart) return { status: "pre_ovulatory_infertile", fertileWindowOpenDay: fertileStart, warnings, trace };
  if (todayDay > fertileEnd) return { status: "post_ovulatory_infertile", fertileWindowCloseDay: fertileEnd, warnings, trace };
  return { status: "potentially_fertile", fertileWindowOpenDay: fertileStart, fertileWindowCloseDay: fertileEnd, warnings, trace };
}

function insufficientData(): AlgorithmResult {
  return { status: "insufficient_data", warnings: ["No observations logged yet."], trace: [] };
}
