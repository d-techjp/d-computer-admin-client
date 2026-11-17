/**
 * Phương thức thanh toán ở checkout — singleton (`GET`/`PATCH /payment-settings`,
 * base URL đã có tiền tố `/admin`). Quyền `settings.manage`, mặc định chỉ admin.
 */
import { apiFetch } from "./client";
import { asBoolean, asRecord } from "./parse";

export interface PaymentSettings {
  codEnabled: boolean;
  /** Thẻ qua Stripe — gồm Visa/Mastercard/JCB/Amex, Apple Pay, Google Pay */
  cardEnabled: boolean;
  /** Trả góp cho thẻ tín dụng Nhật; chỉ có tác dụng khi bật thẻ */
  cardInstallmentsEnabled: boolean;
  paypayEnabled: boolean;
  alipayEnabled: boolean;
}

function toPaymentSettings(value: unknown): PaymentSettings {
  const record = asRecord(value);
  return {
    codEnabled: asBoolean(record.codEnabled),
    cardEnabled: asBoolean(record.cardEnabled),
    cardInstallmentsEnabled: asBoolean(record.cardInstallmentsEnabled),
    paypayEnabled: asBoolean(record.paypayEnabled),
    alipayEnabled: asBoolean(record.alipayEnabled),
  };
}

export function fetchPaymentSettings() {
  return apiFetch<unknown>("/payment-settings").then(toPaymentSettings);
}

export function updatePaymentSettings(payload: PaymentSettings) {
  return apiFetch<unknown>("/payment-settings", {
    method: "PATCH",
    body: payload,
  }).then(toPaymentSettings);
}
