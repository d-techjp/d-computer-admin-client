"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, Tooltip } from "antd";
import { GripVertical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { PageHeader } from "@/components/common/PageHeader";
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
import routes from "@/config/routes";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import {
  brandOptionsFrom,
  categoryOptionsFrom,
  createProductMultipart,
  fetchProduct,
  fetchProductDescription,
  listBrands,
  listCategories,
  updateProduct,
  updateProductDescription,
  updateProductMultipart,
  type ProductImageInput,
} from "@/lib/api/products";
import { cn, formatCurrency } from "@/lib/utils";
import type { SelectOption } from "@/types/common";
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
  compareAtPrice?: number;
  cost?: number;
  stock?: number;
  lowStockThreshold?: number;
  images: UploadedImage[];
  specs: ProductSpec[];
  shortDescription: string;
  isFeatured: boolean;
  active: boolean;
}

/** Mô tả chi tiết sống trong form riêng — lưu qua API riêng, không đi cùng payload sản phẩm khi sửa */
interface DescriptionFormValues {
  description: string;
}

function toFormValues(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId,
    brandId: product?.brandId,
    price: product?.price,
    compareAtPrice: product?.compareAtPrice,
    cost: product?.cost,
    stock: product?.stock ?? 0,
    lowStockThreshold: product?.lowStockThreshold ?? 5,
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
    shortDescription: product?.shortDescription ?? "",
    isFeatured: product?.isFeatured ?? false,
    active: product ? product.status === "active" : true,
  };
}

function toSpecifications(specs: ProductSpec[]) {
  return Object.fromEntries(
    specs
      .filter((spec) => spec.label.trim() && spec.value.trim())
      .map((spec) => [spec.label.trim(), spec.value.trim()]),
  );
}

function productImages(images: UploadedImage[]): ProductImageInput[] {
  return images.map((image) => ({ url: image.url, file: image.file })).filter((image) => image.url || image.file);
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
  productId?: string;
}

/**
 * Form đầy đủ trang dùng chung cho tạo mới và chỉnh sửa. Mỗi field là một
 * wrapper react-hook-form + antd, nhóm theo khối như bản gốc từng bố cục
 * (thông tin chung / ảnh / giá & kho / thông số kỹ thuật).
 */
