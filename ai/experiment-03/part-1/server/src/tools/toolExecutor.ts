import {
    getOrderDetails,
    getOrderStatus,
  } from "../services/orderService";
  
  export function executeTool(
    name: string,
    argumentsJson: string,
  ) {
    const args = JSON.parse(argumentsJson);
  
    switch (name) {
      case "getOrderStatus":
        return getOrderStatus(args.orderId);
  
      case "getOrderDetails":
        return getOrderDetails(args.orderId);
  
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }