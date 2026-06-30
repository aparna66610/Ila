"use client";

import { evaluateCustomAiAlgorithm } from "@/lib/customAiAlgorithm";
import { downloadText } from "@/lib/importExport";
import { generateInsights } from "@/lib/insights";
import type { AppData } from "@/lib/models";

export function AiResearchLab({ data, onChange }: { data: AppData; onChange: (data: AppData) => Promise<void> }) {
  const profile = data.profile;
  if (!profile) return null;

  const report = evaluateCustomAiAlgorithm(data);

  async function enableAiResearch() {
    const currentProfile = data.profile;
    if (!currentProfile) return;
    const next: AppData = { ...data, profile: { ...currentProfile, aiInsightsOptIn: true } };
    await onChange({ ...next, insights: generateInsights(next) });
  }

  async function runLocalPass() {
    const next = { ...data, insights: generateInsights(data) };
    await onChange(next);
  }

  if (!profile.aiInsightsOptIn || !report) {
    return (
      <section className="panel ai-lab ai-consent-panel">
        <div className="ai-hero-copy">
          <p className="eyebrow">AI Lab</p>
          <h2>Turn on local AI research mode</h2>
          <p>
            Enable non-diagnostic summaries and the Ila Custom AI Algorithm research layer. It reads only your logged data on this device and stays separate from clinical or contraception guidance.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={enableAiResearch}>Enable AI Lab</button>
      </section>
    );
  }

  return (
    <section className="panel ai-lab">
      <div className="ai-hero">
        <div className="ai-hero-copy">
          <p className="eyebrow">AI Lab</p>
          <h2>{report.modelName}</h2>
          <p>{report.summary}</p>
        </div>
        <div className="ai-score-card">
          <span>Research readiness</span>
          <strong>{report.readinessScore}%</strong>
          <small>{report.readinessLabel}</small>
        </div>
      </div>

      <div className="button-row wrap">
        <button type="button" className="primary-button" onClick={runLocalPass}>Run local research pass</button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => downloadText("ila-ai-research-report.json", JSON.stringify(report, null, 2), "application/json")}
        >
          Export AI report
        </button>
      </div>

      <p className="lab-callout quiet">
        This is your custom algorithm track: training, validation, and testing are visible by design. The current version is a transparent research model, not a medical device.
      </p>

      <div className="ai-grid">
        {report.features.map((feature) => (
          <article key={feature.id} className={`ai-feature ${feature.quality}`}>
            <span>{feature.label}</span>
            <strong>{feature.value}</strong>
            <p>{feature.detail}</p>
          </article>
        ))}
      </div>

      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">Algorithm pipeline</p>
          <h2>Train, validate, test</h2>
        </div>
      </div>

      <div className="pipeline-list">
        {report.phases.map((phase, index) => (
          <article key={phase.id} className={`pipeline-step ${phase.status}`}>
            <div className="pipeline-index">{index + 1}</div>
            <div>
              <div className="pipeline-heading">
                <strong>{phase.title}</strong>
                <span>{phase.status.replace("_", " ")}</span>
              </div>
              <p>{phase.body}</p>
              <small>{phase.metric}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="ai-split">
        <article className="ai-note-card">
          <strong>Next model moves</strong>
          {report.recommendations.map((recommendation) => <p key={recommendation}>{recommendation}</p>)}
        </article>
        <article className="ai-note-card">
          <strong>Validation guardrails</strong>
          {report.validationNotes.map((note) => <p key={note}>{note}</p>)}
        </article>
      </div>
    </section>
  );
}
