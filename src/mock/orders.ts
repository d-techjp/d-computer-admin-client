import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
} from "@/types/order";

import { customers } from "./customers";
import { products } from "./products";
import { faker, seedFaker } from "./utils";

const STATUS_WEIGHTS: OrderStatus[] = [
  ...Array<OrderStatus>(4).fill("delivered"),
  ...Array<OrderStatus>(3).fill("shipping"),
  ...Array<OrderStatus>(3).fill("confirmed"),
  ...Array<OrderStatus>(2).fill("pending"),
  "cancelled",
];

const PAYMENT_METHODS: PaymentMethod[] = [
  "cod",
  "cod",
  "bank_transfer",
  "credit_card",
  "e_wallet",
];

/** Phí vận chuyển phổ biến tại Nhật (JPY) */
const SHIPPING_FEES = [0, 550, 880, 1_100];

function generateOrders(count: number): Order[] {
  seedFaker(20260803);

  const sellableProducts = products.filter(
    (product) => product.status === "active",
  );

  return Array.from({ length: count }, (_, index) => {
    const customer = faker.helpers.arrayElement(customers);
    const itemCount = faker.number.int({ min: 1, max: 4 });

    const items: OrderItem[] = faker.helpers
      .arrayElements(sellableProducts, itemCount)
      .map((product) => ({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: faker.number.int({ min: 1, max: 3 }),
        price: product.price,
      }));

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const shippingFee = faker.helpers.arrayElement(SHIPPING_FEES);
    const createdAt = faker.date.between({
      from: "2026-02-01",
      to: "2026-08-01",
    });

    return {
      id: `ord-${String(index + 1).padStart(4, "0")}`,
      code: `DH${createdAt.getFullYear()}${String(index + 1).padStart(5, "0")}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      shippingAddress: customer.address,
      items,
      subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      status: faker.helpers.arrayElement(STATUS_WEIGHTS),
      paymentMethod: faker.helpers.arrayElement(PAYMENT_METHODS),
      createdAt: createdAt.toISOString(),
    } satisfies Order;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const orders = generateOrders(140);
