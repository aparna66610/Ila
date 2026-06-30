import { inferTemperatureShiftDay } from "./fertilityInterpretation.ts";
import type { AppData, Cycle } from "./models.ts";
import { daysBetween } from "./date.ts";

export type AlgorithmPhaseStatus = "ready" | "needs_data" | "planned" | "blocked";

export interface AlgorithmPhase {
  id: string;
  title: string;
  status: AlgorithmPhaseStatus;
  metric: string;
  body: string;
}

export interface AlgorithmFeature {
  id: string;
  label: string;
  value: string;
  detail: string;
  quality: "strong" | "moderate" | "thin";
}

export interface CustomAiAlgorithmReport {
  modelName: string;
  modelVersion: string;
  generatedAt: string;
  readinessScore: number;
  readinessLabel: string;
  summary: string;
  features: AlgorithmFeature[];
  phases: AlgorithmPhase[];
  recommendations: string[];
  validationNotes: string[];
  notForClinicalUse: true;
}

interface AlgorithmStats {
  cycleCount: number;
  totalLogs: number;
  currentLogs: number;
  bbtDays: number;
  undisturbedBbtDays: number;
  disturbedBbtDays: number;
  mucusDays: number;
  lhPeakDays: number;
  averageCycleLength?: number;
  shiftDays: number[];
}

export function evaluateCustomAiAlgorithm(data: AppData): CustomAiAlgorithmReport | undefined {
  if (!data.profile?.aiInsightsOptIn) return undefined;

  const stats = collectStats(data.cycles);
  const readinessScore = readinessScoreFor(stats);
  const readinessLabel = readinessLabelFor(readinessScore, stats);
  const recommendations = recommendationsFor(stats);

  return {
    modelName: "Ila Custom AI Algorithm",
    modelVersion: "research-v0.1",
    generatedAt: new Date().toISOString(),
    readinessScore,
    readinessLabel,
    summary: summaryFor(stats, readinessLabel),
    features: featuresFor(stats),
    phases: phasesFor(stats),
    recommendations,
    validationNotes: [
      "Runs locally from logged cycle features and the FABM rules layer.",
      "Future training data must pass consent, licensing, bias, and clinical-review checks before use.",
      "No output is a diagnosis, pregnancy prediction, or contraceptive decision.",
    ],
    notForClinicalUse: true,
  };
}

function collectStats(cycles: Cycle[]): AlgorithmStats {
  const current = cycles[0];
  const totalLogs = cycles.reduce((sum, cycle) => sum + cycle.logs.length, 0);
  const allLogs = cycles.flatMap((cycle) => cycle.logs);
  const bbtLogs = allLogs.filter((log) => typeof log.bbt === "number");
  const lengths = cycles
    .map((cycle) => cycle.expectedPeriodDate ? daysBetween(cycle.startDate, cycle.expectedPeriodDate) : cycle.logs.length)
    .filter((length) => length > 0);
  const shiftDays = cycles
    .map((cycle) => inferTemperatureShiftDay(cycle))
    .filter((day): day is number => typeof day === "number");

  return {
    cycleCount: cycles.length,
    totalLogs,
    currentLogs: current?.logs.length ?? 0,
    bbtDays: bbtLogs.length,
    undisturbedBbtDays: bbtLogs.filter((log) => !log.bbtDisturbed).length,
    disturbedBbtDays: bbtLogs.filter((log) => log.bbtDisturbed).length,
    mucusDays: allLogs.filter((log) => log.cervicalFluid && log.cervicalFluid !== "none").length,
    lhPeakDays: allLogs.filter((log) => log.lhTest === "peak").length,
    averageCycleLength: lengths.length ? Math.round(lengths.reduce((sum, length) => sum + length, 0) / lengths.length) : undefined,
    shiftDays,
  };
}

function readinessScoreFor(stats: AlgorithmStats): number {
  const cycleScore = Math.min(stats.cycleCount / 6, 1) * 24;
  const logScore = Math.min(stats.totalLogs / 160, 1) * 22;
  const bbtScore = Math.min(stats.undisturbedBbtDays / 60, 1) * 22;
  const mucusScore = Math.min(stats.mucusDays / 36, 1) * 16;
  const lhScore = Math.min(stats.lhPeakDays / 4, 1) * 8;
  const shiftScore = Math.min(stats.shiftDays.length / 3, 1) * 8;
  return Math.round(cycleScore + logScore + bbtScore + mucusScore + lhScore + shiftScore);
}

function readinessLabelFor(score: number, stats: AlgorithmStats): string {
  if (stats.cycleCount < 1 || stats.totalLogs < 8) return "needs starter data";
  if (score >= 72) return "validation sandbox";
  if (score >= 42) return "training sandbox";
  return "data collection mode";
}

