import OpenAI from "openai";

import { searchDocuments, SearchResult } from "./search";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type RAGResult = {
  answer: string;
  sources: SearchResult[];
};

export async function answerQuestion(
  question: string,
): Promise<RAGResult> {
  const results = await searchDocuments(question, 3);

  const context = results
    .map(
      (result, index) =>
        `[Source ${index + 1} - ${result.id}]\n${result.content}`,
    )
    .join("\n\n");

  const response = await openai.responses.create({
    model: "gpt-5.6",

    instructions: `
You are a helpful knowledge-base assistant.

Answer the user's question using ONLY the provided knowledge context.

If the answer is not present in the context, say that you don't have
enough information.

Do not invent or assume facts.

Keep the answer concise and clear.
`,

    input: `
Knowledge Context:

${context}

User Question:

${question}
`,
  });

  return {
    answer: response.output_text,
    sources: results,
  };
}
