"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Select } from "antd";
import { Controller, useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  ImageUploadField,
  RichTextField,
  SelectField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import routes from "@/config/routes";
import { createPost, fetchPost, updatePost } from "@/lib/api/articles";
import { categoryOptionsFrom, listCategories } from "@/lib/api/products";
import { uploadImage } from "@/lib/api/uploads";
import type { SelectOption } from "@/types/common";
import { POST_STATUS_LABEL, type Post, type PostStatus } from "@/types/post";

interface PostFormValues {
  title: string;
  slug: string;
  categoryId?: string;
  excerpt: string;
  content: string;
  coverImage: UploadedImage[];
  status: PostStatus;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
}

const STATUS_OPTIONS = Object.entries(POST_STATUS_LABEL).map(([value, label]) => ({
  label,
  value,
}));

function toFormValues(post?: Post): PostFormValues {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    categoryId: post?.categoryId,
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
    status: post?.status ?? "draft",
    tags: post?.tags ?? [],
    metaTitle: post?.metaTitle ?? "",
    metaDescription: post?.metaDescription ?? "",
  };
}

interface PostFormProps {
  post?: Post;
  postId?: string;
}

/** Form đầy đủ trang dùng chung cho tạo mới và chỉnh sửa, khớp `CreateArticleDto`/`UpdateArticleDto`. */
export function PostForm({ post: initialPost, postId }: PostFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [post, setPost] = useState<Post | undefined>(initialPost);
  const [loadingPost, setLoadingPost] = useState(!!postId && !initialPost);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);

  const isEdit = !!postId || !!post;

  const { control, handleSubmit, reset } = useForm<PostFormValues>({
    defaultValues: toFormValues(post),
  });

  useEffect(() => {
    if (!postId || initialPost) return;

    let cancelled = false;
    fetchPost(postId)
      .then((nextPost) => {
        if (cancelled) return;
        setPost(nextPost);
        reset(toFormValues(nextPost));
      })
      .catch((error) => {
        message.error(error instanceof Error ? error.message : "Không tải được bài viết");
        router.push(routes.posts.index);
      })
      .finally(() => {
        if (!cancelled) setLoadingPost(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialPost, message, postId, reset, router]);

  useEffect(() => {
    listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true })
      .then((response) => setCategoryOptions(categoryOptionsFrom(response.data)))
      .catch(() => setCategoryOptions([]))
      .finally(() => setLoadingOptions(false));
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const [cover] = values.coverImage;
      // Ảnh mới chọn (còn giữ File) thì upload lên R2 trước để lấy URL công khai
      const thumbnail = cover?.file ? await uploadImage(cover.file, "articles") : cover?.url;

      const payload = {
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        content: values.content,
        thumbnail,
        status: values.status,
        tags: values.tags,
        metaTitle: values.metaTitle,
        metaDescription: values.metaDescription,
        categoryId: values.categoryId,
      };

      if (isEdit) {
        const id = post?.id ?? postId;
        if (!id) {
          message.error("Không xác định được bài viết cần cập nhật");
          return;
        }
        await updatePost(id, payload);
      } else {
        await createPost({ ...payload, title: payload.title, content: payload.content });
      }

      message.success(isEdit ? "Đã cập nhật bài viết" : "Đã tạo bài viết mới");
      router.push(routes.posts.index);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được bài viết");
    } finally {
      setSubmitting(false);
    }
  });

  const disabled = loadingPost || submitting;

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa bài viết" : "Viết bài mới"}
        description={
          isEdit
            ? post
              ? post.title
              : "Đang tải thông tin bài viết"
            : "Soạn nội dung tin tức, đánh giá hoặc hướng dẫn"
        }
        breadcrumb={[
          { label: "Bài viết", href: routes.posts.index },
          { label: isEdit ? "Chỉnh sửa" : "Tạo mới" },
        ]}
        extra={
          <>
            <Button onClick={() => reset(toFormValues(post))} disabled={disabled}>
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={loadingPost}>
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
            disabled={disabled}
            rules={{ required: "Vui lòng nhập tiêu đề" }}
          />
          <TextAreaField
            name="excerpt"
            control={control}
            label="Mô tả ngắn"
            rows={2}
            maxLength={200}
            disabled={disabled}
            helpText="Hiển thị ở danh sách bài viết và kết quả tìm kiếm"
          />
          <div className="border-line grid grid-cols-1 gap-4 border-b pb-4 sm:grid-cols-2">
            <TextField
              name="metaTitle"
              control={control}
              label="Meta title (SEO)"
              placeholder="Bỏ trống để dùng tiêu đề bài viết"
              disabled={disabled}
            />
            <TextField
              name="metaDescription"
              control={control}
              label="Meta description (SEO)"
              placeholder="Bỏ trống để dùng mô tả ngắn"
              disabled={disabled}
            />
          </div>
          <RichTextField
            name="content"
            control={control}
            label="Nội dung"
            required
            minHeight={420}
            disabled={disabled}
            placeholder="Soạn nội dung bài viết..."
            rules={{ required: "Vui lòng nhập nội dung bài viết" }}
          />
        </section>

        <section className="bg-card border-line shadow-card h-fit space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Xuất bản</h3>

          <SelectField
            name="categoryId"
            control={control}
            label="Chuyên mục"
            disabled={loadingOptions || disabled}
            options={categoryOptions}
            helpText="Dùng chung danh mục với sản phẩm"
          />
          <TextField
            name="slug"
            control={control}
            label="Đường dẫn"
            disabled={disabled}
            helpText="Bỏ trống để backend tự sinh từ tiêu đề"
          />
          <SelectField
            name="status"
            control={control}
            label="Trạng thái"
            required
            allowClear={false}
            disabled={disabled}
            options={STATUS_OPTIONS}
            rules={{ required: "Vui lòng chọn trạng thái" }}
          />

          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <FormItemLayout label="Thẻ (tags)" helpText="Nhập rồi Enter để thêm thẻ mới">
                <Select
                  mode="tags"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  placeholder="VD: laptop, review"
                  className="w-full"
                  tokenSeparators={[","]}
                />
              </FormItemLayout>
            )}
          />

          <ImageUploadField
            name="coverImage"
            control={control}
            label="Ảnh bìa"
            maxCount={1}
            disabled={disabled}
            helpText="Ảnh đại diện bài viết, tỉ lệ khuyến nghị 16:9, dưới 5MB."
          />
        </section>
      </div>
    </form>
  );
}

export default PostForm;
