export type Order = {
    id: string;
    customerName: string;
    status:
      | "processing"
      | "shipped"
      | "out_for_delivery"
      | "delivered";
    item: string;
    quantity: number;
    total: number;
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
      estimatedDelivery: "Today",
    },
    {
      id: "12346",
      customerName: "Sam",
      status: "shipped",
      item: "Mechanical Keyboard",
      quantity: 1,
      total: 7999,
      estimatedDelivery: "Tomorrow",
    },
    {
      id: "12347",
      customerName: "Jordan",
      status: "delivered",
      item: "USB-C Monitor",
      quantity: 1,
      total: 24999,
      estimatedDelivery: "Delivered yesterday",
    },
  ];