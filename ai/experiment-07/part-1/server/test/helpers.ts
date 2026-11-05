import type { Item, LLM } from "../src/llm";

// A fake model for tests: it answers from a script, so tests are fast, free and the same every time.
export const msg = (text: string): Item => ({ type: "message", role: "assistant", content: [{ type: "output_text", text }] });
export const call = (name: string, args: object, id = Math.random().toString(36).slice(2)): Item => ({
  type: "function_call",
  name,
  call_id: id,
  arguments: JSON.stringify(args),
});

export function scripted(steps: Array<Item[] | ((input: Item[]) => Item[])>): LLM & { calls: number } {
  const llm = {
    calls: 0,
    async respond({ input }: { input: Item[] }) {
      const step = steps[Math.min(llm.calls, steps.length - 1)];
      llm.calls++;
      const output = typeof step === "function" ? step(input) : step;
      const text = output.filter((o) => o.type === "message").map((o) => o.content.map((c: any) => c.text).join("")).join("\n");
      return { output, text, tokens: 100 };
    },
  };
  return llm;
}
