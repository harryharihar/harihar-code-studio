// Part 4: the saved list lives on the phone (AsyncStorage), not on the server.
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Action, SavedItem } from "@/types";

const KEY = "hcs.exp06.items.v1";

export async function loadItems(): Promise<SavedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedItem[]) : [];
  } catch { return []; }
}

export async function storeItems(items: SavedItem[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export function isSavable(a: Action | null | undefined): a is Action & { intent: SavedItem["intent"] } {
  return !!a && (a.intent === "reminder" || a.intent === "task" || a.intent === "note");
}

// One id per item, and the user's own words so the notification can repeat them.
export function newItem(a: Action, said: string): SavedItem {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    intent: a.intent as SavedItem["intent"],
    title: a.title,
    date: a.date,
    time: a.time,
    people: a.people,
    priority: a.priority,
    said: said.trim(),
    createdAt: Date.now(),
    notificationId: null,
  };
}

// Timed items first (soonest at the top), then notes.
export function sortItems(items: SavedItem[]) {
  const key = (i: SavedItem) => (i.date ? `${i.date} ${i.time ?? "99:99"}` : "9999");
  return [...items].sort((a, b) => key(a).localeCompare(key(b)) || a.createdAt - b.createdAt);
}

// What the server sees when the user asks "kal ka plan kya hai?" — one line per item
export function summarize(items: SavedItem[]) {
  return sortItems(items).slice(0, 30)
    .map((i) => [i.date ?? "no date", i.time ?? "", i.intent, i.title, i.people.join(", ")].filter(Boolean).join(" · "))
    .join("\n");
}
