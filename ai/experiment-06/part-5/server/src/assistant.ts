import OpenAI from "openai";

const openai = new OpenAI(); // same key as Part 1, server only

export const INTENTS = ["reminder", "task", "note", "question", "other", "confirm", "cancel"] as const;
const SAVABLE: Intent[] = ["reminder", "task", "note"]; // Part 4: things the app can save
export type Intent = (typeof INTENTS)[number];
const PRIORITIES = ["low", "normal", "high"] as const;

// What the app receives. Everything here has been checked by checkAction.
export type Action = {
  intent: Intent;
  title: string;
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM", 24-hour
  people: string[];
  priority: (typeof PRIORITIES)[number];
  needsClarification: boolean;
  question: string | null;
  reply: string;
};

// The model has no clock. Fix 1: tell it today's date, in India's time zone,
// so "kal" and "parso" turn into real dates.
export function nowInIndia(at = new Date()) {
  const timeZone = "Asia/Kolkata";
  return {
    weekday: at.toLocaleDateString("en-US", { timeZone, weekday: "long" }),
    date: at.toLocaleDateString("en-CA", { timeZone }), // en-CA gives YYYY-MM-DD
    time: at.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }),
  };
}

export function buildInstructions(now = nowInIndia()) {
  return `You are a voice productivity assistant for an Indian user.
They may speak English, Hindi or Hinglish (Hindi in Roman letters).
You are a woman. When you speak about yourself in Hindi, use feminine forms ("dila dungi", "sun rahi hoon", "kar diya").

Today is ${now.weekday}, ${now.date}. Current time in India (IST): ${now.time}.

Rules:
- aaj = today, kal = tomorrow, parso = day after tomorrow.
- "subah 9 baje" = 09:00, "shaam 5 baje" = 17:00.
- Never invent a date, time or person that the user did not say. Use null.
- If the intent is reminder and there is no time, ask only for the time:
  "Kitne baje yaad dilaun?". Otherwise needs_clarification is false.
- reply: one short, friendly sentence in the same language style as the user. If needs_clarification is true, the reply is the question.
- The reply is SPOKEN aloud, not read. Keep it to 1 or 2 short sentences, max 14 words.
  The card on screen already shows every detail.
- In the reply, say times and days the way people speak: "subah 9 baje", "shaam 5 baje",
  "kal", "parso", "Friday". Never write "09:00", "17:00" or "2026-10-26" in the reply.

Intents:
- reminder: something to do or be reminded of at a point in time,
  e.g. "kal 9 baje client ko call karna hai", "kal meeting yaad dilana".
- task: work to finish, maybe by a deadline, e.g. "Friday tak presentation bhejni hai".
- note: information to remember, with no time.
- question: the user is asking or wondering about something.
- other: anything else.
- confirm / cancel: only as an answer to a pending action (see Part 4).

Part 4 — nothing is saved until the user says yes:
- For a complete reminder, task or note, the reply repeats the key detail and ends with
  a short question, like "Kal shaam 5 baje meeting — save kar doon?"
- If a pending action is given and the user agrees (haan, ha, theek hai, save karo, kar do, yes, ok):
  intent = "confirm". reply: a short spoken confirmation, like "Ho gaya, kal shaam 5 baje yaad dila dungi."
- If a pending action is given and the user says no (nahi, rehne do, cancel, mat karo):
  intent = "cancel". reply: "Theek hai, save nahi kiya."
- If the user changes a detail ("6 baje kar do", "Friday ko kar do"): return the full updated action
  with the pending action's intent, and ask "save kar doon?" again.
- "Nahi" together with a new detail ("nahi, 6 baje kar do") is a change, not a cancel.
- If saved items are given and the user asks about their plan or list ("kal ka plan kya hai",
  "aaj kya kya hai"): intent = "question". Answer only from the saved items, in 1 or 2 short
  spoken sentences. If nothing is saved for that day, say so.
- "10 minute baad" / "2 ghante baad" = current time + that much. In the reply say it the
  user's way ("2 minute baad yaad dila dungi"), not the clock time.
- A time with no day ("shaam 6 baje") = today, or tomorrow if that time has already passed.

Fields:
- title: a few words, no date or time in it.
- people: only names or roles the user said, e.g. "client", "Rahul".
- priority: "high" if the user says urgent, jaldi or ASAP; otherwise "normal".
- question: the follow-up question when needs_clarification is true, otherwise null.`;
}

