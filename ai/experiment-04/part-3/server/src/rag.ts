import OpenAI from "openai";
import { searchDocuments } from "./search";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function answerWithRag(question: string) {
  const sources = await searchDocuments(question, 3);

  if (sources.length === 0) {
    return {
      answer: "I couldn't find relevant information in the knowledge base.",
      sources: [],
    };
  }

  const context = sources
    .map(
      (source, index) =>
        `[Source ${index + 1}: ${source.id}]\n${source.content}`,
    )
    .join("\n\n");

  const response = await openai.responses.create({
    model: "gpt-5.6",
    instructions: `
You are a helpful customer-support assistant.
Answer using only the supplied knowledge-base context.
If the context does not contain the answer, say you do not
have enough information. Do not invent policies or facts.
Mention source IDs when useful.
    `.trim(),
    input: `Knowledge-base context:\n${context}\n\nQuestion: ${question}`,
  });

  return {
    answer: response.output_text,
    sources: sources.map(({ id, content, similarity }) => ({
      id,
      content,
      similarity,
    })),
  };
}