"use client";

import { useEffect, useState } from "react";
import { App, Button, Skeleton } from "antd";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { fetchSiteSettings, updateSiteSettings } from "@/lib/api/siteSettings";
import { uploadImage } from "@/lib/api/uploads";
import type { FooterColumn, SiteSettings } from "@/types/siteSettings";

import { FooterColumnsField } from "./_components/FooterColumnsField";
import { SocialLinksField } from "./_components/SocialLinksField";

/** Form giữ `logo` dạng `UploadedImage[]` (như ảnh sản phẩm) — chỉ chuyển thành `logoUrl` lúc submit. */
interface SocialLinkFormValue {
  id?: string;
  name: string;
  logo: UploadedImage[];
  url: string;
}

interface SiteInfoFormValues {
  companyName: string;
  phone: string;
  address: string;
  invoiceRegistrationNumber: string;
  socialLinks: SocialLinkFormValue[];
  footerColumns: FooterColumn[];
}

function toFormValues(settings: SiteSettings): SiteInfoFormValues {
  return {
    companyName: settings.companyName,
    phone: settings.phone,
    address: settings.address,
    invoiceRegistrationNumber: settings.invoiceRegistrationNumber,
    socialLinks: settings.socialLinks.map((link) => ({
      id: link.id,
      name: link.name,
      url: link.url,
      // Logo đã lưu quay lại form dưới dạng `UploadedImage` không kèm `file`
      // — nghĩa là "giữ nguyên URL cũ" nếu admin không đổi ảnh.
      logo: link.logoUrl
        ? [
            {
              id: link.id ?? link.logoUrl,
              name: link.name,
              url: link.logoUrl,
              size: 0,
            },
          ]
        : [],
    })),
    footerColumns: settings.footerColumns,
  };
}

const EMPTY_FORM: SiteInfoFormValues = {
  companyName: "",
  phone: "",
  address: "",
  invoiceRegistrationNumber: "",
  socialLinks: [],
  footerColumns: [],
};

/**
 * Thông tin cửa hàng hiển thị ở footer storefront — bản ghi singleton, không có
 * danh sách/phân trang như các trang campaign khác. Một form, một nút Lưu.
 */
export default function SiteInfoPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState } =
    useForm<SiteInfoFormValues>({
      defaultValues: EMPTY_FORM,
    });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void fetchSiteSettings()
        .then((settings) => {
          if (!cancelled) reset(toFormValues(settings));
        })
        .catch((error) => {
          if (!cancelled) {
            message.error(
              error instanceof Error
                ? error.message
                : "Không tải được thông tin cửa hàng",
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
    setSubmitting(true);
    try {
      // Logo mới chọn (còn giữ File) thì upload lên R2 trước để lấy URL công khai.
      const socialLinks = await Promise.all(
        values.socialLinks.map(async (link) => {
          const [logo] = link.logo;
          const logoUrl = logo?.file
            ? await uploadImage(logo.file, "site-settings")
            : (logo?.url ?? "");
          return { id: link.id, name: link.name, logoUrl, url: link.url };
        }),
      );

      const updated = await updateSiteSettings({
        companyName: values.companyName,
        phone: values.phone,
        address: values.address,
        invoiceRegistrationNumber: values.invoiceRegistrationNumber
          .trim()
          .toUpperCase(),
        socialLinks,
        footerColumns: values.footerColumns,
      });
      reset(toFormValues(updated));
      message.success("Đã lưu thông tin cửa hàng");
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : "Không lưu được thông tin cửa hàng",
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card rounded-lg border p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Thông tin cửa hàng"
        description="Tên công ty, hotline, địa chỉ, link mạng xã hội và cột điều hướng ở footer storefront"
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

      <form onSubmit={onSubmit} className="space-y-4">
        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Thông tin liên hệ</h3>

          <TextField
            name="companyName"
            control={control}
            label="Tên công ty"
            required
            disabled={submitting}
            rules={{ required: "Vui lòng nhập tên công ty" }}
          />

          <TextField
            name="phone"
            control={control}
            label="Hotline"
            required
            disabled={submitting}
            helpText="Số điện thoại liên hệ hiển thị ở footer"
            rules={{ required: "Vui lòng nhập số điện thoại" }}
          />

          <TextAreaField
            name="address"
            control={control}
            label="Địa chỉ công ty"
            required
            disabled={submitting}
            rows={2}
            rules={{ required: "Vui lòng nhập địa chỉ công ty" }}
          />

          <TextField
            name="invoiceRegistrationNumber"
            control={control}
            label="Số đăng ký インボイス"
            placeholder="T1234567890123"
            disabled={submitting}
            helpText="適格請求書発行事業者登録番号 — in trên bill bán tại quầy. Để trống nếu chưa đăng ký"
            rules={{
              pattern: {
                value: /^(T\d{13})?$/i,
                message: "Gồm chữ T và 13 chữ số, vd T1234567890123",
              },
            }}
          />
        </section>

        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <SocialLinksField
            control={control}
            name="socialLinks"
            disabled={submitting}
          />
        </section>

        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
          <FooterColumnsField
            control={control}
            name="footerColumns"
            disabled={submitting}
          />
        </section>
      </form>
    </>
  );
}
