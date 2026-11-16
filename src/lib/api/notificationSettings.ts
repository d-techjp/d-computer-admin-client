/**
 * Cấu hình thông báo nội bộ — singleton (`GET`/`PATCH /notification-settings`,
 * base URL đã có tiền tố `/admin`). Quyền riêng `settings.manage`, mặc định chỉ admin.
 */
import { apiFetch } from "./client";
import { asArray, asRecord, asString } from "./parse";

/** Khớp `MAX_ORDER_NOTIFY_EMAILS` của backend */
export const MAX_ORDER_NOTIFY_EMAILS = 3;

export interface NotificationSettings {
  /** Hộp thư nhận email báo đơn mới; rỗng = không gửi */
  orderNotifyEmails: string[];
}

function toNotificationSettings(value: unknown): NotificationSettings {
  const record = asRecord(value);
  return {
    orderNotifyEmails: asArray(record.orderNotifyEmails)
      .map((email) => asString(email))
      .filter(Boolean),
  };
}

export function fetchNotificationSettings() {
  return apiFetch<unknown>("/notification-settings").then(
    toNotificationSettings,
  );
}

export function updateNotificationSettings(payload: NotificationSettings) {
  return apiFetch<unknown>("/notification-settings", {
    method: "PATCH",
    body: payload,
  }).then(toNotificationSettings);
}
