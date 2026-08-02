"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, Tooltip } from "antd";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
import {
  CurrencyField,
  ImageUploadField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import routes from "@/config/routes";
import { fakeMutate } from "@/lib/fakeFetch";
import { cn } from "@/lib/utils";
import { brandOptions, categoryOptions } from "@/mock/catalog";
import {
  DEFAULT_SPEC_LABELS,
  type Product,
  type ProductSpec,
} from "@/types/product";

export interface ProductFormValues {
  name: string;
  sku: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  cost?: number;
  stock?: number;
  images: UploadedImage[];
  specs: ProductSpec[];
  description: string;
  active: boolean;
}

function toFormValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId,
    brandId: product?.brandId,
    price: product?.price,
    cost: product?.cost,
    stock: product?.stock ?? 0,
    images:
      product?.images.map((url, index) => ({
        id: `${product.id}-img-${index}`,
        name: `Ảnh ${index + 1}`,
        url,
        size: 0,
      })) ?? [],
    // Sản phẩm mới bắt đầu bằng bộ thông số gợi ý, vẫn xoá/thêm được tuỳ ý
    specs: product?.specs.length
      ? product.specs
      : DEFAULT_SPEC_LABELS.map((label) => ({ label, value: "" })),
    description: product?.description ?? "",
    active: product ? product.status === "active" : true,
  };
}

/**
 * Bảng thông số kỹ thuật động: mỗi dòng là một cặp nhãn/giá trị, thêm bớt tuỳ ý
 * và kéo để đổi thứ tự. Thay cho 4 ô cố định CPU/RAM/Ổ cứng/Màn hình trước đây,
 * vì mỗi nhóm hàng có bộ thông số rất khác nhau.
 */
function SpecListField({
  control,
  disabled,
}: {
  control: ReturnType<typeof useForm<ProductFormValues>>["control"];
  disabled?: boolean;
}) {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "specs",
  });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Cột: tay cầm kéo | tên thông số (nửa trái) | giá trị (nửa phải) | nút xoá
  const ROW_GRID = "grid grid-cols-[20px_1fr_1fr_32px] items-center gap-2";

  return (
    <FormItemLayout
      label="Thông số kỹ thuật"
      helpText="Kéo biểu tượng bên trái để đổi thứ tự hiển thị."
    >
      <div className="space-y-2">
        {fields.length > 0 && (
          <div className={cn(ROW_GRID, "text-muted px-0 text-xs font-medium")}>
            <span />
            <span>Tên thông số</span>
            <span>Nội dung</span>
            <span />
          </div>
        )}

        {fields.map((row, index) => (
          <div
            key={row.id}
            // Chỉ dòng là vùng thả; thuộc tính draggable nằm ở tay cầm riêng,
            // vì đặt draggable lên thẻ bọc ngoài sẽ chặn focus và bôi đen text
            // của các ô input bên trong.
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                move(dragIndex, index);
              }
              setDragIndex(null);
            }}
            className={cn(ROW_GRID, dragIndex === index && "opacity-40")}
          >
            <span
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              role="button"
              tabIndex={-1}
              aria-label={`Kéo để đổi vị trí thông số ${index + 1}`}
              className="text-muted hover:text-fg flex shrink-0 cursor-grab justify-center active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </span>

            <Controller
              control={control}
              name={`specs.${index}.label`}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder="VD: CPU, Trọng lượng..."
                  aria-label={`Tên thông số ${index + 1}`}
                />
              )}
            />

            <Controller
              control={control}
              name={`specs.${index}.value`}
              render={({ field }) => (
                <Input
                  {...field}
                  disabled={disabled}
                  placeholder="VD: Intel Core i7-14700HX"
                  aria-label={`Giá trị thông số ${index + 1}`}
                />
              )}
            />

            <Tooltip title="Xoá dòng">
              <Button
                type="text"
                danger
                disabled={disabled}
                icon={<Trash2 size={16} />}
                onClick={() => remove(index)}
                aria-label={`Xoá thông số ${index + 1}`}
              />
            </Tooltip>
          </div>
        ))}

        <Button
          type="dashed"
          block
          disabled={disabled}
          icon={<Plus size={16} />}
          onClick={() => append({ label: "", value: "" })}
        >
          Thêm thông số
        </Button>
      </div>
    </FormItemLayout>
  );
}

