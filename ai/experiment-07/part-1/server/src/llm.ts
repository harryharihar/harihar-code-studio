import OpenAI from "openai";

// One small door to OpenAI. The agent only talks to this interface,
// so in tests we can hand it a fake model and nothing else changes.
export type Item = any; // one item of the Responses API: message, function_call, function_call_output …

export type ToolDef = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: boolean;
};

export interface LLM {
  respond(o: { instructions: string; input: Item[]; tools?: ToolDef[] }): Promise<{ output: Item[]; text: string; tokens: number }>;
}

export function needEnv(...names: string[]) {
  for (const n of names) if (!process.env[n]) throw new Error(`${n} is missing from .env`);
}

export function openaiLLM(): LLM {
  const client = new OpenAI(); // key comes from .env, server only
  return {
    async respond({ instructions, input, tools }) {
      const res = await client.responses.create({ model: process.env.AGENT_MODEL!, instructions, input, tools });
      return { output: res.output as Item[], text: res.output_text, tokens: res.usage?.total_tokens ?? 0 };
    },
  };
}
