import { orders } from "../data/orders";

export function getOrderStatus(orderId: string) {
  const order = orders.find((order) => order.id === orderId);

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
    estimatedDelivery: order.estimatedDelivery,
  };
}

export function getOrderDetails(orderId: string) {
  const order = orders.find((order) => order.id === orderId);

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
    status: order.status,
    estimatedDelivery: order.estimatedDelivery,
  };
}