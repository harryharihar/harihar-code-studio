import {
    cancelOrder,
    getOrderDetails,
    getOrderStatus,
    searchOrders,
  } from "../services/orderService";
  
  type ToolArguments = Record<
    string,
    unknown
  >;
  
  function getRequiredString(
    args: ToolArguments,
    key: string,
  ): string {
    const value = args[key];
  
    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      throw new Error(
        `${key} must be a non-empty string`,
      );
    }
  
    return value.trim();
  }
  
  export function executeTool(
    name: string,
    argumentsJson: string,
  ) {
    let args: ToolArguments;
  
    try {
      args = JSON.parse(argumentsJson);
    } catch {
      throw new Error(
        `Invalid JSON arguments for tool: ${name}`,
      );
    }
  
    switch (name) {
      case "getOrderStatus":
        return getOrderStatus(
          getRequiredString(
            args,
            "orderId",
          ),
        );
  
      case "getOrderDetails":
        return getOrderDetails(
          getRequiredString(
            args,
            "orderId",
          ),
        );
  
      case "searchOrders":
        return searchOrders(
          getRequiredString(
            args,
            "customerName",
          ),
        );
  
      case "cancelOrder":
        return cancelOrder(
          getRequiredString(
            args,
            "orderId",
          ),
        );
  
      default:
        throw new Error(
          `Unknown tool: ${name}`,
        );
    }
  }