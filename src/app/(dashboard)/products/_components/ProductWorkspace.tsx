"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Alert, Button, Popconfirm, Skeleton, Tabs } from "antd";
import { Trash2 } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { ProductStatusTag, ProductTypeTag } from "@/components/common/StatusTag";
import routes from "@/config/routes";
import { deleteProduct, fetchProduct } from "@/lib/api/products";
import type { Product } from "@/types/product";
import type { ProductVariant } from "@/types/variant";

import { BundleTab } from "./bundle/BundleTab";
import { DescriptionTab } from "./tabs/DescriptionTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { OptionsTab } from "./options/OptionsTab";
import { VariantsTab } from "./variants/VariantsTab";

type TabKey = "general" | "description" | "variants" | "options" | "bundle";

const DEFAULT_TAB: TabKey = "general";

/**
 * Màn sửa sản phẩm.
 *
 * Chia tab thay vì một form dài vì master / biến thể / option / combo là bốn
 * API riêng, hai permission riêng (`product.manage` và `inventory.manage`) và
 * không có transaction chung — gom vào một nút "Lưu" sẽ phải bắn N request rồi
 * không có cách nào rollback tử tế khi request thứ k thất bại. Mỗi tab tự lưu,
 * tự giữ trạng thái "chưa lưu" của riêng nó.
 *
 * Tab lưu ở query param để giữ nguyên một lần `GET /products/:id` (đã kèm
 * `variants` + `options`) khi chuyển qua lại.
 */
export function ProductWorkspace({ productId }: { productId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  const [product, setProduct] = useState<Product>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await fetchProduct(productId);
      setProduct(next);
      setNotFound(false);
    } catch (error) {
      setNotFound(true);
      message.error(error instanceof Error ? error.message : "Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [message, productId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const activeTab = (searchParams.get("tab") as TabKey | null) ?? DEFAULT_TAB;

  const setTab = (key: string) => {
    // `replace` để nút Back của trình duyệt không phải đi ngược qua từng tab
    router.replace(`${routes.products.detail(productId)}?tab=${key}`, { scroll: false });
  };

  /** Biến thể vừa đổi ở tab con — cập nhật tại chỗ để các tab khác thấy ngay */
  const applyVariants = useCallback((variants: ProductVariant[]) => {
    setProduct((current) =>
      current
        ? {
            ...current,
            variants,
            hasVariants: variants.length > 1,
            totalStock: variants.reduce((sum, variant) => sum + variant.stock, 0),
            minPrice: variants.length
              ? Math.min(...variants.map((variant) => variant.price))
              : undefined,
            maxPrice: variants.length
              ? Math.max(...variants.map((variant) => variant.price))
              : undefined,
          }
        : current,
    );
  }, []);

  const handleDelete = async () => {
    try {
      await deleteProduct(productId);
      message.success("Đã xoá sản phẩm");
      router.push(routes.products.index);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không xoá được sản phẩm");
    }
  };

  const tabItems = useMemo(() => {
    if (!product) return [];

    const items = [
      {
        key: "general",
        label: "Thông tin chung",
        children: <GeneralTab product={product} onSaved={setProduct} />,
      },
      {
        key: "description",
        label: "Mô tả chi tiết",
        children: <DescriptionTab productId={product.id} />,
      },
      {
        key: "variants",
        // Sản phẩm một phiên bản thì admin không cần biết chữ "phiên bản"
        label: product.hasVariants ? "Phiên bản & kho" : "Giá & kho",
        children: (
          <VariantsTab product={product} onVariantsChange={applyVariants} onReload={load} />
        ),
      },
    ];

    if (product.productType === "standard") {
      items.push({
        key: "options",
        label: "Trục biến thể",
        children: <OptionsTab product={product} onReload={load} />,
      });
    }

    if (product.productType === "bundle") {
      items.push({
        key: "bundle",
        label: "Thành phần combo",
        children: <BundleTab product={product} />,
      });
    }

    return items;
  }, [applyVariants, load, product]);

  if (loading) {
    return (
      <div className="bg-card border-line shadow-card rounded-lg border p-6">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tìm thấy sản phẩm"
        description="Sản phẩm có thể đã bị xoá hoặc bạn không có quyền truy cập."
        action={
          <Button onClick={() => router.push(routes.products.index)}>Về danh sách</Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        breadcrumb={[
          { label: "Quản lý sản phẩm", href: routes.products.index },
          { label: product.name },
        ]}
        extra={
          <Popconfirm
            title="Xoá sản phẩm này?"
            description="Xoá mềm, kéo theo toàn bộ biến thể."
            okText="Xoá"
            cancelText="Huỷ"
            okButtonProps={{ danger: true }}
            onConfirm={handleDelete}
          >
            <Button danger icon={<Trash2 size={16} />}>
              Xoá sản phẩm
            </Button>
          </Popconfirm>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ProductTypeTag type={product.productType} />
        <ProductStatusTag status={product.status} />
        <span className="text-muted text-sm">
          {product.categoryName || "Chưa có danh mục"}
          {product.brandName ? ` · ${product.brandName}` : ""}
        </span>
      </div>

      <Tabs activeKey={activeTab} onChange={setTab} items={tabItems} destroyOnHidden={false} />
    </>
  );
}

export default ProductWorkspace;
