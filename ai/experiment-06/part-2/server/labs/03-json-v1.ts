// Attempt 3: give the AI a form (Structured Outputs).
// On purpose, this first version has two mistakes:
//   1. date and time are required, so the AI must fill them even when unsaid.
//   2. the AI is never told today's date.
// Run: npm run lab:3
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI();

const SCHEMA_V1 = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "title", "date", "time", "people"],
  properties: {
    intent: { type: "string", enum: ["reminder", "task", "note", "question", "other"] },
    title: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    time: { type: "string", description: "HH:MM, 24-hour", pattern: "^\\d{2}:\\d{2}$" },
    people: { type: "array", items: { type: "string" } },
  },
};

async function main() {
  const sentences = [
    "Kal subah 9 baje client ko call karna hai", // complete
    "Kal meeting yaad dilana", // no time
  ];

  for (const text of sentences) {
    const response = await openai.responses.create({
      model: process.env.ASSISTANT_MODEL!,
      instructions: "Turn the user's sentence into an action.",
      input: text,
      text: { format: { type: "json_schema", name: "action", strict: true, schema: SCHEMA_V1 } },
    });
    console.log(`"${text}"`);
    console.log(JSON.stringify(JSON.parse(response.output_text), null, 2), "\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
