import { runMethod } from "./fabm-engine/dispatcher.ts";
import type { AlgorithmResult, CycleHistoryEntry, DayObservation, FertilityStatus } from "./fabm-engine/types.ts";
import type { AppData, Cycle, DayLog, Goal, UserProfile } from "./models.ts";
import { daysBetween } from "./date.ts";
import { methodIdFromPreference } from "./methodPicker.ts";

export interface ChartAnnotation {
  day: number;
  label: string;
  tone: "info" | "caution" | "positive";
}

export interface SafeInterpretation {
  methodId: string;
  rawStatus: FertilityStatus;
  trackingStatus: string;
  confidence: "low" | "medium" | "high";
  chartAnnotations: ChartAnnotation[];
  educationWarnings: string[];
  notForContraceptiveUse: boolean;
  trace: string[];
}

export function dayLogToObservation(log: DayLog): DayObservation {
  return {
    day: log.cycleDay,
    bleeding: log.bleeding,
    cervicalFluid: log.cervicalFluid,
    sensation: log.sensation,
    bbt: log.bbt,
    bbtDisturbed: log.bbtDisturbed,
    lhTest: log.lhTest,
    cervixFirm: log.cervixTexture === "firm",
  };
}

export function cycleToObservations(cycle: Cycle): DayObservation[] {
  return [...cycle.logs].sort((a, b) => a.cycleDay - b.cycleDay).map(dayLogToObservation);
}

export function cycleHistoryFromCycles(cycles: Cycle[], currentCycleId: string): CycleHistoryEntry[] {
  return cycles
    .filter((cycle) => cycle.id !== currentCycleId)
    .map((cycle) => ({
      cycleLength: Math.max(cycle.logs.length, cycle.expectedPeriodDate ? daysBetween(cycle.startDate, cycle.expectedPeriodDate) : 0),
      temperatureShiftDay: inferTemperatureShiftDay(cycle),
    }))
    .filter((entry) => entry.cycleLength > 0);
}

export function inferTemperatureShiftDay(cycle: Cycle): number | undefined {
  const result = runMethod("sensiplan", cycleToObservations(cycle), []);
  return result.temperatureShiftDay;
}

export function interpretCurrentCycle(data: AppData): SafeInterpretation {
  const cycle = data.cycles[0];
  const profile = data.profile;
  if (!cycle || !profile || profile.lifeStage === "post_menopause") {
    return emptyInterpretation(profile, "Wellness tracking active. Cycle interpretation is paused.");
  }

  const methodId = profile.selectedMethodId || methodIdFromPreference(profile.methodPreference, profile);
  const result = runMethod(methodId, cycleToObservations(cycle), cycleHistoryFromCycles(data.cycles, cycle.id));
  return wrapAlgorithmResult(result, profile, methodId, cycle);
}

export function wrapAlgorithmResult(result: AlgorithmResult, profile: UserProfile, methodId: string, cycle: Cycle): SafeInterpretation {
  const avoidGoal = profile.goals.includes("avoid_pregnancy_education");
  const notForContraceptiveUse = avoidGoal || methodId === "natural_cycles" || methodId === "rhythm";
  const confidence = confidenceFor(cycle);
  const educationWarnings = [
    ...result.warnings,
    "This MVP is for cycle literacy, tracking, and education. It is not a contraceptive medical device.",
  ];

  if (avoidGoal) {
    educationWarnings.unshift("Avoid-pregnancy mode is learning-only in this MVP. Do not use green/safe-day assumptions from this app.");
  }

  return {
    methodId,
    rawStatus: result.status,
    trackingStatus: statusCopy(result.status, profile.goals, confidence),
    confidence,
    chartAnnotations: annotationsFor(result),
    educationWarnings: [...new Set(educationWarnings)],
    notForContraceptiveUse,
    trace: result.trace,
  };
}

function confidenceFor(cycle: Cycle): "low" | "medium" | "high" {
  const logged = cycle.logs.filter((log) => log.bleeding !== "none" || log.bbt || log.cervicalFluid || log.lhTest || log.notes).length;
  const tempDays = cycle.logs.filter((log) => log.bbt && !log.bbtDisturbed).length;
  const mucusDays = cycle.logs.filter((log) => log.cervicalFluid && log.cervicalFluid !== "none").length;
  if (logged >= 18 && tempDays >= 10 && mucusDays >= 4) return "high";
  if (logged >= 8 && (tempDays >= 4 || mucusDays >= 2)) return "medium";
  return "low";
}

function annotationsFor(result: AlgorithmResult): ChartAnnotation[] {
  const annotations: ChartAnnotation[] = [];
  if (result.fertileWindowOpenDay) annotations.push({ day: result.fertileWindowOpenDay, label: "Fertile signs begin", tone: "caution" });
  if (result.mucusPeakDay) annotations.push({ day: result.mucusPeakDay, label: "Peak mucus", tone: "info" });
  if (result.temperatureShiftDay) annotations.push({ day: result.temperatureShiftDay, label: "Temp shift", tone: "positive" });
  if (result.fertileWindowCloseDay) annotations.push({ day: result.fertileWindowCloseDay, label: "Learning close marker", tone: "info" });
  return annotations;
}

function statusCopy(status: FertilityStatus, goals: Goal[], confidence: "low" | "medium" | "high"): string {
  const avoid = goals.includes("avoid_pregnancy_education");
  if (avoid) {
    if (status === "peak_fertile" || status === "potentially_fertile") return "Fertile signs observed. Use caution and follow an instructor-guided method.";
    if (status === "post_ovulatory_infertile") return "Post-ovulatory pattern detected for learning. Not a safe-day recommendation.";
    if (status === "pre_ovulatory_infertile") return "Early-cycle pattern detected for learning. Not a safe-day recommendation.";
    return "More data is needed before chart education can be shown.";
  }

  if (status === "peak_fertile") return "Peak fertile signs are present.";
  if (status === "potentially_fertile") return "Fertile signs may be present.";
  if (status === "post_ovulatory_infertile") return "A post-ovulatory pattern is visible in your chart.";
  if (status === "pre_ovulatory_infertile") return "Early-cycle low-fertility pattern is visible.";
  if (confidence === "low") return "Log a few more days to unlock clearer patterns.";
  return "More data is needed for this method.";
}

function emptyInterpretation(profile: UserProfile | undefined, message: string): SafeInterpretation {
  return {
    methodId: profile?.selectedMethodId ?? "none",
    rawStatus: "insufficient_data",
    trackingStatus: message,
    confidence: "low",
    chartAnnotations: [],
    educationWarnings: ["This app is not a contraceptive medical device."],
    notForContraceptiveUse: true,
    trace: [],
  };
}
