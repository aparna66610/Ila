"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { MethodReplayLab } from "@/components/MethodReplayLab";
import { SmoothCycleChart } from "@/components/SmoothCycleChart";
import { buildReminderIcs } from "@/lib/calendarExport";
import { addDays, daysBetween, formatShortDate, monthGrid, todayIso, uid } from "@/lib/date";
import { interpretCurrentCycle } from "@/lib/fertilityInterpretation";
import { generateInsights } from "@/lib/insights";
import { buildJsonExport, csvTemplate, cycleToCsv, downloadText, parseAppJson, parseCycleCsv } from "@/lib/importExport";
import { METHOD_CARDS, methodCardsForProfile, methodIdFromPreference, recommendMethod } from "@/lib/methodPicker";
import type { AppData, Cycle, DayLog, Goal, LifeStage, MethodPreference, Reminder, TrackingTool } from "@/lib/models";
import { EMPTY_APP_DATA, GOAL_LABELS, TOOL_LABELS } from "@/lib/models";
import { createDemoAppData, createProfile, createStarterAppData } from "@/lib/sampleData";
import { clearEncryptedAppData, loadEncryptedAppData, saveEncryptedAppData } from "@/lib/storage";

const goals: Goal[] = ["track_cycle", "plan_pregnancy", "avoid_pregnancy_education", "perimenopause_tracking", "post_menopause_wellness"];
const tools: TrackingTool[] = ["manual_bbt", "apple_watch", "oura", "lh_tests", "cervical_mucus", "cervix", "calendar_history"];
const lifeStages: { value: LifeStage; label: string }[] = [
  { value: "cycling", label: "Cycling" },
  { value: "postpartum", label: "Postpartum" },
  { value: "perimenopause", label: "Perimenopause" },
  { value: "post_menopause", label: "Post-menopause" },
  { value: "unsure", label: "Unsure" },
];

