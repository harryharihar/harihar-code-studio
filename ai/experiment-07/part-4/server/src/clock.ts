// The model has no clock. We tell it today's date, in India's time zone.
const timeZone = "Asia/Kolkata";

export function today(at = new Date()) {
  // built from parts: a locale's default format changes between Node versions, and tools compare this string
  const part = (type: string) => new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at).find((p) => p.type === type)!.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`, // YYYY-MM-DD
    weekday: at.toLocaleDateString("en-US", { timeZone, weekday: "long" }),
  };
}

// Part 3: the time of day matters too. A calendar never books in the past.
export function nowIST(at = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const h = Number(p.find((x) => x.type === "hour")!.value);
  const m = Number(p.find((x) => x.type === "minute")!.value);
  return { date: today(at).date, minutes: h * 60 + m };
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// "2026-11-11" → "Wed 11 Nov": what people (and the model) read best
export function niceDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).replace(",", "");
}
