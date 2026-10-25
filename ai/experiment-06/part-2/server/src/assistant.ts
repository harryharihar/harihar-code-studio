import OpenAI from "openai";

const openai = new OpenAI(); // same key as Part 1, server only

export const INTENTS = ["reminder", "task", "note", "question", "other"] as const;
const PRIORITIES = ["low", "normal", "high"] as const;

// What the app receives. Everything here has been checked by checkAction.
export type Action = {
  intent: (typeof INTENTS)[number];
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

Today is ${now.weekday}, ${now.date}. Current time in India (IST): ${now.time}.

Rules:
- aaj = today, kal = tomorrow, parso = day after tomorrow.
- "subah 9 baje" = 09:00, "shaam 5 baje" = 17:00.
- Never invent a date, time or person that the user did not say. Use null.
- If the intent is reminder and there is no time, ask only for the time:
  "Kitne baje yaad dilaun?". Otherwise needs_clarification is false.
- reply: one short sentence, same language style as the user.

Intents:
- reminder: something to do or be reminded of at a point in time,
  e.g. "kal 9 baje client ko call karna hai", "kal meeting yaad dilana".
- task: work to finish, maybe by a deadline, e.g. "Friday tak presentation bhejni hai".
- note: information to remember, with no time.
- question: the user is asking or wondering about something.
- other: anything else.

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

// Fix 3: the schema is strict, but the server still checks every field.
// Anything malformed becomes null instead of reaching the app.
export function checkAction(raw: any): Action {
  const intent = INTENTS.includes(raw?.intent) ? raw.intent : "other";
  const date = DATE.test(raw?.date) ? raw.date : null; // "kal" → null
  const time = TIME.test(raw?.time) ? raw.time : null; // "25:99" → null
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
    reply: clean(raw?.reply, 200),
  };
}

// The app sends the sentence that led to a follow-up question, so an answer
// like "shaam 5 baje" can be joined with "Kal meeting yaad dilana".
export function readContext(body: any) {
  return clean(body?.context, 1000) || undefined;
}

export async function understand(text: string, context?: string): Promise<Action> {
  const input = context
    ? `Earlier the user said: "${context}". You asked a follow-up question.\nNow the user answered: "${text}".`
    : text;

  const response = await openai.responses.create({
    model: process.env.ASSISTANT_MODEL!,
    instructions: buildInstructions(),
    input,
    text: { format: { type: "json_schema", name: "action", strict: true, schema: SCHEMA } },
  });
  return checkAction(JSON.parse(response.output_text));
}
