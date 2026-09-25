import { openai } from "./openai";
import { orderTools } from "../tools/orderTools";
import { executeTool } from "../tools/toolExecutor";

export async function runToolCalling(prompt: string) {
  // 1. Send the user's request to OpenAI
  const response = await openai.responses.create({
    model: "gpt-5.6",
    input: prompt,
    tools: orderTools,
  });

  // 2. Find function calls requested by the model
  const toolCalls = response.output.filter(
    (item) => item.type === "function_call",
  );

  // If no tool is required, return the normal AI response
  if (toolCalls.length === 0) {
    return response.output_text;
  }

  console.log("\n================ TOOL CALLING ================\n");

  // 3. Execute every requested tool
  const toolOutputs = toolCalls.map((toolCall) => {
    console.log("AI requested tool:");
    console.log(`  ${toolCall.name}`);

    console.log("\nTool arguments:");
    console.log(`  ${toolCall.arguments}`);

    const result = executeTool(
      toolCall.name,
      toolCall.arguments,
    );

    console.log("\nTool result:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n-----------------------------------------------\n");

    return {
      type: "function_call_output" as const,
      call_id: toolCall.call_id,
      output: JSON.stringify(result),
    };
  });

  // 4. Send the tool results back to OpenAI
  const finalResponse = await openai.responses.create({
    model: "gpt-5.6",
    previous_response_id: response.id,
    input: toolOutputs,
    tools: orderTools,
  });

  console.log("AI final response:");
  console.log(finalResponse.output_text);

  console.log("\n================================================\n");

  // 5. Return the final AI response
  return finalResponse.output_text;
}