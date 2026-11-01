// Part 4: real local notifications. The phone keeps the alarm itself —
// no server and no internet are needed when the time comes.
import * as Notifications from "expo-notifications";
import { AndroidImportance, SchedulableTriggerInputTypes } from "expo-notifications";
import { Platform } from "react-native";

import type { SavedItem } from "@/types";

// Show reminders even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

// Android channels can't be changed once created, so a settings change needs a new id.
const CHANNEL = "reminders-v2";

let ready: Promise<boolean> | null = null;

// Android needs a channel; HIGH importance makes the reminder pop up with sound.
export function setupNotifications() {
  ready ??= (async () => {
    if (Platform.OS === "android") {
      // no `sound` here: a string means a custom sound file; leaving it out = the phone's default sound
      // Expo Go on Android rejects this; the real build (npx expo run:android) needs it
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: "Reminders", importance: AndroidImportance.HIGH,
      }).catch((err) => console.warn("[notify] channel not created:", err));
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  })();
  return ready;
}

// "2026-10-29" + "17:00" → Date in the phone's own time zone. A task with only a date → 9 AM that day.
export function fireTime(item: SavedItem): Date | null {
  if (!item.date || item.intent === "note") return null;
  if (item.intent === "reminder" && !item.time) return null;
  const [y, m, d] = item.date.split("-").map(Number);
  const [hh, mm] = (item.time ?? "09:00").split(":").map(Number);
  const at = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(at.getTime()) ? null : at;
}

export async function scheduleFor(item: SavedItem): Promise<string | null> {
  if (item.intent === "note") return null;
  const at = fireTime(item);
  if (!at || at.getTime() < Date.now() + 5_000) return null; // no time, or the time has passed
  if (!(await setupNotifications())) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: `${item.intent === "reminder" ? "⏰" : "✅"} ${item.title}`, body: `You said: “${item.said}”`, sound: true },
    // alarmClock: Android never delays it for battery saving, even on a locked phone
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL, delivery: "alarmClock" },
  });
}

export async function cancelFor(item: SavedItem) {
  if (item.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(item.notificationId).catch(() => {});
  }
}
