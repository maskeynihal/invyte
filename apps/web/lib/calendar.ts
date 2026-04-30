export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location?: string;
  url?: string;
  durationMinutes?: number;
};

function parseEventStart(date: string, time: string): Date | null {
  if (!date || date === "TBD") return null;
  const timeStr = time && time !== "TBD" ? time : "8:00 PM";
  const parsed = new Date(`${date} ${timeStr}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatIcsLocal(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function formatIcsUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function generateIcsContent(event: CalendarEvent): string | null {
  const start = parseEventStart(event.date, event.time);
  if (!start) return null;

  const durationMs = (event.durationMinutes ?? 120) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invyte//Event//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@invyte`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsLocal(start)}`,
    `DTEND:${formatIcsLocal(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    event.url ? `URL:${escapeIcsText(event.url)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}

export function downloadIcsFile(event: CalendarEvent): boolean {
  const content = generateIcsContent(event);
  if (!content) return false;

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTitle = event.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  link.download = `${safeTitle || "event"}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
