// ============================================================
// SIGNAL PRIMITIVES — shared by every FABM engine
// ============================================================
import type { DayObservation, CycleHistoryEntry } from "./types.ts";

export const CF_RANK: Record<string, number> = {
  none: 0, sticky: 1, creamy: 2, watery: 3, eggwhite: 4,
};
export const FERTILE_CF_THRESHOLD = 3; // watery or eggwhite
export const FERTILE_SENSATIONS = new Set(["wet", "slippery"]);

/** True if a single day's mucus/sensation reading is fertile-quality. */
export function isFertileMucus(day: DayObservation | undefined): boolean {
  if (!day) return false;
  if (day.cervicalFluid && CF_RANK[day.cervicalFluid] >= FERTILE_CF_THRESHOLD) return true;
  if (day.sensation && FERTILE_SENSATIONS.has(day.sensation)) return true;
  return false;
}

/**
 * Peak Day = last day of fertile-quality mucus, confirmed retrospectively
 * once 3 consecutive days of lower-quality mucus follow it.
 * Returns 1-indexed day number, or null if not yet confirmable.
 */
export function findMucusPeakDay(days: DayObservation[]): number | null {
  for (let i = days.length - 4; i >= 0; i--) {
    if (isFertileMucus(days[i])) {
      const after3 = days.slice(i + 1, i + 4);
      if (after3.length === 3 && after3.every((d) => !isFertileMucus(d))) {
        return i + 1;
      }
    }
  }
  return null;
}

/** First day in the cycle with any fertile-quality mucus, or null. */
export function findFirstFertileMucusDay(days: DayObservation[]): number | null {
  const idx = days.findIndex((d) => isFertileMucus(d));
  return idx === -1 ? null : idx + 1;
}

/**
 * Classic 3-over-6 temperature rule with a configurable threshold on the
 * 3rd elevated reading (Sensiplan requires >=0.2C above the highest low;
 * looser implementations use 0). Skips days flagged bbtDisturbed.
 * Returns the 1-indexed day the shift is CONFIRMED (the 3rd elevated day).
 */
export function findTemperatureShiftDay(
  days: DayObservation[],
  threshold = 0.2
): { shiftDay: number | null; highestOfSixLows: number | null } {
  const valid = days
    .map((d, i) => ({ idx: i, temp: d.bbt, disturbed: d.bbtDisturbed }))
    .filter((d) => d.temp != null && !d.disturbed) as { idx: number; temp: number; disturbed?: boolean }[];

  for (let i = 6; i < valid.length; i++) {
    const priorSix = valid.slice(i - 6, i).map((d) => d.temp);
    const highSix = Math.max(...priorSix);
    const nextThree = valid.slice(i, i + 3);
    if (
      nextThree.length === 3 &&
      nextThree.every((d) => d.temp > highSix) &&
      nextThree[2].temp - highSix >= threshold
    ) {
      return { shiftDay: valid[i + 2].idx + 1, highestOfSixLows: highSix };
    }
  }
  return { shiftDay: null, highestOfSixLows: null };
}

/**
 * Döring calendar calculation: earliest confirmed temperature-shift day
 * across recent cycle history, minus an offset (Sensiplan uses 8).
 * Used by double-check methods to open the fertile window even before
 * mucus appears, as a conservative safety margin.
 */
export function doringCalendarDay(
  history: CycleHistoryEntry[],
  minus = 8,
  lookbackCycles = 12
): number | null {
  const recent = history.slice(-lookbackCycles).filter((c) => c.temperatureShiftDay != null);
  if (recent.length < 3) return null; // not enough history to calculate safely
  const earliest = Math.min(...recent.map((c) => c.temperatureShiftDay!));
  return earliest - minus;
}

/** First day an LH reading hits "high", or null. */
export function findFirstLhHighDay(days: DayObservation[]): number | null {
  const idx = days.findIndex((d) => d.lhTest === "high" || d.lhTest === "peak");
  return idx === -1 ? null : idx + 1;
}

/** First day an LH reading hits "peak" (the actual surge), or null. */
export function findLhPeakDay(days: DayObservation[]): number | null {
  const idx = days.findIndex((d) => d.lhTest === "peak");
  return idx === -1 ? null : idx + 1;
}
