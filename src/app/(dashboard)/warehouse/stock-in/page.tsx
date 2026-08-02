import { stockInMovements } from "@/mock/warehouse";

import { StockMovementPage } from "../StockMovementPage";

export default function StockInPage() {
  return (
    <StockMovementPage
      type="in"
      source={stockInMovements}
      title="Phiếu nhập kho"
      description="Lịch sử nhập hàng từ nhà cung cấp vào kho"
      partnerLabel="Nhà cung cấp"
    />
  );
}
