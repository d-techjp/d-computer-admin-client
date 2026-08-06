"use client";

import { hasSinglePrice, type Product } from "@/types/product";
import { formatCurrency } from "@/lib/utils";

/**
 * Giá của sản phẩm master là **khoảng giá** giữa các biến thể, không còn là
 * một con số. Backend trả sẵn `minPrice`/`maxPrice` denormalized nên trang
 * danh sách không phải nạp biến thể chỉ để hiển thị giá.
 */
export function PriceRangeText({
  product,
}: {
  product: Pick<Product, "minPrice" | "maxPrice">;
}) {
  if (product.minPrice === undefined) return <span className="text-muted">—</span>;

  if (hasSinglePrice(product)) return <>{formatCurrency(product.minPrice)}</>;

  return (
    <span className="whitespace-nowrap">
      {formatCurrency(product.minPrice)}
      <span className="text-muted mx-1">–</span>
      {formatCurrency(product.maxPrice ?? product.minPrice)}
    </span>
  );
}

export default PriceRangeText;
