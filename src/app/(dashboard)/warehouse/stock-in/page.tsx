import { InventoryLedgerPage } from "../_components/InventoryLedgerPage";

export default function StockInPage() {
  return (
    <InventoryLedgerPage
      type="in"
      title="Nhập kho"
      description="Lịch sử tăng tồn: nhập hàng mới, khách trả hàng, hoàn kho khi huỷ đơn"
    />
  );
}
