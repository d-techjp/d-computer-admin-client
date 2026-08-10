"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, InputNumber, Radio, Tooltip } from "antd";
import { Info, Plus, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import {
  CheckboxField,
  CurrencyField,
  ImageUploadField,
  RichTextField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
  type UploadedImage,
} from "@/components/form/fields";
import { FormItemLayout } from "@/components/form/FormItemLayout";
import { PageHeader } from "@/components/common/PageHeader";
import routes from "@/config/routes";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { loadCatalogOptions } from "@/lib/api/catalog";
import type { ImageInput } from "@/lib/api/formData";
import { createProduct, updateProductDescription } from "@/lib/api/products";
import type { VariantPayload } from "@/lib/api/variants";
import { cn, formatCurrency } from "@/lib/utils";
import type { SelectOption } from "@/types/common";
import {
  DEFAULT_SPEC_LABELS,
  PRODUCT_TYPE_LABEL,
  type ProductSpec,
  type ProductType,
} from "@/types/product";
import {
  BUNDLE_INVENTORY_POLICY_HINT,
  BUNDLE_INVENTORY_POLICY_LABEL,
  type BundleInventoryPolicy,
} from "@/types/variant";

import { SpecListField, toSpecifications } from "./shared/SpecListField";

interface VariantRow {
  name: string;
  sku: string;
  price?: number;
  compareAtPrice?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
}

interface ProductCreateFormValues {
  name: string;
  categoryId?: string;
  brandId?: string;
  shortDescription: string;
  description: string;
  isFeatured: boolean;
  active: boolean;
  images: UploadedImage[];
  specs: ProductSpec[];
  /** Bật lên mới lộ bảng phiên bản — mặc định admin không gặp chữ "biến thể" */
  multiVariant: boolean;
  defaultVariantIndex: number;
  variants: VariantRow[];
  bundleInventoryPolicy: BundleInventoryPolicy;
}

const EMPTY_VARIANT: VariantRow = {
  name: "",
  sku: "",
  price: undefined,
  compareAtPrice: undefined,
  costPrice: undefined,
  stock: 0,
  lowStockThreshold: 5,
};

const BUNDLE_POLICIES: BundleInventoryPolicy[] = ["derived_from_components", "own_stock"];

// Tên phiên bản | SKU | Giá | Giá so sánh | Giá vốn | Tồn | Ngưỡng | Mặc định | Xoá
const VARIANT_GRID =
  "grid grid-cols-[minmax(140px,1.4fr)_minmax(140px,1.2fr)_repeat(3,minmax(110px,1fr))_repeat(2,minmax(90px,0.8fr))_64px_40px] items-start gap-2";

function defaultValues(productType: ProductType): ProductCreateFormValues {
  return {
    name: "",
    shortDescription: "",
    description: "",
    isFeatured: false,
    active: true,
    images: [],
    specs: DEFAULT_SPEC_LABELS.map((name, position) => ({ name, value: "", position })),
    multiVariant: false,
    defaultVariantIndex: 0,
    variants: [{ ...EMPTY_VARIANT }],
    bundleInventoryPolicy: "derived_from_components",
    // Dịch vụ không quản kho nên bỏ luôn hai ô tồn ra khỏi payload
    ...(productType === "service" ? { specs: [] as ProductSpec[] } : {}),
  };
}

function toImageInputs(images: UploadedImage[]): ImageInput[] {
  return images
    .map((image) => ({ url: image.url, file: image.file }))
    .filter((image) => image.url || image.file);
}

/**
 * Màn tạo sản phẩm.
 *
 * Cố tình **không dùng chung component với màn sửa**: lúc tạo chưa có id nên
 * mọi thứ phải đi trong đúng một `POST /products` kèm `variants` (backend
 * không có API tạo sản phẩm rỗng), còn lúc sửa thì master / biến thể / option
 * / combo là bốn API riêng với permission riêng.
 *
 * Ngoại lệ duy nhất là mô tả chi tiết: `CreateProductDto` không có trường
 * `description`, nên nội dung rich text phải lưu bằng một request thứ hai sau
 * khi sản phẩm đã tồn tại.
 */
export function ProductCreateForm({ productType }: { productType: ProductType }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const { control, handleSubmit, setValue, formState } = useForm<ProductCreateFormValues>({
    defaultValues: defaultValues(productType),
  });

  useUnsavedChangesGuard(formState.isDirty && !submitting);

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  const [multiVariant, defaultVariantIndex, bundlePolicy] = useWatch({
    control,
    name: ["multiVariant", "defaultVariantIndex", "bundleInventoryPolicy"],
  });

  const isService = productType === "service";
  const isBundle = productType === "bundle";
  const isStandard = productType === "standard";
  // Chỉ hàng hoá thường mới có nhiều phiên bản; combo và dịch vụ luôn 1 SKU
  const showVariantTable = isStandard && multiVariant;
  /** Dịch vụ không quản kho; combo derived lấy tồn từ thành phần nên cũng không nhập tay */
  const showStockFields = !isService && !(isBundle && bundlePolicy === "derived_from_components");

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
    // Tắt chế độ nhiều phiên bản thì giữ lại đúng phiên bản đang được đánh dấu
    // mặc định — không phải dòng đầu tiên, vì người dùng có thể đã khai N dòng
    // rồi mới đổi ý.
    const rows = showVariantTable
      ? values.variants
      : [values.variants[values.defaultVariantIndex] ?? values.variants[0]];
    const defaultIndex = showVariantTable
      ? Math.min(values.defaultVariantIndex, rows.length - 1)
      : 0;

    setSubmitting(true);
    try {
      const variants: VariantPayload[] = rows.map((row, index) => ({
        name: row.name.trim() || undefined,
        sku: row.sku.trim(),
        price: row.price,
        compareAtPrice: row.compareAtPrice,
        costPrice: row.costPrice,
        stock: showStockFields ? (row.stock ?? 0) : undefined,
        lowStockThreshold: showStockFields ? row.lowStockThreshold : undefined,
        isDefault: index === defaultIndex,
        trackInventory: isService ? false : undefined,
        bundleInventoryPolicy: isBundle ? values.bundleInventoryPolicy : undefined,
      }));

      const product = await createProduct(
        {
          name: values.name.trim(),
          productType,
          shortDescription: values.shortDescription.trim() || undefined,
          specifications: toSpecifications(values.specs),
          status: values.active ? "active" : "draft",
          isFeatured: values.isFeatured,
          categoryId: values.categoryId,
          brandId: values.brandId,
        },
        variants,
        toImageInputs(values.images),
      );

      // Mô tả chi tiết phải lưu sau vì CreateProductDto không nhận `description`.
      // Lỗi ở bước này không làm hỏng sản phẩm đã tạo — chỉ cảnh báo rồi đưa
      // người dùng sang tab mô tả để lưu lại.
      let descriptionSaved = true;
      if (values.description.trim()) {
        try {
          await updateProductDescription(product.id, values.description);
        } catch {
          descriptionSaved = false;
        }
      }

      message.success(`Đã tạo ${PRODUCT_TYPE_LABEL[productType].toLowerCase()} "${product.name}"`);
      if (!descriptionSaved) {
        message.warning("Sản phẩm đã tạo nhưng chưa lưu được mô tả chi tiết, vui lòng lưu lại.");
      }

      // Combo chưa có thành phần là combo vô nghĩa nên đẩy thẳng sang tab đó
      const tab = !descriptionSaved ? "description" : isBundle ? "bundle" : "variants";
      router.push(`${routes.products.detail(product.id)}?tab=${tab}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tạo được sản phẩm");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={`Thêm ${PRODUCT_TYPE_LABEL[productType].toLowerCase()}`}
        description="Điền thông tin để thêm sản phẩm vào danh mục"
        breadcrumb={[
          { label: "Quản lý sản phẩm", href: routes.products.index },
          { label: "Thêm mới" },
        ]}
        extra={
          <>
            <Button onClick={() => router.push(routes.products.index)} disabled={submitting}>
              Huỷ
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo sản phẩm
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
              placeholder="Mô tả ngắn về sản phẩm, chính sách bảo hành..."
              maxLength={500}
              disabled={submitting}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-fg font-semibold">Mô tả chi tiết</h3>
              {!descriptionOpen && (
                <Button size="small" icon={<Plus size={14} />} onClick={() => setDescriptionOpen(true)}>
                  Thêm mô tả chi tiết
                </Button>
              )}
            </div>

            {descriptionOpen ? (
              <>
                <RichTextField
                  name="description"
                  control={control}
                  minHeight={320}
                  disabled={submitting}
                  placeholder="Soạn mô tả chi tiết, thông số nổi bật, chính sách bảo hành..."
                />
                <p className="text-muted text-xs">
                  Mô tả chi tiết được lưu ngay sau khi sản phẩm được tạo.
                </p>
              </>
            ) : (
              <p className="text-muted text-sm">
                Nội dung hiển thị ở trang chi tiết sản phẩm trên cửa hàng. Có thể bỏ qua và
                soạn sau.
              </p>
            )}
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Ảnh sản phẩm</h3>
            <ImageUploadField
              name="images"
              control={control}
              maxCount={8}
              disabled={submitting}
              helpText="Ảnh đầu tiên là ảnh đại diện."
              rules={{
                validate: (value) =>
                  (Array.isArray(value) && value.length > 0) ||
                  "Vui lòng chọn ít nhất một ảnh sản phẩm",
              }}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <SpecListField control={control} name="specs" disabled={submitting} />
          </section>
        </div>

        <section className="bg-card border-line shadow-card h-fit space-y-5 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">
            {isBundle ? "Combo & giá bán" : isService ? "Giá dịch vụ" : "Giá & tồn kho"}
          </h3>

          {isBundle && (
            <FormItemLayout label="Chính sách tồn kho" required>
              <Controller
                control={control}
                name="bundleInventoryPolicy"
                render={({ field }) => (
                  <Radio.Group {...field} disabled={submitting} className="w-full">
                    <div className="space-y-2">
                      {BUNDLE_POLICIES.map((policy) => (
                        <label
                          key={policy}
                          className={cn(
                            "flex cursor-pointer gap-2 rounded-md border p-3 transition",
                            field.value === policy ? "border-brand bg-brand/5" : "border-line",
                          )}
                        >
                          <Radio value={policy} />
                          <span className="min-w-0">
                            <span className="text-fg block text-sm font-medium">
                              {BUNDLE_INVENTORY_POLICY_LABEL[policy]}
                            </span>
                            <span className="text-muted block text-xs">
                              {BUNDLE_INVENTORY_POLICY_HINT[policy]}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </Radio.Group>
                )}
              />
            </FormItemLayout>
          )}

          {isStandard && (
            <div className="border-line rounded-md border p-3">
              <SwitchField
                name="multiVariant"
                control={control}
                label="Sản phẩm có nhiều phiên bản"
                helpText="Bật khi sản phẩm bán theo nhiều cấu hình (RAM, dung lượng, màu...)."
                checkedLabel="Có"
                uncheckedLabel="Không"
                disabled={submitting}
              />
            </div>
          )}

          {showVariantTable ? (
            <p className="text-muted text-sm">
              Nhập giá và tồn kho cho từng phiên bản ở bảng bên dưới.
            </p>
          ) : (
            <SingleVariantFields
              control={control}
              disabled={submitting}
              showStock={showStockFields}
              isBundle={isBundle}
            />
          )}

          {isStandard && !multiVariant && (
            <p className="text-muted flex gap-2 text-xs">
              <Info size={14} className="mt-0.5 shrink-0" />
              Cần hàng chục tổ hợp (RAM × ổ cứng × màu)? Tạo sản phẩm trước, rồi khai trục
              biến thể ở tab &ldquo;Biến thể&rdquo; để sinh tự động.
            </p>
          )}
        </section>
      </div>

      {showVariantTable && (
        <section className="bg-card border-line shadow-card mt-4 space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-fg font-semibold">Các phiên bản</h3>
            <span className="text-muted text-sm">{fields.length} phiên bản</span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-260 space-y-2">
              <div className={cn(VARIANT_GRID, "text-muted text-xs font-medium")}>
                <span>Tên phiên bản</span>
                <span>
                  Mã SKU <span className="text-danger">*</span>
                </span>
                <span>
                  Giá bán <span className="text-danger">*</span>
                </span>
                <span>Giá so sánh</span>
                <span>Giá vốn</span>
                <span>Tồn kho</span>
                <span>Ngưỡng</span>
                <span className="text-center">Mặc định</span>
                <span />
              </div>

              {fields.map((row, index) => (
                <div key={row.id} className={VARIANT_GRID}>
                  <Controller
                    control={control}
                    name={`variants.${index}.name`}
                    render={({ field }) => (
                      <Input {...field} disabled={submitting} placeholder="VD: 16GB / 512GB" />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.sku`}
                    rules={{ required: true }}
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        disabled={submitting}
                        status={fieldState.error ? "error" : undefined}
                        placeholder="VD: ASU-16-512"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.price`}
                    rules={{ required: true, min: 0 }}
                    render={({ field, fieldState }) => (
                      <InputNumber
                        {...field}
                        disabled={submitting}
                        status={fieldState.error ? "error" : undefined}
                        min={0}
                        step={1000}
                        className="w-full"
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.compareAtPrice`}
                    render={({ field }) => (
                      <InputNumber {...field} disabled={submitting} min={0} step={1000} className="w-full" />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.costPrice`}
                    render={({ field }) => (
                      <InputNumber {...field} disabled={submitting} min={0} step={1000} className="w-full" />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.stock`}
                    render={({ field }) => (
                      <InputNumber {...field} disabled={submitting} min={0} className="w-full" />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.lowStockThreshold`}
                    render={({ field }) => (
                      <InputNumber {...field} disabled={submitting} min={0} className="w-full" />
                    )}
                  />
                  <div className="flex h-8 items-center justify-center">
                    <Controller
                      control={control}
                      name="defaultVariantIndex"
                      render={({ field }) => (
                        <Radio
                          checked={field.value === index}
                          onChange={() => field.onChange(index)}
                          disabled={submitting}
                          aria-label={`Đặt phiên bản ${index + 1} làm mặc định`}
                        />
                      )}
                    />
                  </div>
                  <Tooltip title={fields.length === 1 ? "Phải có ít nhất một phiên bản" : "Xoá"}>
                    <Button
                      type="text"
                      danger
                      disabled={submitting || fields.length === 1}
                      icon={<Trash2 size={16} />}
                      onClick={() => {
                        remove(index);
                        // Xoá đúng dòng đang là mặc định thì đẩy về dòng đầu
                        if (defaultVariantIndex >= index && defaultVariantIndex > 0) {
                          setValue("defaultVariantIndex", defaultVariantIndex - 1);
                        }
                      }}
                      aria-label={`Xoá phiên bản ${index + 1}`}
                    />
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>

          <Button
            type="dashed"
            block
            disabled={submitting}
            icon={<Plus size={16} />}
            onClick={() => append({ ...EMPTY_VARIANT })}
          >
            Thêm phiên bản
          </Button>

          {formState.isSubmitted && (
            <p className="text-muted text-xs">
              Mỗi phiên bản phải có mã SKU riêng và giá bán.
            </p>
          )}
        </section>
      )}
    </form>
  );
}

/** Khối giá/kho cho sản phẩm một phiên bản — ghi thẳng vào `variants[0]` */
function SingleVariantFields({
  control,
  disabled,
  showStock,
  isBundle,
}: {
  control: ReturnType<typeof useForm<ProductCreateFormValues>>["control"];
  disabled?: boolean;
  showStock: boolean;
  isBundle: boolean;
}) {
  const [price, compareAtPrice, costPrice] = useWatch({
    control,
    name: ["variants.0.price", "variants.0.compareAtPrice", "variants.0.costPrice"],
  });

  const discountPercent =
    price && compareAtPrice && compareAtPrice > price
      ? Math.round((1 - price / compareAtPrice) * 100)
      : undefined;

  const marginPercent =
    price && price > 0 && costPrice !== undefined
      ? Math.round(((price - costPrice) / price) * 100)
      : undefined;

  return (
    <>
      <TextField
        name="variants.0.sku"
        control={control}
        label="Mã SKU"
        required
        placeholder={isBundle ? "VD: COMBO-DELL-MX" : "VD: ASU-LAP-0001"}
        rules={{ required: "Vui lòng nhập mã SKU" }}
        disabled={disabled}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CurrencyField
          name="variants.0.price"
          control={control}
          label="Giá bán"
          required
          step={1000}
          rules={{ required: "Vui lòng nhập giá bán" }}
          disabled={disabled}
        />
        <CurrencyField
          name="variants.0.compareAtPrice"
          control={control}
          label="Giá so sánh"
          step={1000}
          helpText="Hiện gạch ngang cạnh giá bán"
          disabled={disabled}
        />
      </div>

      {discountPercent !== undefined && discountPercent > 0 && (
        <div className="bg-danger/8 border-danger/20 flex items-center justify-between rounded-md border px-3 py-2">
          <span className="text-muted text-sm line-through">
            {formatCurrency(compareAtPrice ?? 0)}
          </span>
          <span className="text-danger text-sm font-semibold">-{discountPercent}%</span>
          <span className="text-fg text-base font-bold">{formatCurrency(price ?? 0)}</span>
        </div>
      )}

      <CurrencyField
        name="variants.0.costPrice"
        control={control}
        label="Giá vốn"
        step={1000}
        helpText={
          marginPercent !== undefined
            ? `Biên lợi nhuận ước tính ${marginPercent}%`
            : "Dùng để tính biên lợi nhuận, không hiển thị cho khách"
        }
        disabled={disabled}
      />

      {showStock ? (
        <div className="border-line grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          <TextField
            name="variants.0.stock"
            control={control}
            label="Số lượng tồn"
            type="number"
            min={0}
            disabled={disabled}
          />
          <TextField
            name="variants.0.lowStockThreshold"
            control={control}
            label="Ngưỡng cảnh báo"
            type="number"
            min={0}
            helpText="Cảnh báo khi tồn kho chạm mức này"
            disabled={disabled}
          />
        </div>
      ) : (
        <p className="text-muted border-line border-t pt-4 text-xs">
          {isBundle
            ? "Tồn kho combo được suy ra từ tồn kho các thành phần, không nhập tay."
            : "Dịch vụ không quản lý tồn kho — luôn bán được kể cả khi tồn bằng 0."}
        </p>
      )}
    </>
  );
}

export default ProductCreateForm;
