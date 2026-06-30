# 365 Feminine Control MVP

A greenfield Next.js PWA for local-first cycle tracking, fertility awareness education, reminders, imports/exports, smooth charting, and opt-in non-diagnostic insights.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Live demo

This app can be deployed as a static GitHub Pages demo by building with `GITHUB_PAGES=true` and publishing the generated `out` folder to the `gh-pages` branch.

Expected URL:

`https://aparna66610.github.io/Ila/`

If the first deployment does not appear, open the GitHub repository settings, go to Pages, and set the source to deploy from the `gh-pages` branch.

## What is included

- Mobile-first onboarding for age, life stage, goals, available tools, and method education.
- Goals for tracking, planning pregnancy, avoid-pregnancy education, perimenopause tracking, and post-menopause wellness.
- FABM rules engine imported from `fabm-algorithm-engine.zip` and wrapped with app-safe learning copy.
- Encrypted local-first storage using IndexedDB plus Web Crypto.
- Manual daily logging for bleeding, BBT, mucus, sensation, LH tests, cervix context, intimacy, symptoms, mood, and notes.
- Smooth SVG cycle chart with temperature smoothing, coverline, mucus/LH/bleeding/intimacy rows, and PNG/PDF export.
- JSON/CSV import and export, CSV template, and `.ics` reminder export for Apple Calendar and Google Calendar.
- Opt-in AI-style summaries based only on locally logged data.

## Safety boundary

Avoid-pregnancy mode is education-only in this MVP. The app does not provide green/safe-day contraception recommendations and is not a contraceptive medical device.

## Verification

```bash
npm test
npm run typecheck
npm run build
```
