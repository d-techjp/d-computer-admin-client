"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { App, Empty, Input, Modal, Spin, Tag } from "antd";
import { Check, ImageOff, Search } from "lucide-react";

import { listProducts } from "@/lib/api/products";
import { listProductVariants } from "@/lib/api/variants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { defaultVariantOf, type Product } from "@/types/product";
import type { ProductVariant } from "@/types/variant";

export interface PickedVariant {
  variant: ProductVariant;
  productName: string;
  thumbnail?: string;
}

interface VariantPickerModalProps {
  open: boolean;
  /** Biến thể đã có trong combo + chính biến thể combo — không cho chọn lại */
  excludeVariantIds: string[];
  onClose: () => void;
  onPick: (picked: PickedVariant) => void;
}

/**
 * Chọn một biến thể để làm thành phần combo.
 *
 * Contract **không có endpoint tìm kiếm biến thể toàn cục** — chỉ có
 * `GET /products` và `GET /products/{id}/variants` — nên picker buộc phải đi
 * hai cấp: tìm sản phẩm trước, rồi mới nạp biến thể của nó. Danh sách sản phẩm
 * lọc sẵn `productType=standard` để loại luôn khả năng combo lồng combo, vốn
 * bị backend từ chối.
 */
export function VariantPickerModal({
  open,
  excludeVariantIds,
  onClose,
  onPick,
}: VariantPickerModalProps) {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selected, setSelected] = useState<Product>();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const searchProducts = useCallback(
    async (search: string) => {
      setLoadingProducts(true);
      try {
        const response = await listProducts({
          page: 1,
          limit: 20,
          search,
          productType: "standard",
          sortBy: "name",
          sortOrder: "ASC",
        });
        setProducts(response.data);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "Không tìm được sản phẩm");
      } finally {
        setLoadingProducts(false);
      }
    },
    [message],
  );

  // Làm sạch lựa chọn cũ ngay trong lúc render; việc gọi API để trong effect
  // vì đó mới thực sự là tương tác với hệ thống bên ngoài.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setKeyword("");
      setSelected(undefined);
      setVariants([]);
    }
  }

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => void searchProducts(""));
  }, [open, searchProducts]);

  const selectProduct = async (product: Product) => {
    setSelected(product);

    // Sản phẩm một phiên bản đã có sẵn biến thể mặc định trong response danh sách
    if (!product.hasVariants && product.variants.length > 0) {
      setVariants(product.variants);
      return;
    }

    setLoadingVariants(true);
    try {
      setVariants(await listProductVariants(product.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không tải được phiên bản");
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  const pick = (variant: ProductVariant) => {
    if (!selected) return;
    onPick({
      variant,
      productName: selected.name,
      thumbnail: variant.thumbnail ?? selected.thumbnail ?? selected.images[0],
    });
    onClose();
  };

  return (
    <Modal
      title="Chọn thành phần"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={840}
    >
      <div className="space-y-3 pt-2">
        <Input
          allowClear
          value={keyword}
          prefix={<Search size={16} className="text-muted" />}
          placeholder="Tìm theo tên sản phẩm hoặc SKU"
          onChange={(event) => setKeyword(event.target.value)}
          onPressEnter={() => void searchProducts(keyword)}
        />
        <p className="text-muted text-xs">
          Chỉ hiển thị hàng hoá thường — combo không được chứa combo khác.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border-line overflow-hidden rounded-lg border bg-card">
            <div className="border-line bg-subtle flex items-center justify-between border-b px-3 py-2.5">
              <span className="text-fg text-sm font-semibold">Sản phẩm</span>
              <span className="text-muted text-xs">Chọn để xem phiên bản</span>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto p-2">
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : products.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không có sản phẩm phù hợp"
                  className="py-6"
                />
              ) : (
                products.map((product) => {
                  const thumbnail = product.thumbnail ?? product.images[0];
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => void selectProduct(product)}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-left transition",
                        selected?.id === product.id
                          ? "border-brand bg-brand/5 shadow-sm"
                          : "border-transparent hover:border-line hover:bg-subtle",
                      )}
                    >
                      <div className="bg-subtle border-line relative h-11 w-11 shrink-0 overflow-hidden rounded-md border">
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={product.name}
                            fill
                            unoptimized
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted flex h-full items-center justify-center">
                            <ImageOff size={16} />
                          </span>
                        )}
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="text-muted mt-1 block text-xs">
                          {product.hasVariants
                            ? `${product.variants.length} phiên bản`
                            : (defaultVariantOf(product)?.sku ?? "—")}
                        </span>
                      </span>
                      {selected?.id === product.id && (
                        <span className="bg-brand text-inverse flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                          <Check size={13} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-line overflow-hidden rounded-lg border bg-card">
            <div className="border-line bg-subtle border-b px-3 py-2.5">
              <span className="text-fg block truncate text-sm font-semibold">
                {selected ? `Phiên bản của ${selected.name}` : "Chọn sản phẩm ở cột bên trái"}
              </span>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto p-2">
              {loadingVariants ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : !selected ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chưa chọn sản phẩm"
                  className="py-6"
                />
              ) : variants.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Sản phẩm chưa có phiên bản"
                  className="py-6"
                />
              ) : (
                variants.map((variant) => {
                  const excluded = excludeVariantIds.includes(variant.id);
                  const thumbnail = variant.thumbnail ?? selected.thumbnail ?? selected.images[0];
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={excluded}
                      onClick={() => pick(variant)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-left transition",
                        excluded
                          ? "cursor-not-allowed border-transparent bg-subtle/60 opacity-60"
                          : "border-transparent hover:border-brand/40 hover:bg-brand/5",
                      )}
                    >
                      <span className="bg-subtle border-line relative h-11 w-11 shrink-0 overflow-hidden rounded-md border">
                        {thumbnail ? (
                          <Image
                            src={thumbnail}
                            alt={variant.name}
                            fill
                            unoptimized
                            sizes="44px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-muted flex h-full items-center justify-center">
                            <ImageOff size={16} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{variant.name}</span>
                        <span className="border-line text-muted mt-1 inline-flex rounded border bg-card px-1.5 py-0.5 font-mono text-[11px]">
                          {variant.sku}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="text-fg block text-sm font-semibold">
                          {formatCurrency(variant.price)}
                        </span>
                        {excluded ? (
                          <Tag color="default" className="m-0 mt-1">
                            Đã thêm
                          </Tag>
                        ) : (
                          <span
                            className={cn(
                              "text-muted mt-1 block text-xs",
                              variant.stock <= 0 && "text-danger font-medium",
                            )}
                          >
                            Tồn {formatNumber(variant.stock)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default VariantPickerModal;
