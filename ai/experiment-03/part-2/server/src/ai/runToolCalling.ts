import { openai } from "./openai";
import { orderTools } from "../tools/orderTools";
import { executeTool } from "../tools/toolExecutor";

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_INSTRUCTIONS = `
You are an AI Order Assistant.

You have access to tools for retrieving and managing customer orders.

IMPORTANT TOOL RULES:

1. If the user asks about an order using an order ID,
   use getOrderStatus or getOrderDetails as appropriate.

2. If the user asks to find, list, search, or retrieve
   orders belonging to a customer by name, use searchOrders.

3. If the user asks for information that requires
   multiple steps, use multiple tools as needed.

4. If one tool result provides information needed
   for another tool call, use the second tool.
   For example:
   - Search a customer's orders.
   - Find the order arriving today.
   - Then call getOrderDetails for that order.

5. For cancellation requests, use cancelOrder.

6. Never ask the user for an order ID if the user's
   request can be fulfilled using searchOrders.

7. Never invent order information.
   Use the available tools to retrieve the actual data.

8. The backend is responsible for validating and
   executing tool requests.
`;

export async function runToolCalling(
  prompt: string,
) {
  console.log("\n");
  console.log(
    "========================================",
  );

  console.log("USER:");
  console.log(prompt);

  console.log(
    "========================================",
  );

  console.log("\nAVAILABLE TOOLS:");

  console.log(
    orderTools.map(
      (tool) => tool.name,
    ),
  );

  let response =
  await openai.responses.create({
    model: "gpt-5.6",
    input: prompt,
    tools: orderTools,
  });

console.log("\nRAW MODEL OUTPUT:");
console.log(
  JSON.stringify(
    response.output,
    null,
    2,
  ),
);

  for (
    let round = 1;
    round <= MAX_TOOL_ROUNDS;
    round++
  ) {
    console.log(
      `\n========== TOOL ROUND ${round} ==========`,
    );

    const toolCalls =
      response.output.filter(
        (item) =>
          item.type === "function_call",
      );

    if (toolCalls.length === 0) {
      console.log(
        "\nFINAL AI RESPONSE:",
      );

      console.log(
        response.output_text,
      );

      return response.output_text;
    }

    console.log(
      `AI requested ${toolCalls.length} tool(s)`,
    );

    const toolOutputs =
      toolCalls.map((toolCall) => {
        console.log(
          "\nAI requested:",
        );

        console.log(
          `Tool: ${toolCall.name}`,
        );

        console.log(
          `Arguments: ${toolCall.arguments}`,
        );

        const result =
          executeTool(
            toolCall.name,
            toolCall.arguments,
          );

        console.log(
          "\nTool result:",
        );

        console.log(
          JSON.stringify(
            result,
            null,
            2,
          ),
        );

        return {
          type:
            "function_call_output" as const,

          call_id:
            toolCall.call_id,

          output:
            JSON.stringify(result),
        };
      });

    response =
      await openai.responses.create({
        model: "gpt-5.6",

        previous_response_id:
          response.id,

        input: toolOutputs,

        tools: orderTools,

        instructions:
          SYSTEM_INSTRUCTIONS,
      });
  }

  throw new Error(
    "Maximum tool rounds exceeded.",
  );
}