import type { AppData, Cycle, DayLog } from "./models.ts";
import { EMPTY_APP_DATA } from "./models.ts";
import { uid } from "./date.ts";

const CSV_HEADERS = [
  "date",
  "cycleDay",
  "bleeding",
  "bbt",
  "bbtDisturbed",
  "cervicalFluid",
  "sensation",
  "lhTest",
  "symptoms",
  "notes",
];

export function buildJsonExport(data: AppData): string {
  return JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2);
}

export function parseAppJson(text: string): AppData {
  const parsed = JSON.parse(text) as Partial<AppData>;
  if (parsed.version !== 1 || !Array.isArray(parsed.cycles)) {
    throw new Error("This file does not look like a 365 Feminine Control export.");
  }
  return {
    ...EMPTY_APP_DATA,
    ...parsed,
    reminders: parsed.reminders ?? [],
    imports: parsed.imports ?? [],
    insights: parsed.insights ?? [],
    updatedAt: new Date().toISOString(),
  };
}

export function csvTemplate(): string {
  return `${CSV_HEADERS.join(",")}\n2026-01-27,1,heavy,36.45,false,none,dry,negative,cramps;fatigue,Example note`;
}

export function cycleToCsv(cycle: Cycle): string {
  const rows = cycle.logs.map((log) =>
    [
      log.date,
      log.cycleDay,
      log.bleeding,
      log.bbt ?? "",
      log.bbtDisturbed ? "true" : "false",
      log.cervicalFluid ?? "",
      log.sensation ?? "",
      log.lhTest ?? "",
      log.symptoms.join(";"),
      escapeCsv(log.notes ?? ""),
    ].join(","),
  );
  return [CSV_HEADERS.join(","), ...rows].join("\n");
}

export function parseCycleCsv(text: string, startDate?: string): Cycle {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = lines[0]?.split(",").map((header) => header.trim());
  if (!headers || headers.join(",") !== CSV_HEADERS.join(",")) {
    throw new Error(`CSV must use headers: ${CSV_HEADERS.join(", ")}`);
  }

  const logs: DayLog[] = lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    return {
      id: uid("log"),
      date: cells[0],
      cycleDay: Number(cells[1] || index + 1),
      bleeding: (cells[2] || "none") as DayLog["bleeding"],
      bbt: cells[3] ? Number(cells[3]) : undefined,
      bbtDisturbed: cells[4] === "true",
      cervicalFluid: cells[5] ? (cells[5] as DayLog["cervicalFluid"]) : undefined,
      sensation: cells[6] ? (cells[6] as DayLog["sensation"]) : undefined,
      lhTest: cells[7] ? (cells[7] as DayLog["lhTest"]) : undefined,
      symptoms: cells[8] ? cells[8].split(";").map((symptom) => symptom.trim()).filter(Boolean) : [],
      notes: cells[9] ?? "",
    };
  });

  if (!logs.length) throw new Error("CSV has no cycle rows.");

  return {
    id: uid("cycle"),
    startDate: startDate ?? logs[0].date,
    logs,
  };
}

export function downloadText(filename: string, text: string, mime = "text/plain"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string): string {
  if (!value.includes(",") && !value.includes('"') && !value.includes("\n")) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}
