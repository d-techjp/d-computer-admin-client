"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import { useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  ImageUploadField,
  RichTextField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import routes from "@/config/routes";
import { fakeMutate } from "@/lib/fakeFetch";
import { POST_CATEGORIES, type Post } from "@/types/post";

interface PostFormValues {
  title: string;
  slug: string;
  category?: string;
  excerpt: string;
  content: string;
  coverImage: UploadedImage[];
  published: boolean;
}

const CATEGORY_OPTIONS = POST_CATEGORIES.map((name) => ({
  label: name,
  value: name,
}));

function toFormValues(post?: Post): PostFormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    category: post?.category,
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    coverImage: post?.coverImage
      ? [
          {
            id: `${post.id}-cover`,
            name: "Ảnh bìa",
            url: post.coverImage,
            size: 0,
          },
        ]
      : [],
    published: post?.status === "published",
  };
}

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!post;

  const { control, handleSubmit, reset } = useForm<PostFormValues>({
    defaultValues: toFormValues(post),
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    await fakeMutate(values);
    setSubmitting(false);
    message.success(isEdit ? "Đã cập nhật bài viết" : "Đã tạo bài viết mới");
    router.push(routes.posts.index);
  });

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa bài viết" : "Viết bài mới"}
        description={
          isEdit ? post.title : "Soạn nội dung tin tức, đánh giá hoặc hướng dẫn"
        }
        breadcrumb={[
          { label: "Bài viết", href: routes.posts.index },
          { label: isEdit ? "Chỉnh sửa" : "Tạo mới" },
        ]}
        extra={
          <>
            <Button
              onClick={() => reset(toFormValues(post))}
              disabled={submitting}
            >
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEdit ? "Lưu thay đổi" : "Đăng bài"}
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
            placeholder="Nhập tiêu đề bài viết"
            rules={{ required: "Vui lòng nhập tiêu đề" }}
          />
          <TextAreaField
            name="excerpt"
            control={control}
            label="Mô tả ngắn"
            rows={2}
            maxLength={200}
            helpText="Hiển thị ở danh sách bài viết và kết quả tìm kiếm"
          />
          <RichTextField
            name="content"
            control={control}
            label="Nội dung"
            required
            minHeight={420}
            placeholder="Soạn nội dung bài viết..."
            rules={{ required: "Vui lòng nhập nội dung bài viết" }}
          />
        </section>

        <section className="bg-card border-line shadow-card h-fit space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Xuất bản</h3>

          <SelectField
            name="category"
            control={control}
            label="Chuyên mục"
            required
            options={CATEGORY_OPTIONS}
            rules={{ required: "Vui lòng chọn chuyên mục" }}
          />
          <TextField
            name="slug"
            control={control}
            label="Đường dẫn"
            required
            helpText="Phần đứng sau tên miền, VD: danh-gia-rog-strix-g16"
            rules={{ required: "Vui lòng nhập đường dẫn" }}
          />
          <SwitchField
            name="published"
            control={control}
            label="Trạng thái"
            checkedLabel="Đã đăng"
            uncheckedLabel="Bản nháp"
          />

          <ImageUploadField
            name="coverImage"
            control={control}
            label="Ảnh bìa"
            maxCount={1}
            helpText="Ảnh đại diện bài viết, tỉ lệ khuyến nghị 16:9, dưới 5MB."
          />
        </section>
      </div>
    </form>
  );
}

export default PostForm;