export function ProductForm({ product: initialProduct, productId }: ProductFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [product, setProduct] = useState<Product | undefined>(initialProduct);
  const [loadingProduct, setLoadingProduct] = useState(!!productId && !initialProduct);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [loadingDescription, setLoadingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  const isEdit = !!productId || !!product;
  const currentProductId = product?.id ?? productId;

  const { control, handleSubmit, reset, formState } = useForm<ProductFormValues>({
    defaultValues: toFormValues(product),
  });

  /**
   * Mô tả chi tiết sống trong `useForm` riêng: được lưu qua API riêng
   * (`updateProductDescription`), nên cờ dirty của nó phải tách khỏi form sản
   * phẩm — nếu chung một form, mỗi lần tải nội dung về (setValue) sẽ khiến cả
   * form bị đánh dấu "chưa lưu" dù người dùng chưa sửa gì.
   */
  const {
    control: descriptionControl,
    handleSubmit: handleDescriptionSubmit,
    reset: resetDescriptionForm,
    getValues: getDescriptionValues,
    formState: descriptionFormState,
  } = useForm<DescriptionFormValues>({ defaultValues: { description: "" } });

  const hasUnsavedChanges = formState.isDirty || descriptionFormState.isDirty;
  useUnsavedChangesGuard(hasUnsavedChanges);

  const [watchedPrice, watchedCompareAtPrice, watchedCost, watchedStock, watchedLowStockThreshold] = useWatch({
    control,
    name: ["price", "compareAtPrice", "cost", "stock", "lowStockThreshold"],
  });

  const discountPercent =
    watchedPrice && watchedCompareAtPrice && watchedCompareAtPrice > watchedPrice
      ? Math.round((1 - watchedPrice / watchedCompareAtPrice) * 100)
      : undefined;

  const marginPercent =
    watchedPrice && watchedPrice > 0 && watchedCost !== undefined
      ? Math.round(((watchedPrice - watchedCost) / watchedPrice) * 100)
      : undefined;

  const isLowStock =
    watchedStock !== undefined &&
    watchedLowStockThreshold !== undefined &&
    watchedStock <= watchedLowStockThreshold;

  useEffect(() => {
    if (!productId || initialProduct) return;

    let cancelled = false;
    fetchProduct(productId)
      .then((nextProduct) => {
        if (cancelled) return;
        setProduct(nextProduct);
        reset(toFormValues(nextProduct));
      })
      .catch((error) => {
        message.error(error instanceof Error ? error.message : "Không tải được sản phẩm");
        router.push(routes.products.index);
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialProduct, message, productId, reset, router]);

  useEffect(() => {
    Promise.all([
      listCategories({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
      listBrands({ page: 1, limit: 100, sortBy: "name", sortOrder: "ASC", isActive: true }),
    ])
      .then(([categories, brands]) => {
        setCategoryOptions(categoryOptionsFrom(categories.data));
        setBrandOptions(brandOptionsFrom(brands.data));
      })
      .catch(() => {
        setCategoryOptions([]);
        setBrandOptions([]);
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  /**
   * Mở trình soạn thảo mô tả chi tiết. Với sản phẩm đã có, gọi riêng
   * `fetchProductDescription` để lấy nội dung — tránh việc luôn tải và dựng
   * sẵn TipTap (nặng) mỗi khi mở trang sửa sản phẩm, dù người dùng không sửa gì.
   * `resetDescriptionForm` đồng thời đặt lại baseline nên nội dung vừa tải về
   * không bị coi là "chưa lưu".
   */
  const handleOpenDescription = async () => {
    if (descriptionOpen) return;

    if (currentProductId) {
      setLoadingDescription(true);
      try {
        const content = await fetchProductDescription(currentProductId);
        resetDescriptionForm({ description: content });
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : "Không tải được mô tả chi tiết",
        );
        return;
      } finally {
        setLoadingDescription(false);
      }
    }

    setDescriptionOpen(true);
  };

  /** Lưu mô tả chi tiết qua API riêng (PUT /products/{id}/description) — không đụng tới form sản phẩm */
  const onSaveDescription = handleDescriptionSubmit(async (values) => {
    if (!currentProductId) {
      message.error("Vui lòng tạo sản phẩm trước khi lưu mô tả chi tiết");
      return;
    }

    setSavingDescription(true);
    try {
      await updateProductDescription(currentProductId, values.description);
      resetDescriptionForm({ description: values.description });
      message.success("Đã lưu mô tả chi tiết");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được mô tả chi tiết");
    } finally {
      setSavingDescription(false);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const images = productImages(values.images);
      const urls = images.map((image) => image.url).filter(Boolean);
      const payload = {
        name: values.name,
        sku: values.sku,
        shortDescription: values.shortDescription,
        // Sản phẩm mới chưa có id để gọi API mô tả riêng nên vẫn gửi kèm lúc tạo;
        // khi sửa thì mô tả chi tiết luôn lưu qua updateProductDescription.
        description: isEdit ? undefined : getDescriptionValues("description"),
        price: values.price,
        compareAtPrice: values.compareAtPrice,
        costPrice: values.cost,
        stock: values.stock ?? 0,
        lowStockThreshold: values.lowStockThreshold,
        thumbnail: urls[0],
        images: urls.slice(1),
        specifications: toSpecifications(values.specs),
        status: values.active ? "active" : "draft",
        isFeatured: values.isFeatured,
        categoryId: values.categoryId,
        brandId: values.brandId,
      } as const;

      if (isEdit) {
        const id = currentProductId;
        if (!id) {
          message.error("Không xác định được sản phẩm cần cập nhật");
          return;
        }
        if (images.some((image) => image.file)) {
          await updateProductMultipart(id, payload, images);
        } else {
          await updateProduct(id, payload);
        }
      } else {
        if (payload.price === undefined) {
          message.error("Vui lòng nhập giá bán");
          return;
        }
        const createPayload = {
          ...payload,
          name: payload.name,
          sku: payload.sku,
          price: payload.price,
        };
        await createProductMultipart(createPayload, images);
      }

      message.success(isEdit ? "Đã cập nhật sản phẩm" : "Đã tạo sản phẩm mới");
      router.push(routes.products.index);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được sản phẩm");
    } finally {
      setSubmitting(false);
    }
  });

  const disabled = loadingProduct || submitting;

  return (
    <form onSubmit={onSubmit}>
      <PageHeader
        title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
        description={
          isEdit
            ? product
              ? `Cập nhật thông tin cho ${product.name}`
              : "Đang tải thông tin sản phẩm"
            : "Điền thông tin để thêm sản phẩm vào danh mục"
        }
        breadcrumb={[
          { label: "Quản lý sản phẩm", href: routes.products.index },
          { label: isEdit ? "Chỉnh sửa" : "Thêm mới" },
        ]}
        extra={
          <>
            <Button onClick={() => reset(toFormValues(product))} disabled={disabled}>
              Khôi phục
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={loadingProduct}>
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
              disabled={disabled}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                name="sku"
                control={control}
                label="Mã SKU"
                required
                placeholder="VD: ASU-LAP-0001"
                rules={{ required: "Vui lòng nhập mã SKU" }}
                disabled={disabled}
              />
              <SelectField
                name="categoryId"
                control={control}
                label="Danh mục"
                required
                disabled={loadingOptions || disabled}
                options={categoryOptions}
                rules={{ required: "Vui lòng chọn danh mục" }}
              />
              <SelectField
                name="brandId"
                control={control}
                label="Thương hiệu"
                required
                disabled={loadingOptions || disabled}
                options={brandOptions}
                rules={{ required: "Vui lòng chọn thương hiệu" }}
              />
              <SwitchField
                name="active"
                control={control}
                label="Cho phép bán"
                checkedLabel="Đang bán"
                uncheckedLabel="Tạm ẩn"
                disabled={disabled}
              />
            </div>

            <CheckboxField
              name="isFeatured"
              control={control}
              label="Nổi bật"
              text="Hiển thị ở khu vực sản phẩm nổi bật trên trang chủ"
              disabled={disabled}
            />

            <TextAreaField
              name="shortDescription"
              control={control}
              label="Mô tả ngắn"
              placeholder="Mô tả ngắn về sản phẩm, chính sách bảo hành..."
              maxLength={500}
              disabled={disabled}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-fg font-semibold">Mô tả chi tiết</h3>
              <div className="flex items-center gap-2">
                {descriptionOpen && isEdit && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<Save size={14} />}
                    loading={savingDescription}
                    disabled={disabled || !descriptionFormState.isDirty}
                    onClick={onSaveDescription}
                  >
                    Lưu mô tả chi tiết
                  </Button>
                )}
                {!descriptionOpen && (
                  <Button
                    size="small"
                    icon={<Pencil size={14} />}
                    loading={loadingDescription}
                    disabled={disabled}
                    onClick={handleOpenDescription}
                  >
                    {isEdit ? "Sửa mô tả chi tiết" : "Thêm mô tả chi tiết"}
                  </Button>
                )}
              </div>
            </div>

            {descriptionOpen ? (
              <>
                <RichTextField
                  name="description"
                  control={descriptionControl}
                  minHeight={320}
                  disabled={disabled || savingDescription}
                  placeholder="Soạn mô tả chi tiết, thông số nổi bật, chính sách bảo hành..."
                />
                <p className="text-muted text-xs">
                  {isEdit
                    ? "Mô tả chi tiết lưu riêng, không nằm trong nút \"Lưu thay đổi\" của sản phẩm."
                    : "Mô tả chi tiết sẽ được lưu cùng lúc khi tạo sản phẩm."}
                </p>
              </>
            ) : (
              <p className="text-muted text-sm">
                Nội dung hiển thị ở trang chi tiết sản phẩm trên cửa hàng. Bấm nút để{" "}
                {isEdit ? "tải và chỉnh sửa" : "soạn"}.
              </p>
            )}
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <h3 className="text-fg font-semibold">Ảnh sản phẩm</h3>
            <ImageUploadField
              name="images"
              control={control}
              maxCount={8}
              disabled={disabled}
              rules={{
                validate: (value) =>
                  (Array.isArray(value) && value.length > 0) ||
                  "Vui lòng chọn ít nhất một ảnh sản phẩm",
              }}
            />
          </section>

          <section className="bg-card border-line shadow-card space-y-4 rounded-lg border p-4">
            <SpecListField control={control} disabled={disabled} />
          </section>
        </div>

        <section className="bg-card border-line shadow-card h-fit space-y-5 rounded-lg border p-4">
          <h3 className="text-fg font-semibold">Giá &amp; tồn kho</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencyField
              name="price"
              control={control}
              label="Giá bán"
              required
              step={1000}
              rules={{ required: "Vui lòng nhập giá bán" }}
              disabled={disabled}
            />
            <CurrencyField
              name="compareAtPrice"
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
                {formatCurrency(watchedCompareAtPrice ?? 0)}
              </span>
              <span className="text-danger text-sm font-semibold">-{discountPercent}%</span>
              <span className="text-fg text-base font-bold">
                {formatCurrency(watchedPrice ?? 0)}
              </span>
            </div>
          )}

          <CurrencyField
            name="cost"
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

          <div className="border-line grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
            <TextField
              name="stock"
              control={control}
              label="Số lượng tồn"
              type="number"
              min={0}
              disabled={disabled}
            />
            <TextField
              name="lowStockThreshold"
              control={control}
              label="Ngưỡng cảnh báo"
              type="number"
              min={0}
              helpText="Cảnh báo khi tồn kho chạm mức này"
              disabled={disabled}
            />
          </div>

          {isLowStock && (
            <div className="bg-danger/8 text-danger rounded-md px-3 py-2 text-sm font-medium">
              Tồn kho đang ở mức thấp, cân nhắc nhập thêm hàng.
            </div>
          )}
        </section>
      </div>
    </form>
  );
}

export default ProductForm;
