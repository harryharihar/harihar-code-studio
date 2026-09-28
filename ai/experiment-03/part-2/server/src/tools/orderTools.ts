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
            description:
              "The ID of the order to look up.",
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
        "Get detailed information about an order including the customer, item, quantity, total, currency, status, and estimated delivery.",
  
      parameters: {
        type: "object",
  
        properties: {
          orderId: {
            type: "string",
            description:
              "The ID of the order to look up.",
          },
        },
  
        required: ["orderId"],
        additionalProperties: false,
      },
  
      strict: true,
    },
  
    {
      type: "function" as const,
      name: "searchOrders",
      description:
        "Find all orders belonging to a customer by customer name.",
  
      parameters: {
        type: "object",
  
        properties: {
          customerName: {
            type: "string",
            description:
              "The customer's name.",
          },
        },
  
        required: ["customerName"],
        additionalProperties: false,
      },
  
      strict: true,
    },
  
    {
      type: "function" as const,
      name: "cancelOrder",
      description:
        "Request cancellation of an order. The backend will check whether the order is eligible for cancellation before changing its status.",
  
      parameters: {
        type: "object",
  
        properties: {
          orderId: {
            type: "string",
            description:
              "The ID of the order to cancel.",
          },
        },
  
        required: ["orderId"],
        additionalProperties: false,
      },
  
      strict: true,
    },
  ];