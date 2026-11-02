// Part 5: what the assistant can DO during the call. The model asks, the phone does it.
// Arguments come from a model, so they are checked here just like the server checked them in Part 2.
import { scheduleFor } from "@/notify/reminders";
import { newItem, summarize } from "@/store/items";
import type { Action, SavedItem } from "@/types";

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const KINDS = ["reminder", "task", "note"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;

// The screen owns the list; the tools only read it and add to it.
export type Store = { list: () => SavedItem[]; add: (item: SavedItem) => void };

const pad = (n: number) => String(n).padStart(2, "0");
const dayOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// "shaam 6 baje" with no day: today if it's still ahead, otherwise tomorrow. The phone's own clock decides.
function dayFor(time: string, now = new Date()) {
  return time > timeOf(now) ? dayOf(now) : dayOf(new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

async function saveItem(a: any, store: Store) {
  const kind = KINDS.find((k) => k === a?.kind);
  const title = clean(a?.title, 80);
  if (!kind || !title) return { ok: false, error: "A kind and a title are needed." };

  let date: string | null = DATE.test(a.date) ? a.date : null;
  let time: string | null = TIME.test(a.time) ? a.time : null;

  // "do minute baad": the model has no clock, so the phone adds the minutes to its own.
  if (Number.isInteger(a.in_minutes) && a.in_minutes > 0 && a.in_minutes <= 7 * 24 * 60) {
    const at = new Date(Math.ceil((Date.now() + a.in_minutes * 60_000) / 60_000) * 60_000); // next full minute
    date = dayOf(at);
    time = timeOf(at);
  }
  if (!date && time) date = dayFor(time);
  if (kind === "reminder" && !time) return { ok: false, error: "A reminder needs a time. Ask: Kitne baje yaad dilaun?" };

  const action: Action = {
    intent: kind,
    title,
    date,
    time,
    people: Array.isArray(a.people) ? a.people.map((p: unknown) => clean(p, 40)).filter(Boolean).slice(0, 5) : [],
    priority: PRIORITIES.find((p) => p === a.priority) ?? "normal",
    needsClarification: false,
    question: null,
    reply: "",
  };
  const item = newItem(action, clean(a.said, 300) || title);
  item.notificationId = await scheduleFor(item).catch(() => null);
  store.add(item);

  return {
    ok: true,
    saved: true,
    kind,
    title,
    date,
    time,
    reminder_set: item.notificationId !== null,
    ...(kind !== "note" && !item.notificationId
      ? { note: "Saved, but no notification could be set (the time has passed or notifications are off). Tell the user." }
      : {}),
  };
}

export async function runTool(name: string, args: any, store: Store) {
  if (name === "save_item") return saveItem(args, store);
  if (name === "get_plan") return { ok: true, items: summarize(store.list()) || "Nothing is saved yet." };
  return { ok: false, error: `Unknown tool: ${name}` };
}
