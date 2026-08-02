import { stockOutMovements } from "@/mock/warehouse";

import { StockMovementPage } from "../StockMovementPage";

export default function StockOutPage() {
  return (
    <StockMovementPage
      type="out"
      source={stockOutMovements}
      title="Phiếu xuất kho"
      description="Lịch sử xuất hàng khỏi kho theo đơn, bảo hành hoặc điều chuyển"
      partnerLabel="Lý do xuất"
    />
  );
}
