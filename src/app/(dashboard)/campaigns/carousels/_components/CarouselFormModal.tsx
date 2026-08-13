"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { App, Button, Modal, Tag, Tooltip } from "antd";
import { Copy, ExternalLink, ImageOff, RefreshCw } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import {
  CheckboxField,
  CurrencyField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/form/fields";
import { createCarousel, previewCarouselFilter, updateCarousel } from "@/lib/api/carousels";
import { carouselFilterToQuery, carouselViewAllUrl } from "@/lib/carouselFilter";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { SelectOption } from "@/types/common";
import {
  CAROUSEL_DEFAULT_LIMIT,
  CAROUSEL_MAX_LIMIT,
  CAROUSEL_SORT_LABEL,
  CAROUSEL_SORT_ORDER_LABEL,
  type Carousel,
  type CarouselFilter,
  type CarouselSortBy,
  type CarouselSortOrder,
} from "@/types/carousel";
import { PRODUCT_TYPE_LABEL, type Product, type ProductType } from "@/types/product";

/** Filter phẳng ra từng field để react-hook-form quản lý, gom lại lúc submit */
interface CarouselFormValues {
  name: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  itemLimit: number;
  displaySortOrder: number;
  isActive: boolean;
  search?: string;
  categoryId?: string;
  includeSubCategories: boolean;
  brandId?: string;
  productType?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  isFeatured: boolean;
  sortBy: CarouselSortBy;
  sortOrder: CarouselSortOrder;
}

const EMPTY_FORM: CarouselFormValues = {
  name: "",
  slug: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  itemLimit: CAROUSEL_DEFAULT_LIMIT,
  displaySortOrder: 0,
  isActive: true,
  search: "",
  includeSubCategories: false,
  inStock: false,
  isFeatured: false,
  sortBy: "createdAt",
  sortOrder: "DESC",
};

function toFormValues(carousel: Carousel): CarouselFormValues {
  return {
    name: carousel.name,
    slug: carousel.slug,
    subtitle: carousel.subtitle ?? "",
    description: carousel.description ?? "",
    imageUrl: carousel.imageUrl ?? "",
    itemLimit: carousel.itemLimit,
    displaySortOrder: carousel.sortOrder,
    isActive: carousel.isActive,
    search: carousel.filters.search ?? "",
    categoryId: carousel.filters.categoryId,
    includeSubCategories: !!carousel.filters.includeSubCategories,
    brandId: carousel.filters.brandId,
    productType: carousel.filters.productType,
    minPrice: carousel.filters.minPrice,
    maxPrice: carousel.filters.maxPrice,
    inStock: !!carousel.filters.inStock,
    isFeatured: !!carousel.filters.isFeatured,
    sortBy: carousel.filters.sortBy ?? "createdAt",
    sortOrder: carousel.filters.sortOrder ?? "DESC",
  };
}

function toFilter(values: CarouselFormValues): CarouselFilter {
  return {
    search: values.search || undefined,
    categoryId: values.categoryId || undefined,
    includeSubCategories: values.includeSubCategories || undefined,
    brandId: values.brandId || undefined,
    productType: values.productType,
    minPrice: values.minPrice ?? undefined,
    maxPrice: values.maxPrice ?? undefined,
    inStock: values.inStock || undefined,
    isFeatured: values.isFeatured || undefined,
    sortBy: values.sortBy,
    sortOrder: values.sortOrder,
  };
}

const SORT_OPTIONS: SelectOption[] = Object.entries(CAROUSEL_SORT_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const SORT_ORDER_OPTIONS: SelectOption[] = Object.entries(CAROUSEL_SORT_ORDER_LABEL).map(
  ([value, label]) => ({ label, value }),
);

const TYPE_OPTIONS: SelectOption[] = Object.entries(PRODUCT_TYPE_LABEL).map(
  ([value, label]) => ({ label, value }),
);

interface CarouselFormModalProps {
  open: boolean;
  /** `undefined` = tạo mới */
  carousel?: Carousel;
  categoryOptions: SelectOption[];
  brandOptions: SelectOption[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Tạo/sửa carousel. Điểm khác các form CRUD khác trong repo: admin không chọn
 * tay từng sản phẩm mà đặt bộ lọc, nên form kèm luôn khung **xem thử** gọi
 * `GET /products` với đúng bộ lọc đó — thấy ngay carousel sẽ ra hàng nào trước
 * khi lưu, thay vì phải mở storefront kiểm tra.
 */
export function CarouselFormModal({
  open,
  carousel,
  categoryOptions,
  brandOptions,
  onClose,
  onSaved,
}: CarouselFormModalProps) {
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{ items: Product[]; total: number }>();
  const [previewing, setPreviewing] = useState(false);

  const { control, handleSubmit, reset, getValues } = useForm<CarouselFormValues>({
    defaultValues: EMPTY_FORM,
  });

  // Nạp lại form mỗi lần mở hoặc đổi record đang sửa.
  const openKey = open ? (carousel?.id ?? "new") : undefined;
  useEffect(() => {
    if (!openKey) return;
    queueMicrotask(() => {
      setPreview(undefined);
      reset(carousel ? toFormValues(carousel) : EMPTY_FORM);
    });
  }, [carousel, openKey, reset]);

  const filterValues = useWatch({ control });
  const filterQuery = carouselFilterToQuery(toFilter({ ...EMPTY_FORM, ...filterValues }));

  const loadPreview = useCallback(async () => {
    const values = getValues();
    setPreviewing(true);
    try {
      const response = await previewCarouselFilter(toFilter(values), {
        page: 1,
        limit: values.itemLimit || CAROUSEL_DEFAULT_LIMIT,
      });
      setPreview({ items: response.data, total: response.total });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được sản phẩm xem thử");
    } finally {
      setPreviewing(false);
    }
  }, [getValues, message]);

  // Mở form sửa thì nạp sẵn kết quả; form tạo mới để trống cho tới khi bấm xem thử
  useEffect(() => {
    if (open && carousel) queueMicrotask(() => void loadPreview());
  }, [carousel, loadPreview, open]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        subtitle: values.subtitle || undefined,
        description: values.description || undefined,
        imageUrl: values.imageUrl || undefined,
        filters: toFilter(values),
        itemLimit: values.itemLimit,
        sortOrder: values.displaySortOrder,
        isActive: values.isActive,
      };

      if (carousel) {
        await updateCarousel(carousel.id, payload);
      } else {
        await createCarousel(payload);
      }

      message.success(carousel ? `Đã cập nhật ${values.name}` : "Đã tạo carousel mới");
      onSaved();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không lưu được carousel");
    } finally {
      setSubmitting(false);
    }
  });

  const viewAllUrl = carouselViewAllUrl(filterQuery);

  const copyQuery = async () => {
    try {
      await navigator.clipboard.writeText(viewAllUrl);
      message.success("Đã copy link xem tất cả");
    } catch {
      message.error("Trình duyệt không cho phép copy tự động");
    }
  };

  return (
    <Modal
      title={carousel ? `Chỉnh sửa ${carousel.name}` : "Tạo carousel"}
      open={open}
      onCancel={onClose}
      onOk={onSubmit}
      okText={carousel ? "Lưu" : "Tạo carousel"}
      cancelText="Huỷ"
      confirmLoading={submitting}
      destroyOnHidden
      width="min(1040px, calc(100vw - 32px))"
      style={{ top: 20, paddingBottom: 20 }}
      styles={{
        content: {
          overflow: "hidden",
          padding: 0,
        },
        header: {
          marginBottom: 0,
          padding: "24px 56px 6px 24px",
        },
        body: {
          maxHeight: "calc(100vh - 180px)",
          overflowY: "auto",
          padding: "8px 0 16px 24px",
        },
        footer: {
          borderTop: "1px solid var(--border-base)",
          marginTop: 0,
          padding: "16px 24px 24px",
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4 pr-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-3">
          <section className="space-y-3">
            <h4 className="text-fg font-semibold">Thông tin chung</h4>

            <TextField
              name="name"
              control={control}
              label="Tên carousel"
              required
              placeholder="VD: Sản phẩm nổi bật"
              rules={{ required: "Vui lòng nhập tên carousel" }}
            />
            <TextField
              name="slug"
              control={control}
              label="Slug"
              placeholder="san-pham-noi-bat"
              helpText="Storefront gọi GET /carousels/{slug}/products. Bỏ trống để backend tự sinh từ tên."
            />
            <TextAreaField
              name="subtitle"
              control={control}
              label="Phụ đề"
              rows={2}
              maxLength={255}
              helpText="Dòng mô tả ngắn hiển thị cạnh tiêu đề carousel."
            />
            <TextAreaField
              name="description"
              control={control}
              label="Mô tả"
              rows={3}
              helpText="Mô tả dài hiển thị ở đầu trang PLP của carousel."
            />
            <TextField
              name="imageUrl"
              control={control}
              label="Ảnh banner"
              placeholder="https://..."
              helpText="URL ảnh banner của carousel."
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                name="itemLimit"
                control={control}
                label="Số sản phẩm trang chủ"
                type="number"
                min={1}
                max={CAROUSEL_MAX_LIMIT}
                rules={{
                  required: "Vui lòng nhập số sản phẩm",
                  min: { value: 1, message: "Tối thiểu 1 sản phẩm" },
                  max: {
                    value: CAROUSEL_MAX_LIMIT,
                    message: `Tối đa ${CAROUSEL_MAX_LIMIT} sản phẩm`,
                  },
                }}
              />
              <TextField
                name="displaySortOrder"
                control={control}
                label="Thứ tự"
                type="number"
                min={0}
                helpText="Nhỏ đứng trước"
              />
            </div>

            <SwitchField
              name="isActive"
              control={control}
              label="Hiển thị trên storefront"
              helpText="Tắt thì API trả 404 và client ẩn khối carousel này."
            />
          </section>

          <section className="space-y-3">
            <h4 className="text-fg font-semibold">Bộ lọc sản phẩm</h4>

            <SelectField
              name="categoryId"
              control={control}
              label="Danh mục"
              options={categoryOptions}
              placeholder="Tất cả danh mục"
            />
            <CheckboxField
              name="includeSubCategories"
              control={control}
              text="Lấy cả sản phẩm của danh mục con"
            />
            <SelectField
              name="brandId"
              control={control}
              label="Thương hiệu"
              options={brandOptions}
              placeholder="Tất cả thương hiệu"
            />
            <SelectField
              name="productType"
              control={control}
              label="Loại sản phẩm"
              options={TYPE_OPTIONS}
              placeholder="Tất cả loại"
            />

            <div className="grid grid-cols-2 gap-3">
              <CurrencyField name="minPrice" control={control} label="Giá từ" />
              <CurrencyField name="maxPrice" control={control} label="Giá đến" />
            </div>

            <TextField
              name="search"
              control={control}
              label="Từ khoá"
              placeholder="VD: gaming"
              helpText="Lọc theo tên/mô tả sản phẩm, để trống nếu không cần."
            />

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <CheckboxField name="inStock" control={control} text="Chỉ lấy hàng còn tồn" />
              <CheckboxField name="isFeatured" control={control} text="Chỉ lấy sản phẩm nổi bật" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                name="sortBy"
                control={control}
                label="Sắp xếp theo"
                options={SORT_OPTIONS}
                allowClear={false}
              />
              <SelectField
                name="sortOrder"
                control={control}
                label="Thứ tự"
                options={SORT_ORDER_OPTIONS}
                allowClear={false}
              />
            </div>
          </section>
        </div>

        <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <section className="border-line bg-subtle space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-fg font-semibold">Link “Xem tất cả”</h4>
              <div className="flex gap-1">
                <Tooltip title="Copy link">
                  <Button size="small" icon={<Copy size={14} />} onClick={copyQuery} />
                </Tooltip>
                <Tooltip title="Mở thử trang danh sách">
                  <Button
                    size="small"
                    icon={<ExternalLink size={14} />}
                    href={viewAllUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                </Tooltip>
              </div>
            </div>
            <code className="text-muted block break-all text-xs">{viewAllUrl}</code>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-fg font-semibold">Xem thử sản phẩm</h4>
              <Button
                size="small"
                icon={<RefreshCw size={14} />}
                loading={previewing}
                onClick={() => void loadPreview()}
              >
                Xem thử
              </Button>
            </div>

            {preview ? (
              <>
                <p className="text-muted text-xs">
                  Bộ lọc khớp {formatNumber(preview.total)} sản phẩm đang bán — carousel lấy{" "}
                  {preview.items.length} sản phẩm đầu tiên.
                </p>

                {preview.total === 0 && (
                  <p className="text-warning text-xs">
                    Không có sản phẩm nào khớp. Carousel sẽ rỗng trên storefront.
                  </p>
                )}

                <ul className="border-line max-h-[300px] divide-y overflow-auto rounded-lg border lg:max-h-[calc(100vh-440px)]">
                  {preview.items.map((product, index) => (
                    <li key={product.id} className="flex items-center gap-3 p-2">
                      <span className="text-muted w-5 shrink-0 text-center text-xs">
                        {index + 1}
                      </span>
                      <div className="bg-subtle relative h-12 w-12 shrink-0 overflow-hidden rounded">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt=""
                            fill
                            unoptimized
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted flex h-full w-full items-center justify-center">
                            <ImageOff size={16} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-fg truncate text-sm">{product.name}</p>
                        <p className="text-muted truncate text-xs">
                          {product.brandName || "—"}
                          {product.minPrice !== undefined
                            ? ` · ${formatCurrency(product.minPrice)}`
                            : ""}
                        </p>
                      </div>
                      {product.isFeatured && <Tag color="gold">Nổi bật</Tag>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted text-sm">
                Bấm “Xem thử” để kiểm tra bộ lọc trước khi lưu.
              </p>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}

export default CarouselFormModal;
