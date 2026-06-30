import assert from "node:assert/strict";
import test from "node:test";
import type { AppData, Cycle, DayLog, UserProfile } from "../src/lib/models.ts";
import { interpretCurrentCycle } from "../src/lib/fertilityInterpretation.ts";
import { createProfile } from "../src/lib/sampleData.ts";

test("avoid-pregnancy mode is learning-only and never a safe-day recommendation", () => {
  const profile = createProfile({
    age: 31,
    lifeStage: "cycling",
    goals: ["avoid_pregnancy_education"],
    tools: ["manual_bbt", "cervical_mucus"],
    methodPreference: "symptothermal",
    selectedMethodId: "sensiplan",
  });
  const data = appData(profile, textbookCycle());
  const result = interpretCurrentCycle(data);

  assert.equal(result.notForContraceptiveUse, true);
  assert.match(result.trackingStatus, /Not a safe-day recommendation|Fertile signs|learning/i);
  assert.ok(result.educationWarnings.some((warning) => warning.includes("not a contraceptive medical device")));
});

test("wrapper reports low confidence for sparse data", () => {
  const profile = createProfile({
    lifeStage: "cycling",
    goals: ["track_cycle"],
    tools: ["manual_bbt"],
    methodPreference: "temperature_calendar",
    selectedMethodId: "natural_cycles",
  });
  const cycle = textbookCycle();
  cycle.logs = cycle.logs.slice(0, 2);
  const result = interpretCurrentCycle(appData(profile, cycle));

  assert.equal(result.confidence, "low");
  assert.equal(result.notForContraceptiveUse, true);
});

test("symptohormonal method recognizes LH peak plus three as a learning marker", () => {
  const profile = createProfile({
    lifeStage: "cycling",
    goals: ["plan_pregnancy"],
    tools: ["lh_tests"],
    methodPreference: "symptohormonal",
    selectedMethodId: "marquette",
  });
  const cycle = textbookCycle();
  cycle.logs = cycle.logs.map((log) => ({
    ...log,
    lhTest: log.cycleDay === 12 ? "high" : log.cycleDay === 13 ? "peak" : "negative",
  }));
  const result = interpretCurrentCycle(appData(profile, cycle));

  assert.equal(result.rawStatus, "post_ovulatory_infertile");
  assert.ok(result.chartAnnotations.some((annotation) => annotation.label.includes("Learning close")));
});

function appData(profile: UserProfile, cycle: Cycle): AppData {
  return {
    version: 1,
    profile,
    cycles: [cycle],
    reminders: [],
    imports: [],
    insights: [],
    updatedAt: new Date().toISOString(),
  };
}

function textbookCycle(): Cycle {
  const logs: DayLog[] = [
    log(1, "2026-01-01", "heavy", "none", "dry", 36.2),
    log(2, "2026-01-02", "medium", "none", "dry", 36.22),
    log(3, "2026-01-03", "light", "none", "dry", 36.21),
    log(4, "2026-01-04", "none", "none", "dry", 36.19),
    log(5, "2026-01-05", "none", "none", "dry", 36.2),
    log(6, "2026-01-06", "none", "sticky", "dry", 36.21),
    log(7, "2026-01-07", "none", "creamy", "moist", 36.22),
    log(8, "2026-01-08", "none", "watery", "wet", 36.2),
    log(9, "2026-01-09", "none", "eggwhite", "slippery", 36.19),
    log(10, "2026-01-10", "none", "creamy", "moist", 36.23),
    log(11, "2026-01-11", "none", "sticky", "dry", 36.25),
    log(12, "2026-01-12", "none", "none", "dry", 36.24),
    log(13, "2026-01-13", "none", "none", "dry", 36.58),
    log(14, "2026-01-14", "none", "none", "dry", 36.61),
    log(15, "2026-01-15", "none", "none", "dry", 36.69),
    log(16, "2026-01-16", "none", "none", "dry", 36.7),
  ];
  return { id: "cycle_test", startDate: "2026-01-01", expectedPeriodDate: "2026-01-29", logs };
}

function log(
  cycleDay: number,
  date: string,
  bleeding: DayLog["bleeding"],
  cervicalFluid: DayLog["cervicalFluid"],
  sensation: DayLog["sensation"],
  bbt: number,
): DayLog {
  return {
    id: `log_${cycleDay}`,
    date,
    cycleDay,
    bleeding,
    cervicalFluid,
    sensation,
    bbt,
    bbtDisturbed: false,
    symptoms: [],
    intimacy: "none",
  };
}