interface ProductFormProps {
  product?: Product;
}

/**
 * Form đầy đủ trang dùng chung cho tạo mới và chỉnh sửa. Mỗi field là một
 * wrapper react-hook-form + antd, nhóm theo khối như bản gốc từng bố cục
 * (thông tin chung / ảnh / giá & kho / thông số kỹ thuật).
 */
export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!product;

  const { control, handleSubmit, reset } = useForm<ProductFormValues>({
    defaultValues: toFormValues(product),
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    // Bỏ những dòng thông số để trống trước khi lưu
    await fakeMutate({
      ...values,
      specs: values.specs.filter((spec) => spec.label.trim() && spec.value.trim()),
    });
    setSubmitting(false);
    message.success(isEdit ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm mới");
    router.push(routes.products.index);
  });

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
        description={
          isEdit
            ? `Cập nhật thông tin cho ${product.name}`
            : "Điền thông tin để thêm sản phẩm vào danh mục"
        }
        breadcrumb={[
          { label: "Quản lý sản phẩm", href: routes.products.index },
          { label: isEdit ? "Chỉnh sửa" : "Thêm mới" },
        ]}
        extra={
          <>
            <Button
              onClick={() => reset(toFormValues(product))}
              disabled={submitting}
            >
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isEdit ? "Lưu thay đổi" : "Tạo sản phẩm"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Thông tin chung</h3>

            <TextField
              name="name"
              control={control}
              label="Tên sản phẩm"
              required
              placeholder="VD: ASUS ROG Strix G16"
              rules={{ required: "Vui lòng nhập tên sản phẩm" }}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="sku"
                control={control}
                label="Mã SKU"
                required
                placeholder="VD: ASU-LAP-0001"
                rules={{ required: "Vui lòng nhập mã SKU" }}
              />
              <SelectField
                name="categoryId"
                control={control}
                label="Danh mục"
                required
                options={categoryOptions}
                rules={{ required: "Vui lòng chọn danh mục" }}
              />
              <SelectField
                name="brandId"
                control={control}
                label="Thương hiệu"
                required
                options={brandOptions}
                rules={{ required: "Vui lòng chọn thương hiệu" }}
              />
              <SwitchField
                name="active"
                control={control}
                label="Cho phép bán"
                checkedLabel="Đang bán"
                uncheckedLabel="Tạm ẩn"
              />
            </div>

            <TextAreaField
              name="description"
              control={control}
              label="Mô tả"
              placeholder="Mô tả ngắn về sản phẩm, chính sách bảo hành..."
              maxLength={500}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Ảnh sản phẩm</h3>
            <ImageUploadField
              name="images"
              control={control}
              maxCount={8}
              rules={{
                validate: (value) =>
                  (Array.isArray(value) && value.length > 0) ||
                  "Vui lòng chọn ít nhất một ảnh sản phẩm",
              }}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <SpecListField control={control} disabled={submitting} />
          </section>
        </div>

        <section className="bg-card border-line shadow-card h-fit space-y-4 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Giá &amp; tồn kho</h3>

          <CurrencyField
            name="price"
            control={control}
            label="Giá bán"
            required
            step={1000}
            rules={{ required: "Vui lòng nhập giá bán" }}
          />
          <CurrencyField
            name="cost"
            control={control}
            label="Giá vốn"
            step={1000}
            helpText="Dùng để tính biên lợi nhuận, không hiển thị cho khách"
          />
          <TextField
            name="stock"
            control={control}
            label="Số lượng tồn"
            type="number"
            min={0}
          />
        </section>
      </div>
    </form>
  );
}

export default ProductForm;
