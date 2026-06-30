import assert from "node:assert/strict";
import test from "node:test";
import { todayIso } from "../src/lib/date.ts";
import { interpretCurrentCycle } from "../src/lib/fertilityInterpretation.ts";
import { generateInsights } from "../src/lib/insights.ts";
import { createDemoAppData } from "../src/lib/sampleData.ts";

test("demo data opens directly into a populated, interpretable app state", () => {
  const data = createDemoAppData();
  const currentCycle = data.cycles[0];

  assert.equal(data.profile?.isDemo, true);
  assert.equal(data.profile?.aiInsightsOptIn, true);
  assert.ok(currentCycle.logs.length >= 30);
  assert.ok(currentCycle.logs.some((log) => log.date === todayIso()));
  assert.ok(data.cycles.length >= 3);
  assert.ok(data.reminders.some((reminder) => reminder.kind === "bbt_logging"));
  assert.notEqual(interpretCurrentCycle(data).rawStatus, "insufficient_data");
  assert.ok(generateInsights(data).length > 0);
});
