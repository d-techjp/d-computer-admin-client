/**
 * Bán tại quầy + thu tiền qua máy POS Stripe Terminal — nhóm `/pos/*`.
 *
 * Luồng: `createPosOrder` (đơn `awaiting_payment`, chưa trừ kho) ->
 * `collectPosPayment` (máy hiện số tiền) -> poll `fetchPosPayment` tới khi
 * `paymentStatus = paid` hoặc `readerAction.status = failed`.
 */
import type { Order, OrderStatus, PaymentStatus } from "@/types/order";

import { apiFetch } from "./client";
import { toOrder } from "./orders";
import { compactPayload } from "./pagination";
import {
  asArray,
  asBoolean,
  asEnum,
  asNumber,
  asOptionalString,
  asRecord,
  asString,
} from "./parse";

const ORDER_STATUSES = [
  "awaiting_payment",
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "completed",
  "cancelled",
  "refunded",
] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded", "failed"] as const;
const READER_ACTION_STATUSES = ["in_progress", "succeeded", "failed"] as const;

export interface PosReader {
  id: string;
  label?: string;
  deviceType: string;
  status?: string;
  /** Reader ảo — chỉ có trong sandbox */
  simulated: boolean;
}

export interface PosReaders {
  readers: PosReader[];
  defaultReaderId?: string;
  /** Khoá Stripe test — hiện nút giả lập chạm thẻ */
  testMode: boolean;
}

export interface PosPayment {
  orderId: string;
  orderCode: string;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  readerId?: string;
  /** Thao tác của máy cho đơn này; không có khi máy đang rảnh / xử lý đơn khác */
  readerAction?: {
    status: (typeof READER_ACTION_STATUSES)[number];
    failureMessage?: string;
  };
}

export interface PosCustomer {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
}

/** `stripe_terminal`: chờ máy thu tiền. `cash`/`bank_transfer`: đã nhận tiền, đơn hoàn tất ngay */
export type PosPaymentMethod = "stripe_terminal" | "cash" | "bank_transfer";

export interface CreatePosOrderPayload {
  paymentMethod?: PosPaymentMethod;
  /** Khách chọn từ gợi ý; bỏ trống mà có `customerPhone` thì backend tìm/tạo khách theo số */
  customerId?: string;
  items: Array<{ variantId: string; quantity: number }>;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  discount?: number;
  note?: string;
}

function toPosPayment(value: unknown): PosPayment {
  const record = asRecord(value);
  const action = record.readerAction
    ? asRecord(record.readerAction)
    : undefined;

  return {
    orderId: asString(record.id),
    orderCode: asString(record.orderCode),
    total: asNumber(record.total),
    status: asEnum(record.status, ORDER_STATUSES, "awaiting_payment"),
    paymentStatus: asEnum(record.paymentStatus, PAYMENT_STATUSES, "unpaid"),
    readerId: asOptionalString(record.readerId),
    readerAction: action
      ? {
          status: asEnum(action.status, READER_ACTION_STATUSES, "in_progress"),
          failureMessage: asOptionalString(action.failureMessage),
        }
      : undefined,
  };
}

export function listPosReaders(): Promise<PosReaders> {
  return apiFetch<unknown>("/pos/readers").then((value) => {
    const record = asRecord(value);
    return {
      readers: asArray(record.readers).map((item) => {
        const reader = asRecord(item);
        return {
          id: asString(reader.id),
          label: asOptionalString(reader.label),
          deviceType: asString(reader.deviceType),
          status: asOptionalString(reader.status),
          simulated: asBoolean(reader.simulated),
        };
      }),
      defaultReaderId: asOptionalString(record.defaultReaderId),
      testMode: asBoolean(record.testMode),
    };
  });
}

/** Gợi ý khách theo số điện thoại (bỏ qua dấu gạch); dưới 3 chữ số trả rỗng */
export function searchPosCustomers(phone: string): Promise<PosCustomer[]> {
  return apiFetch<unknown>("/pos/customers", { query: { phone } }).then(
    (value) =>
      asArray(value).map((item) => {
        const record = asRecord(item);
        return {
          id: asString(record.id),
          fullName: asString(record.fullName),
          phone: asOptionalString(record.phone),
          email: asOptionalString(record.email),
        };
      }),
  );
}

export function createPosOrder(payload: CreatePosOrderPayload): Promise<Order> {
  return apiFetch<unknown>("/pos/orders", {
    method: "POST",
    body: compactPayload(payload),
  }).then(toOrder);
}

export function collectPosPayment(
  orderId: string,
  readerId?: string,
): Promise<PosPayment> {
  return apiFetch<unknown>(`/pos/orders/${orderId}/collect`, {
    method: "POST",
    body: compactPayload({ readerId }),
  }).then(toPosPayment);
}

export function fetchPosPayment(
  orderId: string,
  readerId?: string,
): Promise<PosPayment> {
  return apiFetch<unknown>(`/pos/orders/${orderId}/payment`, {
    query: { readerId },
  }).then(toPosPayment);
}

/** Dừng thu tiền trên máy — đơn vẫn chờ, thu lại được */
export function cancelPosCollect(
  orderId: string,
  readerId?: string,
): Promise<PosPayment> {
  return apiFetch<unknown>(`/pos/orders/${orderId}/cancel-collect`, {
    method: "POST",
    body: compactPayload({ readerId }),
  }).then(toPosPayment);
}

export function cancelPosOrder(
  orderId: string,
  payload: { readerId?: string; reason?: string } = {},
): Promise<PosPayment> {
  return apiFetch<unknown>(`/pos/orders/${orderId}/cancel`, {
    method: "POST",
    body: compactPayload(payload),
  }).then(toPosPayment);
}

/** Thẻ test của Stripe: thành công / bị từ chối */
export const TEST_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
} as const;

/** Chỉ sandbox: giả lập khách chạm thẻ trên reader ảo */
export function simulatePosTap(
  orderId: string,
  payload: { readerId?: string; cardNumber?: string } = {},
): Promise<PosPayment> {
  return apiFetch<unknown>(`/pos/orders/${orderId}/simulate-tap`, {
    method: "POST",
    body: compactPayload(payload),
  }).then(toPosPayment);
}
