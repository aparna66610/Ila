import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCustomAiAlgorithm } from "../src/lib/customAiAlgorithm.ts";
import { createDemoAppData, createProfile, createStarterAppData } from "../src/lib/sampleData.ts";

test("custom AI algorithm is gated behind AI consent", () => {
  const profile = createProfile({
    lifeStage: "cycling",
    goals: ["track_cycle"],
    tools: ["manual_bbt", "cervical_mucus"],
    methodPreference: "symptothermal",
    aiInsightsOptIn: false,
  });

  assert.equal(evaluateCustomAiAlgorithm(createStarterAppData(profile)), undefined);
});

test("custom AI algorithm exposes training validation and testing phases", () => {
  const report = evaluateCustomAiAlgorithm(createDemoAppData());

  assert.ok(report);
  assert.equal(report.modelName, "Ila Custom AI Algorithm");
  assert.equal(report.notForClinicalUse, true);
  assert.ok(report.readinessScore > 0);
  assert.ok(report.features.length >= 4);
  assert.ok(report.phases.some((phase) => phase.title.toLowerCase().includes("training")));
  assert.ok(report.phases.some((phase) => phase.title.toLowerCase().includes("validation")));
  assert.ok(report.phases.some((phase) => phase.title.toLowerCase().includes("test")));
  assert.match(report.validationNotes.join(" "), /No output is a diagnosis/);
  assert.ok(!/safe day|safe for unprotected|contraception decision/i.test(JSON.stringify(report)));
});
