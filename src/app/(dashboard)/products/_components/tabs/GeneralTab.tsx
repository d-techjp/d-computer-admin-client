"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { App, Button } from "antd";
import { useForm } from "react-hook-form";

import {
  CheckboxField,
  ImageUploadField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { loadCatalogOptions } from "@/lib/api/catalog";
import type { ImageInput } from "@/lib/api/formData";
import { productImagesOf, updateProduct } from "@/lib/api/products";
import type { SelectOption } from "@/types/common";
import type { Product, ProductSpec } from "@/types/product";

import { SpecListField, toSpecifications } from "../shared/SpecListField";

interface GeneralFormValues {
  name: string;
  categoryId?: string;
  brandId?: string;
  shortDescription: string;
  isFeatured: boolean;
  active: boolean;
  images: UploadedImage[];
  specs: ProductSpec[];
}

function toFormValues(product: Product): GeneralFormValues {
  return {
    name: product.name,
    categoryId: product.categoryId || undefined,
    brandId: product.brandId || undefined,
    shortDescription: product.shortDescription,
    isFeatured: product.isFeatured,
    active: product.status === "active",
    images: productImagesOf(product).map((url, index) => ({
      id: `${product.id}-img-${index}`,
      name: `Ảnh ${index + 1}`,
      url,
      size: 0,
    })),
    specs: product.specs,
  };
}

function toImageInputs(images: UploadedImage[]): ImageInput[] {
  return images
    .map((image) => ({ url: image.url, file: image.file }))
    .filter((image) => image.url || image.file);
}

/**
 * Thông tin master — `PATCH /products/{id}`.
 *
 * Tab này **không đụng tới giá, SKU hay tồn kho**: những trường đó đã chuyển
 * xuống biến thể và nằm ở tab "Giá & kho".
 */
export function GeneralTab({
  product,
  onSaved,
  actionsSlot,
}: {
  product: Product;
  onSaved: (product: Product) => void;
  /** Chỗ đặt nút Khôi phục / Lưu ở header trang (xem `ProductWorkspace`) */
  actionsSlot?: HTMLElement | null;
}) {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);

  const { control, handleSubmit, reset, formState } = useForm<GeneralFormValues>({
    defaultValues: toFormValues(product),
  });

  useUnsavedChangesGuard(formState.isDirty && !submitting);

  useEffect(() => {
    loadCatalogOptions()
      .then(({ categoryOptions: categories, brandOptions: brands }) => {
        setCategoryOptions(categories);
        setBrandOptions(brands);
      })
      .catch(() => {
        setCategoryOptions([]);
        setBrandOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const images = toImageInputs(values.images);
      const updated = await updateProduct(
        product.id,
        {
          name: values.name.trim(),
          shortDescription: values.shortDescription.trim(),
          specifications: toSpecifications(values.specs),
          // Trạng thái out_of_stock do backend tự suy ra từ tồn kho, ở đây chỉ
          // bật/tắt giữa đang bán và bản nháp.
          status: values.active ? "active" : "draft",
          isFeatured: values.isFeatured,
          categoryId: values.categoryId,
          brandId: values.brandId,
        },
        images,
      );

      // Response PATCH chỉ trả master, không kèm variants/options — giữ lại
      // phần đã có để các tab khác không mất dữ liệu.
      const merged: Product = {
        ...updated,
        variants: updated.variants.length ? updated.variants : product.variants,
        options: updated.options.length ? updated.options : product.options,
      };

      onSaved(merged);
      reset(toFormValues(merged));
      message.success("Đã lưu thông tin sản phẩm");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được sản phẩm");
    } finally {
      setSubmitting(false);
    }
  });

  // Ảnh đang có trên server — `product` được thay mới sau mỗi lần lưu nên số
  // này tự đúng lại khi sản phẩm vừa được thêm ảnh lần đầu.
  const savedImageCount = productImagesOf(product).length;

  // Form dài hơn một màn hình nên nút Lưu được đẩy lên header trang, cạnh nút
  // "Xoá sản phẩm"; thuộc tính `form` giữ được `htmlType="submit"` dù nút nằm
  // ngoài thẻ <form> sau khi portal.
  const formId = `product-general-${product.id}`;
  const actions = (
    <>
      <Button
        onClick={() => reset(toFormValues(product))}
        disabled={submitting || !formState.isDirty}
      >
        Khôi phục
      </Button>
      <Button
        type="primary"
        htmlType="submit"
        form={formId}
        loading={submitting}
        disabled={!formState.isDirty}
      >
        Lưu thay đổi
      </Button>
    </>
  );

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      {actionsSlot && createPortal(actions, actionsSlot)}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Thông tin chung</h3>

            <TextField
              name="name"
              control={control}
              label="Tên sản phẩm"
              required
              rules={{ required: "Vui lòng nhập tên sản phẩm" }}
              disabled={submitting}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="categoryId"
                control={control}
                label="Danh mục"
                required
                disabled={loadingOptions || submitting}
                options={categoryOptions}
                rules={{ required: "Vui lòng chọn danh mục" }}
              />
              <SelectField
                name="brandId"
                control={control}
                label="Thương hiệu"
                required
                disabled={loadingOptions || submitting}
                options={brandOptions}
                rules={{ required: "Vui lòng chọn thương hiệu" }}
              />
              <SwitchField
                name="active"
                control={control}
                label="Cho phép bán"
                checkedLabel="Đang bán"
                uncheckedLabel="Bản nháp"
                disabled={submitting}
              />
              <CheckboxField
                name="isFeatured"
                control={control}
                label="Nổi bật"
                text="Hiển thị ở khu vực sản phẩm nổi bật"
                disabled={submitting}
              />
            </div>

            <TextAreaField
              name="shortDescription"
              control={control}
              label="Mô tả ngắn"
              maxLength={500}
              disabled={submitting}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <SpecListField control={control} name="specs" disabled={submitting} />
          </section>
        </div>

        <section className="bg-card border-line shadow-card h-fit space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Ảnh sản phẩm</h3>
          <ImageUploadField
            name="images"
            control={control}
            maxCount={8}
            // Sàn suy từ ảnh đang có trên server, không suy từ danh sách đang
            // sửa: sản phẩm đã có ảnh thì backend không đưa về "không ảnh" được
            // nữa, còn sản phẩm chưa có ảnh thì ảnh vừa thêm phải gỡ ra được.
            minCount={savedImageCount ? 1 : 0}
            disabled={submitting}
            helpText={
              savedImageCount
                ? "Ảnh đầu tiên là ảnh đại diện, phải giữ lại ít nhất 1 ảnh. Biến thể có thể dùng ảnh riêng."
                : "Ảnh đầu tiên là ảnh đại diện. Biến thể có thể dùng ảnh riêng."
            }
          />
        </section>
      </div>

      {/* Chưa có chỗ ở header (tab chưa active / slot chưa mount) thì giữ nguyên
          hàng nút cuối form để không bao giờ mất đường lưu. */}
      {!actionsSlot && <div className="flex justify-end gap-2">{actions}</div>}
    </form>
  );
}

export default GeneralTab;
