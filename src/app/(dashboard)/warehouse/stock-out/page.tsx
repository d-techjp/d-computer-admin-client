import { InventoryLedgerPage } from "../_components/InventoryLedgerPage";

export default function StockOutPage() {
  return (
    <InventoryLedgerPage
      type="out"
      title="Xuất kho"
      description="Lịch sử giảm tồn: bán theo đơn, hàng lỗi, thất thoát, điều chỉnh kiểm kê"
    />
  );
}
