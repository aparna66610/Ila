import type { AppData, Cycle, DayLog, Goal, LifeStage, MethodPreference, Reminder, TrackingTool, UserProfile } from "./models.ts";
import { addDays, todayIso, uid } from "./date.ts";

export function createProfile(input: {
  age?: number;
  lifeStage: LifeStage;
  goals: Goal[];
  tools: TrackingTool[];
  methodPreference: MethodPreference;
  selectedMethodId?: string;
  aiInsightsOptIn?: boolean;
  isDemo?: boolean;
}): UserProfile {
  return {
    id: uid("profile"),
    age: input.age,
    lifeStage: input.lifeStage,
    goals: input.goals,
    tools: input.tools,
    methodPreference: input.methodPreference,
    selectedMethodId: input.selectedMethodId,
    aiInsightsOptIn: input.aiInsightsOptIn ?? false,
    isDemo: input.isDemo,
    privacyMode: "local_encrypted",
    onboardedAt: new Date().toISOString(),
  };
}

export function createStarterCycle(lastPeriodStart = addDays(todayIso(), -18)): Cycle {
  const logs: DayLog[] = Array.from({ length: 32 }, (_, index) => {
    const cycleDay = index + 1;
    const date = addDays(lastPeriodStart, index);
    const periodBleeding = cycleDay === 1 ? "heavy" : cycleDay === 2 ? "medium" : cycleDay <= 5 ? "light" : "none";
    const mucus =
      cycleDay >= 10 && cycleDay <= 11
        ? "creamy"
        : cycleDay >= 12 && cycleDay <= 14
          ? "watery"
          : cycleDay === 15
            ? "eggwhite"
            : cycleDay >= 16 && cycleDay <= 18
              ? "sticky"
              : "none";
    const bbt =
      cycleDay < 18
        ? 36.16 + Math.sin(cycleDay / 1.8) * 0.05
        : 36.48 + Math.sin(cycleDay / 2.4) * 0.07;

    return {
      id: uid("log"),
      date,
      cycleDay,
      bleeding: periodBleeding,
      cervicalFluid: mucus,
      sensation: cycleDay >= 12 && cycleDay <= 15 ? "wet" : cycleDay >= 16 && cycleDay <= 18 ? "moist" : "dry",
      bbt: Number(bbt.toFixed(2)),
      bbtDisturbed: false,
      lhTest: cycleDay === 15 ? "peak" : cycleDay === 14 ? "high" : undefined,
      cervixPosition: cycleDay >= 12 && cycleDay <= 16 ? "high" : "low",
      cervixTexture: cycleDay >= 12 && cycleDay <= 16 ? "soft" : "firm",
      intimacy: "none",
      symptoms: cycleDay <= 2 ? ["cramps"] : cycleDay === 24 ? ["breast tenderness"] : [],
      mood: cycleDay <= 2 ? "sensitive" : cycleDay >= 12 && cycleDay <= 16 ? "energized" : "steady",
      notes: "",
    };
  });

  return {
    id: uid("cycle"),
    startDate: lastPeriodStart,
    expectedPeriodDate: addDays(lastPeriodStart, 29),
    logs,
  };
}

export function createStarterReminders(anchor = todayIso()): Reminder[] {
  return [
    {
      id: uid("reminder"),
      kind: "period_incoming",
      title: "Period may be coming",
      message: "Your next period window may be approaching. Log any symptoms or spotting.",
      date: addDays(anchor, 9),
      time: "09:00",
      repeats: "cycle",
      enabled: true,
    },
    {
      id: uid("reminder"),
      kind: "breast_check",
      title: "Breast check",
      message: "A gentle monthly breast check reminder.",
      date: addDays(anchor, 14),
      time: "18:00",
      repeats: "monthly",
      enabled: true,
    },
  ];
}

export function createStarterAppData(profile: UserProfile, lastPeriodStart?: string): AppData {
  const cycle = createStarterCycle(lastPeriodStart);
  return {
    version: 1,
    profile,
    cycles: [cycle],
    reminders: createStarterReminders(todayIso()),
    imports: [],
    insights: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createDemoAppData(): AppData {
  const profile = createProfile({
    age: 32,
    lifeStage: "cycling",
    goals: ["track_cycle", "plan_pregnancy", "avoid_pregnancy_education"],
    tools: ["manual_bbt", "cervical_mucus", "lh_tests", "calendar_history"],
    methodPreference: "symptothermal",
    selectedMethodId: "sensiplan",
    aiInsightsOptIn: true,
    isDemo: true,
  });
  const current = createStarterCycle(addDays(todayIso(), -18));
  const previousOne = createStarterCycle(addDays(todayIso(), -48));
  const previousTwo = createStarterCycle(addDays(todayIso(), -77));
  const previousThree = createStarterCycle(addDays(todayIso(), -105));
  const reminders = [
    ...createStarterReminders(todayIso()),
    {
      id: uid("reminder"),
      kind: "lh_testing",
      title: "LH test window",
      message: "Demo reminder: start LH testing around the fertile-sign window.",
      date: addDays(todayIso(), 2),
      time: "10:00",
      repeats: "none",
      enabled: true,
    } satisfies Reminder,
    {
      id: uid("reminder"),
      kind: "bbt_logging",
      title: "Morning BBT",
      message: "Demo reminder: log temperature before getting up.",
      date: todayIso(),
      time: "07:00",
      repeats: "daily",
      enabled: true,
    } satisfies Reminder,
  ];

  return {
    version: 1,
    profile,
    cycles: [current, previousOne, previousTwo, previousThree],
    reminders,
    imports: [
      {
        id: uid("import"),
        source: "app_json",
        importedAt: new Date().toISOString(),
        status: "placeholder",
        summary: "Demo account seeded with sample cycle history, chart markers, and reminders.",
      },
    ],
    insights: [],
    updatedAt: new Date().toISOString(),
  };
}
