// Attempt 2: ask the AI directly. It understands, but answers in a
// different paragraph every time, which the app can't use.
// Run: npm run lab:2
import "dotenv/config";
import OpenAI from "openai";

const openai = new OpenAI();

async function main() {
  const text = "Kal subah 9 baje client ko call karna hai";

  for (const run of [1, 2]) {
    const response = await openai.responses.create({
      model: process.env.ASSISTANT_MODEL!,
      input: `The user said: "${text}". What does the user want?`,
    });
    console.log(`--- Run ${run} ---\n${response.output_text}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
