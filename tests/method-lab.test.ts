import assert from "node:assert/strict";
import test from "node:test";
import { runMethod } from "../src/lib/fabm-engine/dispatcher.ts";
import type { CycleHistoryEntry, DayObservation } from "../src/lib/fabm-engine/types.ts";

const history: CycleHistoryEntry[] = [
  { cycleLength: 28, temperatureShiftDay: 16 },
  { cycleLength: 29, temperatureShiftDay: 17 },
  { cycleLength: 27, temperatureShiftDay: 15 },
];

test("method lab scenario shows double-check and mucus-only methods diverge on day 12", () => {
  const day12 = textbookCycle().slice(0, 12);
  const sensiplan = runMethod("sensiplan", day12, history);
  const billings = runMethod("billings", day12, history);

  assert.notEqual(sensiplan.status, billings.status);
  assert.equal(sensiplan.status, "potentially_fertile");
  assert.equal(billings.status, "post_ovulatory_infertile");
});

function textbookCycle(): DayObservation[] {
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
  ];
}
