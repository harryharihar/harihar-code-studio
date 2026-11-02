// The same shape the server sends back.
// Part 4: "confirm" / "cancel" answer a card that is waiting for "haan".
export type Intent = "reminder" | "task" | "note" | "question" | "other" | "confirm" | "cancel";

// What the AI understood, already checked by the server.
export type Action = {
  intent: Intent;
  title: string;
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM", 24-hour
  people: string[];
  priority: "low" | "normal" | "high";
  needsClarification: boolean;
  question: string | null;
  reply: string;
};

// Part 4: a reminder, task or note saved on the phone.
export type SavedItem = {
  id: string;
  intent: "reminder" | "task" | "note";
  title: string;
  date: string | null;
  time: string | null;
  people: string[];
  priority: "low" | "normal" | "high";
  said: string;                   // the user's own words, shown in the notification
  createdAt: number;
  notificationId: string | null;  // set when a notification is scheduled
  done?: boolean;                 // ticked off: stays in the list, no notification
};
