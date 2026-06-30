// ============================================================
// DISPATCHER — routes a method id to its engine
// ============================================================
import type { DayObservation, CycleHistoryEntry, AlgorithmResult } from "./types.ts";
import { getMethod } from "./registry.ts";
import {
  symptothermalDoubleCheck,
  symptothermalSingleCheck,
  cervicalMucusOnly,
  symptohormonal,
  calculothermal,
  calendarOnly,
} from "./engines.ts";

export function runMethod(
  methodId: string,
  days: DayObservation[],
  history: CycleHistoryEntry[] = []
): AlgorithmResult {
  const method = getMethod(methodId);
  if (!method) {
    return { status: "insufficient_data", warnings: [`Unknown method id: ${methodId}`], trace: [] };
  }

  switch (method.fabmType) {
    case "symptothermal_double_check":
      return symptothermalDoubleCheck(days, history, method.engineConfig as any);
    case "symptothermal_single_check":
      return symptothermalSingleCheck(days, method.engineConfig as any);
    case "cervical_mucus_only":
      return cervicalMucusOnly(days, method.engineConfig as any);
    case "symptohormonal":
      return symptohormonal(days, method.engineConfig as any);
    case "calculothermal":
      return calculothermal(days, history, method.engineConfig as any);
    case "calendar_only":
      return calendarOnly(days.length, history);
    default:
      return { status: "insufficient_data", warnings: ["Engine not implemented for this type."], trace: [] };
  }
}
