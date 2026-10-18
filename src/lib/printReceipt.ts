/**
 * In bill khổ 80mm (máy in nhiệt) bằng hộp thoại in của trình duyệt.
 *
 * Dựng HTML riêng trong một iframe ẩn rồi gọi `print()` trên iframe đó: không
 * dính layout/CSS của admin (sidebar, antd), không cần mở tab mới (tab mới
 * không có token đăng nhập). Trong hộp thoại in chọn máy in bill, khổ giấy
 * 80mm, lề "Không có".
 */
import { fetchOrderReceipt, type OrderReceipt } from "@/lib/api/orders";
import type { OrderItem, PaymentMethod } from "@/types/order";

/** Bill in cho khách Nhật — nhãn phương thức thanh toán bằng tiếng Nhật */
const PAYMENT_LABEL_JA: Record<PaymentMethod, string> = {
  cod: "代金引換",
  bank_transfer: "銀行振込",
  credit_card: "クレジットカード",
  e_wallet: "電子マネー",
  stripe: "クレジットカード / PayPay",
  stripe_terminal: "クレジットカード",
  cash: "現金",
};

const yen = new Intl.NumberFormat("ja-JP");
const formatYen = (amount: number) => `¥${yen.format(Math.round(amount))}`;

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string, className = "") {
  return `<div class="row ${className}"><span>${label}</span><span>${value}</span></div>`;
}

function itemsHtml(items: OrderItem[]) {
  const children = (parentId: string) =>
    items.filter((item) => item.parentItemId === parentId);

  return items
    .filter((item) => !item.parentItemId)
    .map((item) => {
      const name =
        item.variantName && item.variantName !== item.productName
          ? `${item.productName} ${item.variantName}`
          : item.productName;
      const components = children(item.id)
        .map(
          (child) =>
            `<div class="sub">・${escapeHtml(child.productName)} ×${child.quantity}</div>`,
        )
        .join("");
      return `
        <div class="item">
          <div>${escapeHtml(name)}</div>
          ${components}
          ${row(`&nbsp;&nbsp;${formatYen(item.price)} × ${item.quantity}`, formatYen(item.total))}
        </div>`;
    })
    .join("");
}

export interface ReceiptExtras {
  /** Tiền mặt khách đưa — có thì in お預り / お釣り */
  cashReceived?: number;
}

export function buildReceiptHtml(
  { shop, order, taxLines }: OrderReceipt,
  extras: ReceiptExtras = {},
) {
  const itemCount = order.items
    .filter((item) => !item.parentItemId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const cashChange =
    order.paymentMethod === "cash" && extras.cashReceived !== undefined
      ? extras.cashReceived - order.total
      : undefined;

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${escapeHtml(order.code)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 80mm;
    padding: 4mm 4mm 8mm;
    font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", Meiryo, sans-serif;
    font-size: 11.5px;
    line-height: 1.45;
    color: #000;
  }
  .center { text-align: center; }
  .shop { font-size: 17px; font-weight: 700; }
  .muted { font-size: 10.5px; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row span:last-child { white-space: nowrap; text-align: right; }
  .item { margin-bottom: 4px; word-break: break-all; }
  .sub { padding-left: 1em; font-size: 10.5px; }
  .total { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .bold { font-weight: 700; }
</style>
</head>
<body>
  <div class="center">
    <div class="shop">${escapeHtml(shop.name)}</div>
    ${shop.address ? `<div class="muted">${escapeHtml(shop.address)}</div>` : ""}
    ${shop.phone ? `<div class="muted">TEL ${escapeHtml(shop.phone)}</div>` : ""}
    ${
      shop.invoiceRegistrationNumber
        ? `<div class="muted">登録番号 ${escapeHtml(shop.invoiceRegistrationNumber)}</div>`
        : ""
    }
  </div>

  <div class="hr"></div>
  <div>${escapeHtml(dateFormatter.format(new Date(order.paidAt ?? order.createdAt)))}</div>
  <div>注文番号 ${escapeHtml(order.code)}</div>
  <div class="hr"></div>

  ${itemsHtml(order.items)}

  <div class="hr"></div>
  ${row(`小計（${itemCount}点）`, formatYen(order.subtotal))}
  ${order.discount > 0 ? row("値引", `-${formatYen(order.discount)}`) : ""}
  ${order.shippingFee > 0 ? row("送料", formatYen(order.shippingFee)) : ""}
  ${row("合計", formatYen(order.total), "total")}
  ${taxLines
    .map((line) =>
      row(
        `（${line.rate}%対象 ${formatYen(line.taxableAmount)}）`,
        `内消費税 ${formatYen(line.taxAmount)}`,
        "muted",
      ),
    )
    .join("")}

  <div class="hr"></div>
  ${row("お支払", PAYMENT_LABEL_JA[order.paymentMethod])}
  ${
    cashChange !== undefined
      ? row("お預り", formatYen(extras.cashReceived ?? 0)) +
        row("お釣り", formatYen(cashChange), "bold")
      : ""
  }

  <div class="hr"></div>
  <div class="center">ご来店ありがとうございました</div>
</body>
</html>`;
}

/** Thời gian tối đa giữ iframe nếu trình duyệt không bắn `afterprint` */
const CLEANUP_TIMEOUT_MS = 60_000;

function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  });
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!frameWindow || !doc) {
    iframe.remove();
    throw new Error("Trình duyệt không cho mở khung in");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => iframe.remove();
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, CLEANUP_TIMEOUT_MS);

  // Chờ font tiếng Nhật sẵn sàng, không thì bản in đầu tiên có thể dùng font dự phòng
  void doc.fonts.ready.then(() => {
    frameWindow.focus();
    frameWindow.print();
  });
}

export async function printOrderReceipt(
  orderId: string,
  extras?: ReceiptExtras,
) {
  const receipt = await fetchOrderReceipt(orderId);
  printHtml(buildReceiptHtml(receipt, extras));
}
