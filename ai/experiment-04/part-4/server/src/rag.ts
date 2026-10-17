import OpenAI from "openai";
import { searchDocuments, SearchResult } from "./search";
import { computeGroundedness } from "./groundedness";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SIMILARITY_THRESHOLD = 0.3;

export type RagAnswer = {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  groundedness: number;
  grounded: boolean;
};

export async function answerWithRag(
  question: string,
): Promise<RagAnswer> {
  const sources = await searchDocuments(question, 3);
  const confidence = sources[0]?.similarity ?? 0;

  if (sources.length === 0 || confidence < SIMILARITY_THRESHOLD) {
    return {
      answer:
        "I don't have enough information in the knowledge base to answer that confidently.",
      sources: [],
      confidence,
      groundedness: 0,
      grounded: false,
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

  const answer = response.output_text;
  const groundedness = computeGroundedness(answer, sources);

  return {
    answer,
    sources,
    confidence,
    groundedness,
    grounded: true,
  };
}
