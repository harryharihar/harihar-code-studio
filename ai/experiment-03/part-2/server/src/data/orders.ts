export type OrderStatus =
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  customerName: string;
  status: OrderStatus;
  item: string;
  quantity: number;
  total: number;
  currency: string;
  estimatedDelivery: string;
};

export const orders: Order[] = [
  {
    id: "12345",
    customerName: "Alex",
    status: "out_for_delivery",
    item: "Wireless Headphones",
    quantity: 1,
    total: 4999,
    currency: "INR",
    estimatedDelivery: "Today",
  },

  {
    id: "12346",
    customerName: "Alex",
    status: "shipped",
    item: "Mechanical Keyboard",
    quantity: 1,
    total: 7999,
    currency: "INR",
    estimatedDelivery: "Tomorrow",
  },

  {
    id: "12347",
    customerName: "Alex",
    status: "delivered",
    item: "USB-C Monitor",
    quantity: 1,
    total: 24999,
    currency: "INR",
    estimatedDelivery: "Delivered yesterday",
  },

  {
    id: "12348",
    customerName: "Sam",
    status: "processing",
    item: "Wireless Mouse",
    quantity: 2,
    total: 2998,
    currency: "INR",
    estimatedDelivery: "In 3 days",
  },
];