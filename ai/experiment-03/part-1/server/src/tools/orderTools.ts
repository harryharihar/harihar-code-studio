export const orderTools = [
    {
      type: "function" as const,
      name: "getOrderStatus",
      description:
        "Get the current status and estimated delivery date for an order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The ID of the order to look up.",
          },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
      strict: true,
    },
  
    {
      type: "function" as const,
      name: "getOrderDetails",
      description:
        "Get detailed information about an order, including the customer, item, quantity, price, status, and estimated delivery.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The ID of the order to look up.",
          },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
      strict: true,
    },
  ];