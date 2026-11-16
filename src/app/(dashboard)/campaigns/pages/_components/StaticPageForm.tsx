"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import { ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import { RichTextField, SelectField, TextAreaField, TextField } from "@/components/form/fields";
import routes from "@/config/routes";
import { createStaticPage, fetchStaticPage, updateStaticPage } from "@/lib/api/pages";
import {
  STATIC_PAGE_STATUS_LABEL,
  staticPageUrl,
  type StaticPage,
  type StaticPageStatus,
} from "@/types/page";

interface StaticPageFormValues {
  title: string;
  slug: string;
  content: string;
  status: StaticPageStatus;
  metaTitle: string;
  metaDescription: string;
}

const STATUS_OPTIONS = Object.entries(STATIC_PAGE_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

/** Cùng quy tắc `SLUG_RULE` của backend, để báo lỗi ngay tại ô nhập. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toFormValues(page?: StaticPage): StaticPageFormValues {
  return {
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    content: page?.content ?? "",
    status: page?.status ?? "draft",
    metaTitle: page?.metaTitle ?? "",
    metaDescription: page?.metaDescription ?? "",
  };
}

/** Form tạo/sửa trang tĩnh, khớp `CreatePageDto` / `UpdatePageDto`. */
export function StaticPageForm({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [page, setPage] = useState<StaticPage>();
  const [loadingPage, setLoadingPage] = useState(!!pageId);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!pageId;

  const { control, handleSubmit, reset } = useForm<StaticPageFormValues>({
    defaultValues: toFormValues(),
  });

  useEffect(() => {
    if (!pageId) return;
    let cancelled = false;
    fetchStaticPage(pageId)
      .then((next) => {
        if (cancelled) return;
        setPage(next);
        reset(toFormValues(next));
      })
      .catch((error) => {
        message.error(error instanceof Error ? error.message : "Không tải được trang");
        router.push(routes.campaigns.pages.index);
      })
      .finally(() => {
        if (!cancelled) setLoadingPage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [message, pageId, reset, router]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (pageId) await updateStaticPage(pageId, values);
      else await createStaticPage(values);

      message.success(isEdit ? "Đã cập nhật trang" : "Đã tạo trang mới");
      router.push(routes.campaigns.pages.index);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được trang");
    } finally {
      setSubmitting(false);
    }
  });

  const disabled = loadingPage || submitting;

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa trang tĩnh" : "Tạo trang tĩnh"}
        description={
          isEdit ? (page?.title ?? "Đang tải thông tin trang") : "Chính sách, giới thiệu, hướng dẫn…"
        }
        breadcrumb={[
          { label: "Trang tĩnh", href: routes.campaigns.pages.index },
          { label: isEdit ? "Chỉnh sửa" : "Tạo mới" },
        ]}
        extra={
          <>
            {page?.status === "published" ? (
              <a href={staticPageUrl(page.slug)} target="_blank" rel="noopener noreferrer">
                <Button icon={<ExternalLink size={16} />}>Xem trên web</Button>
              </a>
            ) : null}
            <Button onClick={() => reset(toFormValues(page))} disabled={disabled}>
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={loadingPage}>
              {isEdit ? "Lưu thay đổi" : "Tạo trang"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4 lg:col-span-2">
          <TextField
            name="title"
            control={control}
            label="Tiêu đề"
            required
            placeholder="VD: プライバシーポリシー"
            disabled={disabled}
            rules={{
              required: "Vui lòng nhập tiêu đề",
              minLength: { value: 2, message: "Tiêu đề tối thiểu 2 ký tự" },
            }}
          />
          <div className="border-line grid grid-cols-1 gap-4 border-b pb-4 sm:grid-cols-2">
            <TextField
              name="metaTitle"
              control={control}
              label="Meta title (SEO)"
              placeholder="Bỏ trống để dùng tiêu đề"
              disabled={disabled}
            />
            <TextAreaField
              name="metaDescription"
              control={control}
              label="Meta description (SEO)"
              rows={2}
              maxLength={500}
              disabled={disabled}
              helpText="Hiện dưới tiêu đề trong kết quả tìm kiếm Google"
            />
          </div>
          <RichTextField
            name="content"
            control={control}
            label="Nội dung"
            required
            minHeight={420}
            disabled={disabled}
            placeholder="Soạn nội dung trang (tiếng Nhật)..."
            rules={{ required: "Vui lòng nhập nội dung" }}
          />
        </section>

        <section className="bg-card border-line shadow-card h-fit space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Xuất bản</h3>
          <TextField
            name="slug"
            control={control}
            label="Đường dẫn"
            required
            prefix="/"
            placeholder="privacy"
            disabled={disabled}
            helpText="Chữ thường, số, dấu gạch ngang. Đổi đường dẫn sẽ làm hỏng link cũ (footer, link đã chia sẻ)."
            rules={{
              required: "Vui lòng nhập đường dẫn",
              pattern: { value: SLUG_PATTERN, message: "Chỉ gồm chữ thường, số và dấu gạch ngang" },
            }}
          />
          <SelectField
            name="status"
            control={control}
            label="Trạng thái"
            required
            allowClear={false}
            disabled={disabled}
            options={STATUS_OPTIONS}
            helpText="Trang nháp không hiện trên web (khách mở link sẽ thấy 404)"
          />
        </section>
      </div>
    </form>
  );
}
