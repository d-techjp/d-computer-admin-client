"use client";

import { useEffect, useState } from "react";
import { App, Button, Skeleton } from "antd";
import { Plus, Save, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import { TextField } from "@/components/form/fields";
import {
  fetchNotificationSettings,
  MAX_ORDER_NOTIFY_EMAILS,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/api/notificationSettings";

/** useFieldArray chỉ làm việc với mảng object, nên bọc mỗi email thành `{ value }` */
interface NotificationFormValues {
  orderNotifyEmails: { value: string }[];
}

const EMAIL_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*$/;

function toFormValues(settings: NotificationSettings): NotificationFormValues {
  return {
    orderNotifyEmails: settings.orderNotifyEmails.map((value) => ({ value })),
  };
}

/**
 * Cài đặt → Thông báo: hộp thư nhận email "có đơn mới" (tối đa 3). Đơn bán tại
 * quầy không gửi, vì chính nhân viên vừa lên đơn.
 */
export default function NotificationSettingsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState } =
    useForm<NotificationFormValues>({
      defaultValues: { orderNotifyEmails: [] },
    });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "orderNotifyEmails",
  });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void fetchNotificationSettings()
        .then((settings) => {
          if (!cancelled) reset(toFormValues(settings));
        })
        .catch((error) => {
          if (!cancelled) {
            message.error(
              error instanceof Error
                ? error.message
                : "Không tải được cài đặt thông báo",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    const emails = values.orderNotifyEmails
      .map((email) => email.value.trim().toLowerCase())
      .filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      message.error("Danh sách email bị trùng");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateNotificationSettings({
        orderNotifyEmails: emails,
      });
      reset(toFormValues(updated));
      message.success("Đã lưu cài đặt thông báo");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Không lưu được cài đặt thông báo",
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card rounded-lg border p-6">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Hộp thư nhận email khi có đơn hàng mới"
        extra={
          <Button
            type="primary"
            icon={<Save size={16} />}
            loading={submitting}
            disabled={!formState.isDirty}
            onClick={() => void onSubmit()}
          >
            Lưu thay đổi
          </Button>
        }
      />

      <form onSubmit={onSubmit}>
        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <div>
            <h3 className="text-fg font-semibold">Email báo đơn mới</h3>
            <p className="text-muted text-sm">
              Gửi mỗi khi khách đặt đơn online, kèm link mở đơn trong admin. Tối
              đa {MAX_ORDER_NOTIFY_EMAILS} địa chỉ. Để trống danh sách nếu không
              muốn nhận.
            </p>
          </div>

          {fields.length === 0 ? (
            <p className="text-muted text-sm italic">
              Chưa có email nào — sẽ không gửi thông báo.
            </p>
          ) : null}

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  name={`orderNotifyEmails.${index}.value`}
                  control={control}
                  label={`Email ${index + 1}`}
                  placeholder="order@d-techjp.com"
                  disabled={submitting}
                  rules={{
                    required: "Vui lòng nhập email hoặc xoá dòng này",
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: "Email không hợp lệ",
                    },
                  }}
                />
              </div>
              <Button
                type="text"
                danger
                className="mt-7"
                aria-label={`Xoá email ${index + 1}`}
                icon={<Trash2 size={16} />}
                disabled={submitting}
                onClick={() => remove(index)}
              />
            </div>
          ))}

          <Button
            icon={<Plus size={16} />}
            disabled={submitting || fields.length >= MAX_ORDER_NOTIFY_EMAILS}
            onClick={() => append({ value: "" })}
          >
            Thêm email
          </Button>
        </section>
      </form>
    </>
  );
}
