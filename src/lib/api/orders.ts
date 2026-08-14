import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingAddress,
} from "@/types/order";

import { apiFetch } from "./client";
import {
  compactPayload,
  parseListResponse,
  toListQuery,
  type ApiListParams,
} from "./pagination";
import {
  asArray,
  asEnum,
  asIsoDate,
  asNumber,
  asOptionalString,
  asRecord,
  asString,
} from "./parse";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
  "refunded",
] as const;

const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"] as const;
const PAYMENT_METHODS = ["cod", "bank_transfer", "credit_card", "e_wallet"] as const;

export interface ListOrdersParams extends ApiListParams {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  from?: string;
  to?: string;
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  reason?: string;
}

function toShippingAddress(value: unknown): ShippingAddress | undefined {
  const record = asRecord(value);
  const fullName = asString(record.fullName ?? record.name);
  const phone = asString(record.phone);
  const street = asString(record.street ?? record.address);
  const province = asString(record.province);

  if (!fullName && !phone && !street && !province) return undefined;

  return {
    fullName,
    phone,
    street,
    ward: asOptionalString(record.ward),
    district: asOptionalString(record.district),
    province,
    note: asOptionalString(record.note),
  };
}

function shippingAddressText(address?: ShippingAddress) {
  if (!address) return "";
  return [address.street, address.ward, address.district, address.province].filter(Boolean).join(", ");
}

function toOrderItem(value: unknown, index: number): OrderItem {
  const record = asRecord(value);
  const product = asRecord(record.product);
  const variant = asRecord(record.variant ?? record.productVariant);
  const quantity = asNumber(record.quantity, 1);
  const price = asNumber(record.price ?? record.unitPrice);

  return {
    id: asString(record.id, `${index}`),
    productId: asOptionalString(record.productId ?? product.id),
    variantId: asOptionalString(record.variantId ?? variant.id),
    productName: asString(record.productName ?? product.name ?? record.name),
    variantName: asOptionalString(record.variantName ?? variant.name),
    sku: asString(record.sku ?? variant.sku),
    quantity,
    price,
    total: asNumber(record.total ?? record.lineTotal, price * quantity),
  };
}

export function toOrder(value: unknown): Order {
  const record = asRecord(value);
  const user = asRecord(record.user ?? record.customer);
  const address = toShippingAddress(record.shippingAddress);
  const items = asArray(record.items ?? record.orderItems).map(toOrderItem);
  const subtotal = asNumber(
    record.subtotal,
    items.reduce((sum, item) => sum + item.total, 0),
  );
  const shippingFee = asNumber(record.shippingFee);
  const discount = asNumber(record.discount);

  return {
    id: asString(record.id),
    code: asString(record.code ?? record.orderCode),
    customerId: asOptionalString(record.userId ?? record.customerId ?? user.id),
    customerName: asString(record.customerName ?? user.fullName ?? user.name ?? address?.fullName),
    customerPhone: asString(record.customerPhone ?? user.phone ?? address?.phone),
    customerEmail: asOptionalString(record.customerEmail ?? user.email),
    shippingAddress: asString(record.shippingAddressText) || shippingAddressText(address),
    shippingAddressDetail: address,
    items,
    subtotal,
    shippingFee,
    discount,
    total: asNumber(record.total, subtotal + shippingFee - discount),
    status: asEnum(record.status, ORDER_STATUSES, "pending"),
    paymentStatus: asEnum(record.paymentStatus, PAYMENT_STATUSES, "unpaid"),
    paymentMethod: asEnum(record.paymentMethod, PAYMENT_METHODS, "cod"),
    note: asOptionalString(record.note),
    createdAt: asIsoDate(record.createdAt ?? record.created_at),
    updatedAt: asOptionalString(record.updatedAt ?? record.updated_at),
  };
}

export function listOrders(params: ListOrdersParams) {
  return apiFetch<unknown>("/orders", {
    query: {
      ...toListQuery(params),
      userId: params.userId,
      status: params.status,
      paymentStatus: params.paymentStatus,
      paymentMethod: params.paymentMethod,
      from: params.from,
      to: params.to,
    },
  }).then((payload) =>
    parseListResponse(payload, toOrder, {
      page: params.page,
      pageSize: params.limit,
    }),
  );
}

export function fetchOrder(id: string) {
  return apiFetch<unknown>(`/orders/${id}`).then(toOrder);
}

export function fetchOrderByCode(code: string) {
  return apiFetch<unknown>(`/orders/code/${code}`).then(toOrder);
}

export function updateOrderStatus(id: string, payload: UpdateOrderStatusPayload) {
  return apiFetch<unknown>(`/orders/${id}/status`, {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toOrder);
}

export function updateOrderPaymentStatus(id: string, paymentStatus: PaymentStatus) {
  return apiFetch<unknown>(`/orders/${id}/payment-status`, {
    method: "PATCH",
    body: { paymentStatus },
  }).then(toOrder);
}
