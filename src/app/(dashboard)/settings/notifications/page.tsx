"use client";

import { useEffect, useState, type ReactNode } from "react";
import { App, Button, Input, Skeleton } from "antd";
import { Info, Mail, Plus, Save, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted bg-subtle flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </div>
  );
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
      <div className="bg-card border-line shadow-card max-w-3xl rounded-lg border p-6">
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  const full = fields.length >= MAX_ORDER_NOTIFY_EMAILS;

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

      <form onSubmit={onSubmit} className="max-w-3xl space-y-3">
        <section className="bg-card border-line shadow-card divide-line divide-y overflow-hidden rounded-lg border">
          <SectionLabel>
            <span>Email báo đơn mới</span>
            <span className="tabular-nums">
              {fields.length}/{MAX_ORDER_NOTIFY_EMAILS}
            </span>
          </SectionLabel>

          {fields.length === 0 ? (
            <p className="text-muted px-4 py-3 text-sm italic">
              Chưa có email nào — sẽ không gửi thông báo.
            </p>
          ) : null}

          {fields.map((field, index) => (
            <Controller
              key={field.id}
              name={`orderNotifyEmails.${index}.value`}
              control={control}
              rules={{
                required: "Nhập email hoặc xoá dòng này",
                pattern: { value: EMAIL_PATTERN, message: "Email không hợp lệ" },
              }}
              render={({ field: input, fieldState }) => (
                <div className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      {...input}
                      prefix={<Mail size={14} className="text-muted" />}
                      placeholder="order@d-techjp.com"
                      status={fieldState.error ? "error" : undefined}
                      disabled={submitting}
                      aria-label={`Email ${index + 1}`}
                    />
                    <Button
                      type="text"
                      danger
                      aria-label={`Xoá email ${index + 1}`}
                      icon={<Trash2 size={15} />}
                      disabled={submitting}
                      onClick={() => remove(index)}
                    />
                  </div>
                  {fieldState.error ? (
                    <p className="text-danger mt-1 text-xs">
                      {fieldState.error.message}
                    </p>
                  ) : null}
                </div>
              )}
            />
          ))}

          <div className="px-4 py-2">
            <Button
              type="link"
              size="small"
              className="!px-0"
              icon={<Plus size={14} />}
              disabled={submitting || full}
              onClick={() => append({ value: "" })}
            >
              {full
                ? `Tối đa ${MAX_ORDER_NOTIFY_EMAILS} email`
                : "Thêm email"}
            </Button>
          </div>
        </section>

        <p className="text-muted flex items-start gap-1.5 text-xs">
          <Info size={13} className="mt-px shrink-0" />
          Gửi mỗi khi khách đặt đơn online, kèm link mở đơn trong admin. Đơn bán
          tại quầy không gửi.
        </p>
      </form>
    </>
  );
}