export default function Home() {
  const [data, setData] = useState<AppData>({ ...EMPTY_APP_DATA, updatedAt: new Date().toISOString() });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"today" | "calendar" | "chart" | "methodLab" | "reminders" | "learn" | "settings">("today");

  useEffect(() => {
    loadEncryptedAppData()
      .then((loaded) => setData(loaded))
      .finally(() => setLoading(false));
  }, []);

  async function persist(next: AppData) {
    const withTime = { ...next, updatedAt: new Date().toISOString() };
    setData(withTime);
    await saveEncryptedAppData(withTime);
  }

  if (loading) {
    return <main className="center-screen">Loading your private workspace...</main>;
  }

  if (!data.profile) {
    return <Onboarding onComplete={persist} />;
  }

  const currentCycle = data.cycles[0];
  const interpretation = interpretCurrentCycle(data);
  const localInsights = data.profile.aiInsightsOptIn ? generateInsights(data) : [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private cycle companion</p>
          <h1>365 Feminine Control</h1>
        </div>
        <div className="topbar-pills">
          {data.profile.isDemo ? <div className="demo-pill">Demo mode</div> : null}
          <div className="privacy-pill">Encrypted on this device</div>
        </div>
      </header>

      <nav className="tabs" aria-label="App sections">
        {[
          ["today", "Today"],
          ["calendar", "Calendar"],
          ["chart", "Chart"],
          ["methodLab", "Method Lab"],
          ["reminders", "Alerts"],
          ["learn", "Learn"],
          ["settings", "Settings"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? "active" : ""} onClick={() => setTab(id as typeof tab)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "today" ? (
        <TodayView data={data} interpretation={interpretation} insights={localInsights} onChange={persist} onNavigate={setTab} />
      ) : null}
      {tab === "calendar" && currentCycle ? <CalendarView cycle={currentCycle} /> : null}
      {tab === "chart" && currentCycle ? <SmoothCycleChart cycle={currentCycle} interpretation={interpretation} /> : null}
      {tab === "methodLab" ? <MethodReplayLab /> : null}
      {tab === "reminders" ? <RemindersView data={data} onChange={persist} /> : null}
      {tab === "learn" ? <LearnView data={data} onChange={persist} /> : null}
      {tab === "settings" ? <SettingsView data={data} onChange={persist} /> : null}
    </main>
  );
}

function Onboarding({ onComplete }: { onComplete: (data: AppData) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [age, setAge] = useState(29);
  const [lifeStage, setLifeStage] = useState<LifeStage>("cycling");
  const [selectedGoals, setSelectedGoals] = useState<Goal[]>(["track_cycle"]);
  const [selectedTools, setSelectedTools] = useState<TrackingTool[]>(["manual_bbt", "cervical_mucus"]);
  const [methodPreference, setMethodPreference] = useState<MethodPreference>("pick_for_me");
  const [lastPeriodStart, setLastPeriodStart] = useState(addDays(todayIso(), -18));
  const previewProfile = createProfile({ age, lifeStage, goals: selectedGoals, tools: selectedTools, methodPreference });
  const recommended = recommendMethod(previewProfile);
  const cards = methodCardsForProfile(previewProfile);

  async function finish() {
    const selectedMethodId = methodPreference === "pick_for_me" ? recommended.methodId : methodIdFromPreference(methodPreference, previewProfile);
    const profile = createProfile({ age, lifeStage, goals: selectedGoals, tools: selectedTools, methodPreference, selectedMethodId });
    await onComplete(createStarterAppData(profile, lastPeriodStart));
  }

  async function launchDemo() {
    await onComplete(createDemoAppData());
  }

  return (
    <main className="onboarding">
      <section className="onboarding-panel">
        <div className="onboarding-hero">
          <div>
            <div className="brand-mark">365</div>
            <p className="eyebrow">Private cycle literacy</p>
            <h1>A softer place to understand your body</h1>
            <p className="subcopy">Track your cycle, learn fertility signs, plan ahead, and keep gentle reminders close by. Avoid-pregnancy mode is education-only in this demo and does not provide safe-day guidance.</p>
          </div>
          <aside className="demo-start-card">
            <p className="eyebrow">Working demo</p>
            <h2>Start with a warm guided tour</h2>
            <p>Loads sample cycle history, chart markers, alerts, AI summaries, exports, and the Method Lab.</p>
            <button type="button" className="primary-button" onClick={launchDemo}>Launch working demo</button>
          </aside>
        </div>

        <div className="progress"><span style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>

        {step === 0 ? (
          <div className="step-grid">
            <label className="field">
              Age
              <input type="number" min="10" max="90" value={age} onChange={(event) => setAge(Number(event.target.value))} />
            </label>
            <label className="field">
              Life stage
              <select value={lifeStage} onChange={(event) => setLifeStage(event.target.value as LifeStage)}>
                {lifeStages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
            <label className="field">
              Last period start
              <input type="date" value={lastPeriodStart} onChange={(event) => setLastPeriodStart(event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="choice-grid">
            <InfoTile title="Manual entry" body="Start now with daily logging and the smooth chart." active />
            <InfoTile title="JSON or CSV import" body="Import a 365 export or use the CSV template after setup." active />
            <InfoTile title="Natural Cycles / Flo" body="File mappers are planned next. Your data stays local." />
            <InfoTile title="Apple Health / Oura" body="Native connections are placeholders in this MVP." />
          </div>
        ) : null}

        {step === 2 ? (
          <CheckboxGrid
            title="What is your goal?"
            values={goals}
            labels={GOAL_LABELS}
            selected={selectedGoals}
            onToggle={(goal) => setSelectedGoals(toggle(selectedGoals, goal))}
          />
        ) : null}

        {step === 3 ? (
          <CheckboxGrid
            title="What tools do you have?"
            values={tools}
            labels={TOOL_LABELS}
            selected={selectedTools}
            onToggle={(tool) => setSelectedTools(toggle(selectedTools, tool))}
          />
        ) : null}

        {step === 4 ? (
          <div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Method education</p>
                <h2>Pick a learning path</h2>
              </div>
              <button type="button" className="secondary-button" onClick={() => setMethodPreference("pick_for_me")}>Pick for me now</button>
            </div>
            <div className="method-list">
              {cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className={methodPreference === card.id || (methodPreference === "pick_for_me" && card.id === recommended.id) ? "method-card selected" : "method-card"}
                  onClick={() => setMethodPreference(card.id)}
                >
                  <strong>{card.title}</strong>
                  <span>{card.subtitle}</span>
                  <small>{card.caution}</small>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="button-row spread">
          <button type="button" className="secondary-button" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Back</button>
          {step < 4 ? (
            <button type="button" className="primary-button" onClick={() => setStep(step + 1)}>Continue</button>
          ) : (
            <button type="button" className="primary-button" onClick={finish}>Open my app</button>
          )}
        </div>
      </section>
    </main>
  );
}

function TodayView({
  data,
  interpretation,
  insights,
  onChange,
  onNavigate,
}: {
  data: AppData;
  interpretation: ReturnType<typeof interpretCurrentCycle>;
  insights: ReturnType<typeof generateInsights>;
  onChange: (data: AppData) => Promise<void>;
  onNavigate: (tab: "today" | "calendar" | "chart" | "methodLab" | "reminders" | "learn" | "settings") => void;
}) {
  const cycle = data.cycles[0];
  const profile = data.profile;
  if (!cycle || !profile) return null;

  return (
    <div className="content-grid">
      {profile.isDemo ? <DemoGuide data={data} onNavigate={onNavigate} /> : null}
      <section className="panel status-panel">
        <p className="eyebrow">Current chart read</p>
        <h2>{interpretation.trackingStatus}</h2>
        <div className="stat-row">
          <span>Confidence: {interpretation.confidence}</span>
          <span>Method: {interpretation.methodId}</span>
        </div>
        {interpretation.notForContraceptiveUse ? <p className="warning">Learning mode only. Not a contraceptive medical device.</p> : null}
        <div className="warning-list">
          {interpretation.educationWarnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      </section>

      <DailyLogForm data={data} onChange={onChange} />

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AI insights</p>
            <h2>Optional summaries</h2>
          </div>
          <span className={profile.aiInsightsOptIn ? "status-dot on" : "status-dot"}>{profile.aiInsightsOptIn ? "On" : "Off"}</span>
        </div>
        {profile.aiInsightsOptIn ? (
          <div className="insight-list">
            {insights.map((insight) => (
              <article key={insight.id} className="insight">
                <strong>{insight.title}</strong>
                <p>{insight.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">AI summaries are off. You can enable local, non-diagnostic summaries in Settings.</p>
        )}
      </section>
    </div>
  );
}

function DailyLogForm({ data, onChange }: { data: AppData; onChange: (data: AppData) => Promise<void> }) {
  const cycle = data.cycles[0];
  const today = todayIso();
  const existing = cycle.logs.find((log) => log.date === today) ?? createBlankLogForDate(cycle, today);
  const [draft, setDraft] = useState<DayLog>(existing);

  useEffect(() => setDraft(existing), [existing?.id]);

  async function save() {
    const logs = cycle.logs.some((log) => log.id === draft.id)
      ? cycle.logs.map((log) => (log.id === draft.id ? draft : log))
      : [...cycle.logs, draft];
    const sortedLogs = logs.sort((a, b) => a.cycleDay - b.cycleDay);
    await onChange({ ...data, cycles: [{ ...cycle, logs: sortedLogs }, ...data.cycles.slice(1)] });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Daily log</p>
          <h2>{formatShortDate(draft.date)} - cycle day {draft.cycleDay}</h2>
        </div>
        <button type="button" className="primary-button" onClick={save}>Save log</button>
      </div>
      <div className="form-grid">
        <label className="field">Bleeding
          <select value={draft.bleeding} onChange={(event) => setDraft({ ...draft, bleeding: event.target.value as DayLog["bleeding"] })}>
            {["none", "spotting", "light", "medium", "heavy"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">BBT Celsius
          <input type="number" step="0.01" value={draft.bbt ?? ""} onChange={(event) => setDraft({ ...draft, bbt: event.target.value ? Number(event.target.value) : undefined })} />
        </label>
        <label className="checkline">
          <input type="checkbox" checked={Boolean(draft.bbtDisturbed)} onChange={(event) => setDraft({ ...draft, bbtDisturbed: event.target.checked })} />
          Disturbed temperature
        </label>
        <label className="field">Mucus
          <select value={draft.cervicalFluid ?? "none"} onChange={(event) => setDraft({ ...draft, cervicalFluid: event.target.value as DayLog["cervicalFluid"] })}>
            {["none", "sticky", "creamy", "watery", "eggwhite"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">Sensation
          <select value={draft.sensation ?? "dry"} onChange={(event) => setDraft({ ...draft, sensation: event.target.value as DayLog["sensation"] })}>
            {["dry", "moist", "wet", "slippery"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">LH test
          <select value={draft.lhTest ?? "negative"} onChange={(event) => setDraft({ ...draft, lhTest: event.target.value as DayLog["lhTest"] })}>
            {["negative", "low", "high", "peak"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">Mood
          <select value={draft.mood ?? "steady"} onChange={(event) => setDraft({ ...draft, mood: event.target.value as DayLog["mood"] })}>
            {["steady", "sensitive", "low", "energized"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">Intimacy
          <select value={draft.intimacy ?? "none"} onChange={(event) => setDraft({ ...draft, intimacy: event.target.value as DayLog["intimacy"] })}>
            {["none", "protected", "unprotected", "withdrawal"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field wide">Symptoms
          <input value={draft.symptoms.join(", ")} onChange={(event) => setDraft({ ...draft, symptoms: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
        </label>
        <label className="field wide">Notes
          <textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
      </div>
    </section>
  );
}

function CalendarView({ cycle }: { cycle: Cycle }) {
  const grid = monthGrid(todayIso());
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Prefilled calendar</p>
          <h2>Cycle reminders and logged signs</h2>
        </div>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <strong key={day}>{day}</strong>)}
        {grid.map((date) => {
          const log = cycle.logs.find((item) => item.date === date);
          const expected = cycle.expectedPeriodDate === date;
          return (
            <div key={date} className={log || expected ? "calendar-day marked" : "calendar-day"}>
              <span>{new Date(`${date}T12:00:00`).getDate()}</span>
              {log && log.bleeding !== "none" ? <small className="dot period">Period</small> : null}
              {log?.cervicalFluid === "watery" || log?.cervicalFluid === "eggwhite" ? <small className="dot fertile">Signs</small> : null}
              {expected ? <small className="dot expected">Expected</small> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RemindersView({ data, onChange }: { data: AppData; onChange: (data: AppData) => Promise<void> }) {
  const [custom, setCustom] = useState({ title: "", message: "", date: todayIso(), time: "09:00" });

  async function addReminder(kind: Reminder["kind"] = "custom") {
    const reminder: Reminder = {
      id: uid("reminder"),
      kind,
      title: custom.title || defaultReminderTitle(kind),
      message: custom.message || "Custom cycle and wellness reminder.",
      date: custom.date,
      time: custom.time,
      repeats: kind === "breast_check" ? "monthly" : "none",
      enabled: true,
    };
    await onChange({ ...data, reminders: [...data.reminders, reminder] });
    setCustom({ title: "", message: "", date: todayIso(), time: "09:00" });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Custom alerts</p>
          <h2>Reminders and calendar export</h2>
        </div>
        <button type="button" className="secondary-button" onClick={() => downloadText("365-reminders.ics", buildReminderIcs(data.reminders), "text/calendar")}>Export .ics</button>
      </div>
      <div className="quick-actions">
        {(["period_incoming", "bbt_logging", "lh_testing", "breast_check", "medication"] as Reminder["kind"][]).map((kind) => (
          <button key={kind} type="button" className="secondary-button" onClick={() => addReminder(kind)}>{defaultReminderTitle(kind)}</button>
        ))}
      </div>
      <div className="form-grid">
        <label className="field">Title<input value={custom.title} onChange={(event) => setCustom({ ...custom, title: event.target.value })} /></label>
        <label className="field">Date<input type="date" value={custom.date} onChange={(event) => setCustom({ ...custom, date: event.target.value })} /></label>
        <label className="field">Time<input type="time" value={custom.time} onChange={(event) => setCustom({ ...custom, time: event.target.value })} /></label>
        <label className="field wide">Message<input value={custom.message} onChange={(event) => setCustom({ ...custom, message: event.target.value })} /></label>
      </div>
      <button type="button" className="primary-button" onClick={() => addReminder("custom")}>Add custom reminder</button>
      <div className="reminder-list">
        {data.reminders.map((reminder) => (
          <article key={reminder.id} className="reminder-row">
            <div>
              <strong>{reminder.title}</strong>
              <p>{reminder.message}</p>
            </div>
            <span>{formatShortDate(reminder.date)} {reminder.time}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function LearnView({ data, onChange }: { data: AppData; onChange: (data: AppData) => Promise<void> }) {
  const profile = data.profile;
  if (!profile) return null;
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Learning section</p>
          <h2>Methods and tutor connections</h2>
        </div>
      </div>
      <p className="muted">Choose a learning method now and change it later. For avoid-pregnancy use, learn with a qualified instructor before relying on any FABM.</p>
      <div className="method-list">
        {METHOD_CARDS.map((card) => (
          <button
            type="button"
            key={card.id}
            className={profile.methodPreference === card.id ? "method-card selected" : "method-card"}
            onClick={() => {
              const selectedMethodId = methodIdFromPreference(card.id, profile);
              void onChange({ ...data, profile: { ...profile, methodPreference: card.id, selectedMethodId } });
            }}
          >
            <strong>{card.title}</strong>
            <span>{card.bestFor}</span>
            <small>{card.caution}</small>
          </button>
        ))}
      </div>
      <div className="tutor-grid">
        <InfoTile title="Sensiplan educators" body="Directory integration placeholder for double-check symptothermal instruction." active />
        <InfoTile title="Billings / Creighton" body="Directory integration placeholder for mucus-only instruction." active />
        <InfoTile title="Marquette / FEMM" body="Directory integration placeholder for symptohormonal instruction." active />
      </div>
    </section>
  );
}

function SettingsView({ data, onChange }: { data: AppData; onChange: (data: AppData) => Promise<void> }) {
  const profile = data.profile;
  const cycle = data.cycles[0];
  if (!profile) return null;

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      if (file.name.endsWith(".json")) {
        await onChange(parseAppJson(text));
      } else {
        const importedCycle = parseCycleCsv(text);
        await onChange({
          ...data,
          cycles: [importedCycle, ...data.cycles],
          imports: [...data.imports, { id: uid("import"), source: "csv", importedAt: new Date().toISOString(), status: "imported", summary: `${importedCycle.logs.length} daily rows imported.` }],
        });
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import failed.");
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Privacy, imports, and exports</h2>
        </div>
      </div>
      <div className="settings-grid">
        <article className="setting-block">
          <strong>Data storage</strong>
          <p>Your data is encrypted in this browser using Web Crypto and IndexedDB. Bring-your-own-cloud sync is planned after the MVP.</p>
          <button type="button" className="secondary-button" onClick={() => onChange(createDemoAppData())}>Reload demo data</button>
        </article>
        <article className="setting-block">
          <strong>AI insights</strong>
          <p>Opt-in summaries use only your logged data. No photo analysis, diagnosis, or contraception decisions.</p>
          <label className="switch">
            <input
              type="checkbox"
              checked={profile.aiInsightsOptIn}
              onChange={(event) => onChange({ ...data, profile: { ...profile, aiInsightsOptIn: event.target.checked }, insights: event.target.checked ? generateInsights({ ...data, profile: { ...profile, aiInsightsOptIn: true } }) : [] })}
            />
            Enable summaries
          </label>
        </article>
        <article className="setting-block">
          <strong>Imports</strong>
          <p>JSON and CSV work now. Apple Health, Oura, Flo, and Natural Cycles are mapped as next integrations.</p>
          <input type="file" accept=".json,.csv,text/csv,application/json" onChange={onFile} />
        </article>
        <article className="setting-block">
          <strong>Exports</strong>
          <div className="button-row wrap">
            <button type="button" className="secondary-button" onClick={() => downloadText("365-data-export.json", buildJsonExport(data), "application/json")}>App JSON</button>
            <button type="button" className="secondary-button" disabled={!cycle} onClick={() => cycle && downloadText("365-cycle.csv", cycleToCsv(cycle), "text/csv")}>Cycle CSV</button>
            <button type="button" className="secondary-button" onClick={() => downloadText("365-cycle-template.csv", csvTemplate(), "text/csv")}>CSV template</button>
          </div>
        </article>
      </div>
      <button
        type="button"
        className="danger-button"
        onClick={async () => {
          if (confirm("Delete all local data from this browser?")) {
            await clearEncryptedAppData();
            window.location.reload();
          }
        }}
      >
        Delete all local data
      </button>
    </section>
  );
}

function CheckboxGrid<T extends string>({ title, values, labels, selected, onToggle }: { title: string; values: T[]; labels: Record<T, string>; selected: T[]; onToggle: (value: T) => void }) {
  return (
    <div>
      <h2>{title}</h2>
      <div className="choice-grid">
        {values.map((value) => (
          <button key={value} type="button" className={selected.includes(value) ? "choice selected" : "choice"} onClick={() => onToggle(value)}>
            {labels[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoTile({ title, body, active = false }: { title: string; body: string; active?: boolean }) {
  return (
    <article className={active ? "info-tile active" : "info-tile"}>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}

function DemoGuide({
  data,
  onNavigate,
}: {
  data: AppData;
  onNavigate: (tab: "today" | "calendar" | "chart" | "methodLab" | "reminders" | "learn" | "settings") => void;
}) {
  const cycle = data.cycles[0];
  const loggedDays = cycle?.logs.length ?? 0;
  const bbtDays = cycle?.logs.filter((log) => log.bbt).length ?? 0;
  const reminders = data.reminders.filter((reminder) => reminder.enabled).length;

  return (
    <section className="panel demo-guide">
      <div>
        <p className="eyebrow">Demo script</p>
        <h2>This account is ready to click through</h2>
      </div>
      <div className="demo-metrics">
        <span><strong>{loggedDays}</strong> charted days</span>
        <span><strong>{bbtDays}</strong> BBT points</span>
        <span><strong>{reminders}</strong> active alerts</span>
      </div>
      <div className="demo-actions">
        <button type="button" className="primary-button" onClick={() => onNavigate("chart")}>View smooth chart</button>
        <button type="button" className="secondary-button" onClick={() => onNavigate("methodLab")}>Try Method Lab</button>
        <button type="button" className="secondary-button" onClick={() => onNavigate("reminders")}>Export alerts</button>
        <button type="button" className="secondary-button" onClick={() => onNavigate("settings")}>Export data</button>
      </div>
    </section>
  );
}

function createBlankLogForDate(cycle: Cycle, date: string): DayLog {
  const cycleDay = Math.max(1, daysBetween(cycle.startDate, date) + 1);
  return {
    id: uid("log"),
    date,
    cycleDay,
    bleeding: "none",
    cervicalFluid: "none",
    sensation: "dry",
    bbtDisturbed: false,
    intimacy: "none",
    symptoms: [],
    mood: "steady",
    notes: "",
  };
}

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((candidate) => candidate !== item) : [...items, item];
}

function defaultReminderTitle(kind: Reminder["kind"]): string {
  const titles: Record<Reminder["kind"], string> = {
    period_incoming: "Period incoming",
    bbt_logging: "Log BBT",
    lh_testing: "LH test",
    breast_check: "Breast check",
    medication: "Medication",
    custom: "Custom alert",
  };
  return titles[kind];
}
