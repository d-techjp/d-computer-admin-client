"use client";

import Link from "next/link";

import routes from "@/config/routes";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardTopProduct } from "@/types/dashboard";

import { DashboardPanel } from "./DashboardPanel";

/**
 * Danh sách xếp hạng thay cho biểu đồ cột ngang: tên sản phẩm (thường rất dài,
 * kiểu "Combo Dell Vostro 3520 + chuột…") đọc được trọn vẹn, số tiền in thẳng
 * ra chứ không phải dò theo trục. Thanh mảnh bên dưới chỉ để so độ lớn với
 * sản phẩm dẫn đầu — một màu duy nhất vì đây là độ lớn, không phải danh tính.
 */
export function TopProductsPanel({
  products,
  loading,
  className,
}: {
  products: DashboardTopProduct[];
  loading?: boolean;
  className?: string;
}) {
  const maxRevenue = Math.max(0, ...products.map((product) => product.revenue));

  return (
    <DashboardPanel
      title="Sản phẩm bán chạy"
      description="Xếp theo doanh thu trong khoảng thời gian đã chọn"
      loading={loading}
      isEmpty={products.length === 0}
      className={className}
    >
      <ol className="divide-line divide-y">
        {products.map((product, index) => {
          const share = maxRevenue > 0 ? (product.revenue / maxRevenue) * 100 : 0;

          return (
            <li
              key={product.productId ?? `${product.productName}-${index}`}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                  index < 3 ? "bg-brand-soft text-brand" : "bg-subtle text-muted",
                )}
              >
                {index + 1}
              </span>

              <div className="min-w-0">
                {product.productId ? (
                  <Link
                    href={routes.products.detail(product.productId)}
                    title={product.productName}
                    className="text-fg hover:text-brand line-clamp-2 text-sm leading-5 font-medium"
                  >
                    {product.productName}
                  </Link>
                ) : (
                  <span
                    title={`${product.productName} (đã xoá)`}
                    className="text-fg line-clamp-2 text-sm leading-5 font-medium"
                  >
                    {product.productName}
                  </span>
                )}
                <div
                  className="bg-subtle mt-2 h-1.5 overflow-hidden rounded-full"
                  role="presentation"
                >
                  <div
                    className="bg-brand h-full rounded-full"
                    style={{ width: `${Math.max(share, 2)}%` }}
                  />
                </div>
              </div>

              <div className="text-right">
                <p className="text-fg text-sm font-semibold whitespace-nowrap tabular-nums">
                  {formatCurrency(product.revenue)}
                </p>
                <p className="text-muted mt-0.5 text-xs whitespace-nowrap">
                  Đã bán {formatNumber(product.quantity)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </DashboardPanel>
  );
}
