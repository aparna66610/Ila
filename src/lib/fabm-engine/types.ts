// ============================================================
// FABM ALGORITHM ENGINE — Core Types
// ============================================================
// Source of truth for method taxonomy: r/FAMnNFP wiki + community
// "Types of FABMs" doc. 5 types, Symptothermal split into
// Single-check / Double-check by HOW THE WINDOW OPENS:
//   Single-check  -> opens on mucus only
//   Double-check  -> opens on mucus OR a calendar calculation
//                    (past cycle lengths / temp shift dates)
// Both single- and double-check CLOSE the same way:
//   mucus drying up AND BBT shift confirmed.
// ============================================================

export type CervicalFluid = "none" | "sticky" | "creamy" | "watery" | "eggwhite";
export type Sensation = "dry" | "moist" | "wet" | "slippery";
export type BleedingLevel = "none" | "spotting" | "light" | "medium" | "heavy";
export type LhTestResult = "negative" | "low" | "high" | "peak";

export interface DayObservation {
  day: number;                  // 1-indexed cycle day
  bleeding: BleedingLevel;
  cervicalFluid?: CervicalFluid;
  sensation?: Sensation;
  bbt?: number;                 // Celsius
  bbtDisturbed?: boolean;       // illness/alcohol/poor sleep flag
  lhTest?: LhTestResult;
  cervixFirm?: boolean;         // optional cervix-position sign
}

export interface CycleHistoryEntry {
  cycleLength: number;
  temperatureShiftDay?: number; // for Döring calendar calc across past cycles
}

export type FabmType =
  | "symptothermal_double_check"
  | "symptothermal_single_check"
  | "cervical_mucus_only"
  | "symptohormonal"
  | "calculothermal"
  | "calendar_only";

export type FertilityStatus =
  | "pre_ovulatory_infertile"
  | "potentially_fertile"
  | "peak_fertile"
  | "post_ovulatory_infertile"
  | "method_not_applicable"
  | "insufficient_data";

export interface AlgorithmResult {
  status: FertilityStatus;
  fertileWindowOpenDay?: number;
  fertileWindowOpenReason?: "mucus" | "calendar_calc" | "both";
  fertileWindowCloseDay?: number;
  mucusPeakDay?: number;
  temperatureShiftDay?: number;
  warnings: string[];
  trace: string[];              // step-by-step algorithm reasoning, for audit/debug
}

// Every method, regardless of organisation, maps to exactly one of
// these 6 type-level configs. Org-specific differences (language,
// instructor cert, religious framing) never change the math.
export interface MethodTypeConfig {
  fabmType: FabmType;
  opensOn: "mucus_only" | "mucus_or_calendar";
  closesOn: "mucus_and_bbt" | "bbt_only" | "lh_peak_plus3" | "calendar_window";
  usesBBT: boolean;
  usesMucus: boolean;
  usesLH: boolean;
  usesCalendarCalc: boolean;
}

export const FABM_TYPE_CONFIGS: Record<FabmType, MethodTypeConfig> = {
  symptothermal_double_check: {
    fabmType: "symptothermal_double_check",
    opensOn: "mucus_or_calendar",
    closesOn: "mucus_and_bbt",
    usesBBT: true, usesMucus: true, usesLH: false, usesCalendarCalc: true,
  },
  symptothermal_single_check: {
    fabmType: "symptothermal_single_check",
    opensOn: "mucus_only",
    closesOn: "mucus_and_bbt",
    usesBBT: true, usesMucus: true, usesLH: false, usesCalendarCalc: false,
  },
  cervical_mucus_only: {
    fabmType: "cervical_mucus_only",
    opensOn: "mucus_only",
    closesOn: "mucus_and_bbt",        // mucus-only still "closes" via peak+3 rule
    usesBBT: false, usesMucus: true, usesLH: false, usesCalendarCalc: false,
  },
  symptohormonal: {
    fabmType: "symptohormonal",
    opensOn: "mucus_or_calendar",
    closesOn: "lh_peak_plus3",
    usesBBT: false, usesMucus: true, usesLH: true, usesCalendarCalc: false,
  },
  calculothermal: {
    fabmType: "calculothermal",
    opensOn: "mucus_or_calendar",
    closesOn: "bbt_only",
    usesBBT: true, usesMucus: false, usesLH: false, usesCalendarCalc: true,
  },
  calendar_only: {
    fabmType: "calendar_only",
    opensOn: "mucus_or_calendar",
    closesOn: "calendar_window",
    usesBBT: false, usesMucus: false, usesLH: false, usesCalendarCalc: true,
  },
};
