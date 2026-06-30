import type {
  BleedingLevel,
  CervicalFluid,
  LhTestResult,
  Sensation,
} from "./fabm-engine/types.ts";

export type Goal =
  | "track_cycle"
  | "plan_pregnancy"
  | "avoid_pregnancy_education"
  | "perimenopause_tracking"
  | "post_menopause_wellness";

export type LifeStage =
  | "cycling"
  | "postpartum"
  | "perimenopause"
  | "post_menopause"
  | "unsure";

export type TrackingTool =
  | "manual_bbt"
  | "apple_watch"
  | "oura"
  | "lh_tests"
  | "cervical_mucus"
  | "cervix"
  | "calendar_history";

export type MethodPreference =
  | "pick_for_me"
  | "symptothermal"
  | "mucus_only"
  | "symptohormonal"
  | "temperature_calendar"
  | "calendar_only"
  | "none";

export type CervixPosition = "low" | "mid" | "high";
export type CervixTexture = "firm" | "medium" | "soft";
export type MoodLevel = "steady" | "sensitive" | "low" | "energized";
export type IntimacyMarker = "protected" | "unprotected" | "withdrawal" | "none";
export type ReminderKind =
  | "period_incoming"
  | "bbt_logging"
  | "lh_testing"
  | "breast_check"
  | "medication"
  | "custom";

export interface UserProfile {
  id: string;
  age?: number;
  lifeStage: LifeStage;
  goals: Goal[];
  tools: TrackingTool[];
  methodPreference: MethodPreference;
  selectedMethodId?: string;
  aiInsightsOptIn: boolean;
  isDemo?: boolean;
  privacyMode: "local_encrypted";
  onboardedAt: string;
}

export interface DayLog {
  id: string;
  date: string;
  cycleDay: number;
  bleeding: BleedingLevel;
  cervicalFluid?: CervicalFluid;
  sensation?: Sensation;
  bbt?: number;
  bbtDisturbed?: boolean;
  lhTest?: LhTestResult;
  cervixPosition?: CervixPosition;
  cervixTexture?: CervixTexture;
  intimacy?: IntimacyMarker;
  symptoms: string[];
  mood?: MoodLevel;
  notes?: string;
}

export interface Cycle {
  id: string;
  startDate: string;
  expectedPeriodDate?: string;
  logs: DayLog[];
}

export interface Reminder {
  id: string;
  kind: ReminderKind;
  title: string;
  message: string;
  date: string;
  time: string;
  repeats: "none" | "daily" | "weekly" | "monthly" | "cycle";
  enabled: boolean;
}

export interface ImportBatch {
  id: string;
  source: "app_json" | "csv" | "apple_health" | "flo" | "natural_cycles" | "oura";
  importedAt: string;
  status: "imported" | "placeholder" | "failed";
  summary: string;
}

export interface Insight {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  category: "cycle_pattern" | "logging" | "wellness" | "education";
}

export interface AppData {
  version: 1;
  profile?: UserProfile;
  cycles: Cycle[];
  reminders: Reminder[];
  imports: ImportBatch[];
  insights: Insight[];
  updatedAt: string;
}

export interface MethodCard {
  id: MethodPreference;
  methodId: string;
  title: string;
  subtitle: string;
  bestFor: string;
  requirements: TrackingTool[];
  caution: string;
}

export const GOAL_LABELS: Record<Goal, string> = {
  track_cycle: "Track and understand my cycle",
  plan_pregnancy: "Plan pregnancy",
  avoid_pregnancy_education: "Avoid pregnancy education",
  perimenopause_tracking: "Perimenopause tracking",
  post_menopause_wellness: "Post-menopause wellness",
};

export const TOOL_LABELS: Record<TrackingTool, string> = {
  manual_bbt: "Thermometer / manual BBT",
  apple_watch: "Apple Watch",
  oura: "Oura Ring",
  lh_tests: "LH tests",
  cervical_mucus: "Cervical mucus",
  cervix: "Cervix signs",
  calendar_history: "Past cycle history",
};

export const EMPTY_APP_DATA: AppData = {
  version: 1,
  cycles: [],
  reminders: [],
  imports: [],
  insights: [],
  updatedAt: new Date(0).toISOString(),
};
