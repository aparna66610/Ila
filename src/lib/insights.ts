import type { AppData, Insight } from "./models.ts";
import { daysBetween, uid } from "./date.ts";

export function generateInsights(data: AppData): Insight[] {
  if (!data.profile?.aiInsightsOptIn) return [];

  const insights: Insight[] = [];
  const now = new Date().toISOString();
  const cyclesWithLength = data.cycles
    .map((cycle) => cycle.expectedPeriodDate ? daysBetween(cycle.startDate, cycle.expectedPeriodDate) : cycle.logs.length)
    .filter((length) => length > 0);

  if (cyclesWithLength.length) {
    const average = Math.round(cyclesWithLength.reduce((sum, length) => sum + length, 0) / cyclesWithLength.length);
    insights.push({
      id: uid("insight"),
      createdAt: now,
      title: "Cycle length pattern",
      body: `Your logged cycle data averages about ${average} days. This is a pattern summary, not medical advice.`,
      category: "cycle_pattern",
    });
  }

  const current = data.cycles[0];
  if (current) {
    const disturbed = current.logs.filter((log) => log.bbtDisturbed).length;
    const tempDays = current.logs.filter((log) => log.bbt).length;
    if (tempDays && disturbed / tempDays > 0.25) {
      insights.push({
        id: uid("insight"),
        createdAt: now,
        title: "Temperature context",
        body: "Several temperature readings are marked disturbed. Keep those flags so chart interpretation stays honest.",
        category: "logging",
      });
    }

    const symptomCounts = new Map<string, number>();
    current.logs.flatMap((log) => log.symptoms).forEach((symptom) => symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1));
    const topSymptom = [...symptomCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topSymptom) {
      insights.push({
        id: uid("insight"),
        createdAt: now,
        title: "Recurring note",
        body: `${topSymptom[0]} appears ${topSymptom[1]} time${topSymptom[1] === 1 ? "" : "s"} in this cycle. You can bring repeated patterns to a clinician or educator.`,
        category: "wellness",
      });
    }
  }

  insights.push({
    id: uid("insight"),
    createdAt: now,
    title: "Learning mode",
    body: "AI summaries are based only on data you logged locally. They do not analyze photos or provide clinical or birth-control guidance.",
    category: "education",
  });

  return insights;
}
