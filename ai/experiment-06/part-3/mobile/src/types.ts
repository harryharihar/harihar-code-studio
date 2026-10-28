// The same shape the server sends back.
export type Intent = "reminder" | "task" | "note" | "question" | "other";

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

export type AssistantResult = {
  text: string;
  action: Action | null; // null when the recording was silent
  audio?: string | null; // Part 3: reply's voice as base64 MP3
  cached?: boolean;      // Part 3: true = server reused a voice it made before
};
