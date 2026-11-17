"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert, App, Button, Skeleton, Switch } from "antd";
import { CalendarClock, Info, Save, Truck } from "lucide-react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  PaymentBrandIcon,
  type PaymentBrand,
} from "@/components/common/PaymentBrandIcon";
import {
  fetchPaymentSettings,
  updatePaymentSettings,
  type PaymentSettings,
} from "@/lib/api/paymentSettings";

const EMPTY: PaymentSettings = {
  codEnabled: false,
  cardEnabled: false,
  cardInstallmentsEnabled: false,
  paypayEnabled: false,
  alipayEnabled: false,
};

const CARD_BRANDS: PaymentBrand[] = [
  "visa",
  "mastercard",
  "jcb",
  "americanexpress",
  "applepay",
  "googlepay",
];

function hasAnyMethod(values: PaymentSettings): boolean {
  return (
    values.codEnabled ||
    values.cardEnabled ||
    values.paypayEnabled ||
    values.alipayEnabled
  );
}

/** Ô icon cùng cỡ với logo thẻ, cho những dòng không có logo hãng. */
function GlyphChip({ children }: { children: ReactNode }) {
  return (
    <span className="border-line bg-subtle text-muted inline-flex h-[22px] w-[34px] items-center justify-center rounded border">
      {children}
    </span>
  );
}

function MethodRow({
  name,
  control,
  icons,
  title,
  hint,
  disabled,
  nested,
}: {
  name: keyof PaymentSettings;
  control: Control<PaymentSettings>;
  icons: ReactNode;
  title: string;
  hint?: ReactNode;
  disabled?: boolean;
  nested?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${nested ? "bg-subtle/50 pl-10" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span
            className={`text-sm font-medium ${disabled ? "text-muted" : "text-fg"}`}
          >
            {title}
          </span>
          <span className="flex flex-wrap gap-1">{icons}</span>
        </div>
        {hint ? <p className="text-muted mt-0.5 text-xs">{hint}</p> : null}
      </div>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Switch
            size={nested ? "small" : "default"}
            checked={field.value}
            onChange={field.onChange}
            disabled={disabled}
            aria-label={title}
          />
        )}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted bg-subtle px-4 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
      {children}
    </p>
  );
}

/**
 * Cài đặt → Thanh toán: bật/tắt phương thức khách thấy ở checkout. Có hiệu lực
 * ngay với lượt checkout kế tiếp, không cần restart server như env trước đây.
 */
export default function PaymentSettingsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState } = useForm<PaymentSettings>(
    { defaultValues: EMPTY },
  );
  const values = useWatch({ control }) as PaymentSettings;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void fetchPaymentSettings()
        .then((settings) => {
          if (!cancelled) reset(settings);
        })
        .catch((error) => {
          if (!cancelled) {
            message.error(
              error instanceof Error
                ? error.message
                : "Không tải được cài đặt thanh toán",
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

  const onSubmit = handleSubmit(async (payload) => {
    if (!hasAnyMethod(payload)) {
      message.error("Phải bật ít nhất một phương thức thanh toán");
      return;
    }
    setSubmitting(true);
    try {
      reset(await updatePaymentSettings(payload));
      message.success("Đã lưu cài đặt thanh toán");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Không lưu được cài đặt thanh toán",
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card max-w-3xl rounded-lg border p-6">
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  const stripeHint = "Chỉ bật khi Stripe Dashboard đã duyệt (Enabled).";

  return (
    <>
      <PageHeader
        title="Thanh toán"
        description="Phương thức khách được chọn khi đặt hàng trên website"
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
        {!hasAnyMethod(values) ? (
          <Alert
            type="error"
            showIcon
            message="Đang tắt hết — khách sẽ không đặt hàng được."
          />
        ) : null}

        <section className="bg-card border-line shadow-card divide-line divide-y overflow-hidden rounded-lg border">
          <SectionLabel>Online · Stripe</SectionLabel>
          <MethodRow
            name="cardEnabled"
            control={control}
            title="Thẻ & ví"
            icons={CARD_BRANDS.map((brand) => (
              <PaymentBrandIcon key={brand} brand={brand} />
            ))}
            hint="Apple Pay / Google Pay hiện trên thiết bị hỗ trợ."
            disabled={submitting}
          />
          <MethodRow
            name="cardInstallmentsEnabled"
            control={control}
            nested
            title="Trả góp · 分割 / リボ / ボーナス"
            icons={
              <GlyphChip>
                <CalendarClock size={13} />
              </GlyphChip>
            }
            hint={
              values.cardEnabled
                ? "Thẻ tín dụng Nhật, khách trả bằng JPY. Shop nhận đủ tiền một lần."
                : "Bật “Thẻ & ví” để dùng."
            }
            disabled={submitting || !values.cardEnabled}
          />
          <MethodRow
            name="paypayEnabled"
            control={control}
            title="PayPay"
            icons={<PaymentBrandIcon brand="paypay" />}
            hint={stripeHint}
            disabled={submitting}
          />
          <MethodRow
            name="alipayEnabled"
            control={control}
            title="Alipay"
            icons={<PaymentBrandIcon brand="alipay" />}
            hint={stripeHint}
            disabled={submitting}
          />

          <SectionLabel>Khi nhận hàng</SectionLabel>
          <MethodRow
            name="codEnabled"
            control={control}
            title="Thu hộ COD · 代金引換"
            icons={
              <GlyphChip>
                <Truck size={13} />
              </GlyphChip>
            }
            disabled={submitting}
          />
        </section>

        <p className="text-muted flex items-start gap-1.5 text-xs">
          <Info size={13} className="mt-px shrink-0" />
          Bật một phương thức Stripe chưa được duyệt thì Stripe từ chối tạo
          phiên — khách không thanh toán online được.
        </p>
      </form>
    </>
  );
}
