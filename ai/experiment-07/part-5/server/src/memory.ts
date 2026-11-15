import { z } from "zod";
import type { LLM } from "./llm";
import type { Note } from "./types";

// LONG-TERM memory: short notes about the user that are still true next week.
// (SHORT-TERM memory is the conversation of one run: the checkpoint in execute.ts.)
export const NotesSchema = z.object({
  notes: z.array(z.string().describe("One short sentence about the user or the people they plan for, e.g. 'My sister Riya is vegetarian'")),
});

export const MAX_NEW_NOTES = 4;

const INSTRUCTIONS = `You read the goal a user gave to a party-planning assistant.
Pick out only facts that will STILL be true for future plans:
who they plan for, food rules (vegetarian, allergies), favourite flavours, colours or themes, their city.
- Do NOT include the goal itself or one-time details: the date, this budget, this guest count.
- Each note is one short sentence about a person, with their name if the user gave it: "Riya is my sister", "Riya is vegetarian".
- Never start a note with "The user".
- Return an empty list if there is nothing worth remembering.`;

export async function extractNotes(goal: string, llm: LLM): Promise<string[]> {
  const { data } = await llm.parse({ instructions: INSTRUCTIONS, input: goal, schema: NotesSchema, name: "notes" });
  const seen = new Set<string>();
  return data.notes
    .map((n) => n.trim().replace(/\bthe user's\b/gi, "my").replace(/\.$/, "").slice(0, 120)) // "Riya is the user's sister." → "Riya is my sister"
    .filter((n) => n.length > 3 && !seen.has(n.toLowerCase()) && !!seen.add(n.toLowerCase()))
    .slice(0, MAX_NEW_NOTES);
}

// What we put in front of the goal, so the planner (and the executor) "remember".
export function notesBlock(notes: Pick<Note, "content">[]) {
  return notes.length ? `Saved notes about the user (always respect them):\n${notes.map((n) => `- ${n.content}`).join("\n")}` : "";
}
