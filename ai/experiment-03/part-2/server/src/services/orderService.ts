import {
    orders,
    OrderStatus,
  } from "../data/orders";
  
  export function getOrderStatus(
    orderId: string,
  ) {
    const order = orders.find(
      (order) => order.id === orderId,
    );
  
    if (!order) {
      return {
        found: false,
        orderId,
        message: `Order ${orderId} was not found.`,
      };
    }
  
    return {
      found: true,
      orderId: order.id,
      status: order.status,
      estimatedDelivery:
        order.estimatedDelivery,
    };
  }
  
  export function getOrderDetails(
    orderId: string,
  ) {
    const order = orders.find(
      (order) => order.id === orderId,
    );
  
    if (!order) {
      return {
        found: false,
        orderId,
        message: `Order ${orderId} was not found.`,
      };
    }
  
    return {
      found: true,
      orderId: order.id,
      customerName: order.customerName,
      item: order.item,
      quantity: order.quantity,
      total: order.total,
      currency: order.currency,
      status: order.status,
      estimatedDelivery:
        order.estimatedDelivery,
    };
  }

  export function searchOrders(
    customerName: string,
  ) {
    const normalizedName =
      customerName.trim().toLowerCase();
  
    const matchingOrders = orders.filter(
      (order) =>
        order.customerName.toLowerCase() ===
        normalizedName,
    );
  
    return {
      found: matchingOrders.length > 0,
      customerName,
      count: matchingOrders.length,
  
      orders: matchingOrders.map(
        (order) => ({
          orderId: order.id,
          item: order.item,
          status: order.status,
          estimatedDelivery:
            order.estimatedDelivery,
        }),
      ),
    };
  }

  export function cancelOrder(
    orderId: string,
  ) {
    const order = orders.find(
      (order) => order.id === orderId,
    );
  
    if (!order) {
      return {
        success: false,
        orderId,
        message: "Order not found.",
      };
    }
  
    const cancellableStatuses: OrderStatus[] = [
      "processing",
    ];
  
    if (
      !cancellableStatuses.includes(
        order.status,
      )
    ) {
      return {
        success: false,
        orderId,
        previousStatus: order.status,
        message:
          "This order cannot be cancelled because it has already been shipped or delivered.",
      };
    }
  
    order.status = "cancelled";
  
    return {
      success: true,
      orderId,
      status: order.status,
      message:
        "Order cancelled successfully.",
    };
  }