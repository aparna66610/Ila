import assert from "node:assert/strict";
import test from "node:test";
import { buildReminderIcs } from "../src/lib/calendarExport.ts";
import { buildJsonExport, csvTemplate, cycleToCsv, parseAppJson, parseCycleCsv } from "../src/lib/importExport.ts";
import type { AppData, Cycle, Reminder } from "../src/lib/models.ts";

test("app JSON export round trips", () => {
  const data: AppData = {
    version: 1,
    cycles: [cycle()],
    reminders: [],
    imports: [],
    insights: [],
    updatedAt: new Date().toISOString(),
  };
  const parsed = parseAppJson(buildJsonExport(data));
  assert.equal(parsed.version, 1);
  assert.equal(parsed.cycles[0].logs.length, 2);
});

test("cycle CSV export and import round trips daily rows", () => {
  const exported = cycleToCsv(cycle());
  const imported = parseCycleCsv(exported);
  assert.equal(imported.logs.length, 2);
  assert.equal(imported.logs[0].bleeding, "heavy");
  assert.equal(imported.logs[1].bbt, 36.22);
  assert.match(csvTemplate(), /date,cycleDay,bleeding/);
});

test("ICS export includes enabled reminders and recurrence", () => {
  const reminders: Reminder[] = [
    {
      id: "r1",
      kind: "breast_check",
      title: "Breast check",
      message: "Monthly reminder",
      date: "2026-02-01",
      time: "09:30",
      repeats: "monthly",
      enabled: true,
    },
    {
      id: "r2",
      kind: "custom",
      title: "Disabled",
      message: "Hidden",
      date: "2026-02-02",
      time: "09:30",
      repeats: "none",
      enabled: false,
    },
  ];
  const ics = buildReminderIcs(reminders);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Breast check/);
  assert.match(ics, /RRULE:FREQ=MONTHLY/);
  assert.doesNotMatch(ics, /Disabled/);
});

function cycle(): Cycle {
  return {
    id: "cycle_1",
    startDate: "2026-01-01",
    logs: [
      { id: "l1", date: "2026-01-01", cycleDay: 1, bleeding: "heavy", bbt: 36.2, symptoms: ["cramps"], notes: "one" },
      { id: "l2", date: "2026-01-02", cycleDay: 2, bleeding: "medium", bbt: 36.22, symptoms: [], notes: "two" },
    ],
  };
}