// Fix 2: date and time may be null ("user didn't say it"), and the AI can
// ask a follow-up question instead of guessing.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "title", "date", "time", "people", "priority",
             "needs_clarification", "question", "reply"],
  properties: {
    intent: { type: "string", enum: [...INTENTS] },
    title: { type: "string" },
    date: { type: ["string", "null"] }, // "YYYY-MM-DD"
    time: { type: ["string", "null"] }, // "HH:MM"
    people: { type: "array", items: { type: "string" } },
    priority: { type: "string", enum: [...PRIORITIES] },
    needs_clarification: { type: "boolean" },
    question: { type: ["string", "null"] },
    reply: { type: "string" },
  },
};

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// A time said without a day: today if it's still ahead, otherwise tomorrow.
// Without a date the phone can't schedule the notification.
export function dayFor(time: string, at = new Date()) {
  const now = nowInIndia(at);
  if (time > now.time) return now.date;
  return nowInIndia(new Date(at.getTime() + 24 * 60 * 60 * 1000)).date;
}

// Fix 3: the schema is strict, but the server still checks every field.
// Anything malformed becomes null instead of reaching the app.
export function checkAction(raw: any, pending?: Action): Action {
  let intent: Intent = INTENTS.includes(raw?.intent) ? raw.intent : "other";
  if ((intent === "confirm" || intent === "cancel") && !pending) { // nothing to confirm
    raw = { ...raw, reply: "Abhi save karne ke liye kuch nahi hai. Kya yaad dilaun?" };
    intent = "other";
  }

  // Part 4: on "haan" / "nahi" the details come from the pending action, not from the model,
  // so what gets saved is exactly the card the user said yes to.
  if (pending && (intent === "confirm" || intent === "cancel")) {
    const fallback = intent === "confirm" ? "Ho gaya, save kar diya." : "Theek hai, save nahi kiya.";
    return { ...pending, intent, needsClarification: false, question: null, reply: clean(raw?.reply, 160) || fallback };
  }

  const time = TIME.test(raw?.time) ? raw.time : null; // "25:99" → null
  let date = DATE.test(raw?.date) ? raw.date : null;   // "kal" → null
  if (!date && time && SAVABLE.includes(intent)) date = dayFor(time); // "shaam 6 baje" → a real day
  let needsClarification = raw?.needs_clarification === true;
  let question = clean(raw?.question, 160) || null;
  if (intent === "reminder" && !time) { // reminder bina time = bekaar
    needsClarification = true;
    question = question ?? "Kitne baje yaad dilaun?";
  }
  if (needsClarification && !question) question = "Thoda aur batao?";

  return {
    intent,
    title: clean(raw?.title, 80),
    date,
    time,
    people: Array.isArray(raw?.people)
      ? raw.people.map((p: unknown) => clean(p, 40)).filter(Boolean).slice(0, 5)
      : [],
    priority: PRIORITIES.includes(raw?.priority) ? raw.priority : "normal",
    needsClarification,
    question: needsClarification ? question : null,
    // The reply is spoken, so when we ask something, say exactly that question.
    reply: needsClarification ? question! : clean(raw?.reply, 200),
  };
}

// The app sends the sentence that led to a follow-up question, so an answer
// like "shaam 5 baje" can be joined with "Kal meeting yaad dilana".
export function readContext(body: any) {
  return clean(body?.context, 1000) || undefined;
}

// A pending action comes back from the app, so it is checked like any other input.
// Only a complete reminder, task or note can be waiting for a "haan".
export function checkPending(raw: any): Action | undefined {
  if (!raw || typeof raw !== "object" || !SAVABLE.includes(raw.intent)) return undefined;
  const a = checkAction({ ...raw, needs_clarification: false, question: null });
  return a.needsClarification ? undefined : a; // e.g. a reminder that still has no time
}

// Part 4: everything the app sends besides the voice / text.
export type Extra = {
  context?: string;  // the sentence before a follow-up question
  pending?: Action;  // the card waiting for "haan" / "nahi"
  items?: string;    // the saved list, one line per item
};

export async function understand(text: string, extra: Extra = {}): Promise<Action> {
  const parts: string[] = [];
  if (extra.items) parts.push(`Saved items (date · time · intent · title · people):\n${extra.items}`);
  if (extra.pending) {
    const { intent, title, date, time, people, priority } = extra.pending; // only what the user saw
    parts.push(`Pending action, waiting for the user's yes / no / change:\n${JSON.stringify({ intent, title, date, time, people, priority })}`);
  }
  if (extra.context) parts.push(`Earlier the user said: "${extra.context}". You asked a follow-up question.`);
  parts.push(extra.context || extra.pending ? `Now the user answered: "${text}".` : text);
  const input = parts.join("\n\n");

  const response = await openai.responses.create({
    model: process.env.ASSISTANT_MODEL!,
    instructions: buildInstructions(),
    input,
    text: { format: { type: "json_schema", name: "action", strict: true, schema: SCHEMA } },
  });
  return checkAction(JSON.parse(response.output_text), extra.pending);
}
