import assert from "node:assert/strict";
import test from "node:test";
import { generateInsights } from "../src/lib/insights.ts";
import { createProfile, createStarterAppData } from "../src/lib/sampleData.ts";

test("insights are blocked until the user opts in", () => {
  const profile = createProfile({
    lifeStage: "cycling",
    goals: ["track_cycle"],
    tools: ["manual_bbt"],
    methodPreference: "temperature_calendar",
    aiInsightsOptIn: false,
  });
  assert.equal(generateInsights(createStarterAppData(profile)).length, 0);
});

test("opt-in insights are non-diagnostic summaries", () => {
  const profile = createProfile({
    lifeStage: "cycling",
    goals: ["track_cycle"],
    tools: ["manual_bbt"],
    methodPreference: "temperature_calendar",
    aiInsightsOptIn: true,
  });
  const insights = generateInsights(createStarterAppData(profile));
  assert.ok(insights.length >= 2);
  assert.ok(insights.every((insight) => !/diagnosis|contraception decision/i.test(insight.body)));
});
