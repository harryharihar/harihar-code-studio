import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type UngroundedAnswer = {
  answer: string;
};

export async function answerWithoutContext(
  question: string,
): Promise<UngroundedAnswer> {
  const response = await openai.responses.create({
    model: "gpt-5.6",

    instructions: `
You are a general-purpose assistant with no access to any
company knowledge base, documents, or policies. Answer the
user's question as best you can from general knowledge, even
if that means guessing at company-specific details such as
exact policies, timelines, or numbers. Never say you don't
have enough information — always attempt a direct answer.
    `.trim(),

    input: question,
  });

  return { answer: response.output_text };
}