function summaryFor(stats: AlgorithmStats, readinessLabel: string): string {
  const average = stats.averageCycleLength ? `${stats.averageCycleLength}-day average cycle` : "cycle history still forming";
  const shifts = stats.shiftDays.length ? `temperature shifts around cycle day ${median(stats.shiftDays)}` : "temperature shift still being learned";
  return `${readinessLabel}: ${stats.cycleCount} cycle${stats.cycleCount === 1 ? "" : "s"}, ${average}, and ${shifts}.`;
}

function featuresFor(stats: AlgorithmStats): AlgorithmFeature[] {
  const bbtCoverage = stats.totalLogs ? Math.round((stats.undisturbedBbtDays / stats.totalLogs) * 100) : 0;
  const disturbedRate = stats.bbtDays ? Math.round((stats.disturbedBbtDays / stats.bbtDays) * 100) : 0;

  return [
    {
      id: "cycles",
      label: "Cycle history",
      value: `${stats.cycleCount} cycle${stats.cycleCount === 1 ? "" : "s"}`,
      detail: stats.averageCycleLength ? `Average length: ${stats.averageCycleLength} days.` : "Add or import prior cycles to strengthen history.",
      quality: stats.cycleCount >= 3 ? "strong" : stats.cycleCount >= 2 ? "moderate" : "thin",
    },
    {
      id: "bbt",
      label: "BBT coverage",
      value: `${bbtCoverage}%`,
      detail: `${stats.undisturbedBbtDays} undisturbed readings; ${disturbedRate}% marked disturbed.`,
      quality: bbtCoverage >= 55 ? "strong" : bbtCoverage >= 25 ? "moderate" : "thin",
    },
    {
      id: "mucus",
      label: "Mucus observations",
      value: `${stats.mucusDays} days`,
      detail: "Used as a supervised feature for fertile-sign pattern learning.",
      quality: stats.mucusDays >= 12 ? "strong" : stats.mucusDays >= 4 ? "moderate" : "thin",
    },
    {
      id: "lh",
      label: "LH peaks",
      value: `${stats.lhPeakDays}`,
      detail: "Optional cross-check signal for future symptohormonal models.",
      quality: stats.lhPeakDays >= 2 ? "strong" : stats.lhPeakDays === 1 ? "moderate" : "thin",
    },
    {
      id: "shift",
      label: "Shift examples",
      value: `${stats.shiftDays.length}`,
      detail: stats.shiftDays.length ? `Median observed shift: cycle day ${median(stats.shiftDays)}.` : "Needs more BBT history before validation.",
      quality: stats.shiftDays.length >= 3 ? "strong" : stats.shiftDays.length >= 1 ? "moderate" : "thin",
    },
  ];
}

function phasesFor(stats: AlgorithmStats): AlgorithmPhase[] {
  return [
    {
      id: "consent",
      title: "Consent + local feature extraction",
      status: "ready",
      metric: `${stats.totalLogs} logged day${stats.totalLogs === 1 ? "" : "s"}`,
      body: "The research layer only runs after AI insights are enabled, and it reads local logs first.",
    },
    {
      id: "baseline",
      title: "Rules baseline",
      status: stats.currentLogs >= 8 ? "ready" : "needs_data",
      metric: stats.currentLogs >= 8 ? "baseline available" : "log more daily rows",
      body: "FABM rule outputs become transparent labels and comparison targets for the future model.",
    },
    {
      id: "training",
      title: "Training sandbox",
      status: stats.totalLogs >= 28 ? "ready" : "needs_data",
      metric: stats.totalLogs >= 28 ? "local sample ready" : "needs a complete sample cycle",
      body: "Future supervised training can learn from consented logs, imported history, and approved public datasets.",
    },
    {
      id: "validation",
      title: "Validation holdout",
      status: stats.cycleCount >= 3 && stats.shiftDays.length >= 2 ? "ready" : "needs_data",
      metric: stats.cycleCount >= 3 ? `${stats.cycleCount} cycles` : "needs 3+ cycles",
      body: "Validation must be separated from training so the algorithm cannot grade its own homework.",
    },
    {
      id: "testing",
      title: "Locked test set + clinical review",
      status: "planned",
      metric: "not started",
      body: "A future locked test set, educator review, and medical-device pathway are required before clinical claims.",
    },
  ];
}

function recommendationsFor(stats: AlgorithmStats): string[] {
  const recommendations: string[] = [];
  if (stats.cycleCount < 3) recommendations.push("Import or log at least three cycles before treating validation metrics as meaningful.");
  if (stats.undisturbedBbtDays < 20) recommendations.push("Add more undisturbed BBT readings to strengthen temperature-shift learning.");
  if (stats.mucusDays < 8) recommendations.push("Log mucus or sensation daily so the model can compare temperature and cervical-fluid signals.");
  if (stats.lhPeakDays === 0) recommendations.push("Optional: add LH tests around the fertile-sign window for symptohormonal model research.");
  recommendations.push("Keep research outputs separate from clinical, pregnancy, and contraceptive guidance until validation is complete.");
  return recommendations;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
