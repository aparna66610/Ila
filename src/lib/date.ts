export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T12:00:00`).getTime();
  const end = new Date(`${endIso}T12:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${iso}T12:00:00`),
  );
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(`${iso}T12:00:00`));
}

export function todayIso(): string {
  return isoDate(new Date());
}

export function monthGrid(anchorIso: string): string[] {
  const anchor = new Date(`${anchorIso}T12:00:00`);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return isoDate(date);
  });
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
