// The model has no clock. We tell it today's date, in India's time zone.
export function today(at = new Date()) {
  const timeZone = "Asia/Kolkata";
  // built from parts: a locale's default format changes between Node versions, and tools compare this string
  const part = (type: string) => new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at).find((p) => p.type === type)!.value;
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`, // YYYY-MM-DD
    weekday: at.toLocaleDateString("en-US", { timeZone, weekday: "long" }),
  };
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
