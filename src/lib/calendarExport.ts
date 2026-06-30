import type { Reminder } from "./models.ts";

export function buildReminderIcs(reminders: Reminder[]): string {
  const events = reminders.filter((reminder) => reminder.enabled).map(reminderToEvent).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//365 Feminine Control//MVP//EN",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ].filter(Boolean).join("\n");
}

function reminderToEvent(reminder: Reminder): string {
  const dateTime = toIcsDateTime(reminder.date, reminder.time);
  const uid = `${reminder.id}@365-feminine-control.local`;
  const rrule = reminder.repeats === "monthly" ? "RRULE:FREQ=MONTHLY" : reminder.repeats === "weekly" ? "RRULE:FREQ=WEEKLY" : reminder.repeats === "daily" ? "RRULE:FREQ=DAILY" : "";
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDateTime(new Date().toISOString().slice(0, 10), "00:00")}`,
    `DTSTART:${dateTime}`,
    `SUMMARY:${escapeIcs(reminder.title)}`,
    `DESCRIPTION:${escapeIcs(reminder.message)}`,
    rrule,
    "END:VEVENT",
  ].filter(Boolean).join("\n");
}

function toIcsDateTime(date: string, time: string): string {
  const [hour, minute] = time.split(":");
  return `${date.replaceAll("-", "")}T${hour ?? "09"}${minute ?? "00"}00`;
}

function escapeIcs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
}
