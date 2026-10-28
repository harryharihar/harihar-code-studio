// Turns the server's "2026-10-25" + "09:00" into "Kal · 9:00 AM".
// Dates are compared with the phone's own calendar day.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Math.round absorbs the hour lost or gained on a daylight-saving day.
  const diff = Math.round((target.getTime() - today.getTime()) / DAY_MS);

  if (diff === 0) return "Aaj";
  if (diff === 1) return "Kal";
  if (diff === 2) return "Parso";
  if (diff > 2 && diff < 7) return WEEKDAYS[target.getDay()];
  return `${d} ${MONTHS[m - 1]}`;
}

function timeLabel(time: string) {
  const [h, min] = time.split(":").map(Number);
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function whenLabel(date: string | null, time: string | null) {
  const parts = [date && dayLabel(date), time && timeLabel(time)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
