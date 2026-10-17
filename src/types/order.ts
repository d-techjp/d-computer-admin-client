export type OrderStatus =
  | "awaiting_payment"
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type PaymentMethod =
  | "cod"
  | "bank_transfer"
  | "credit_card"
  | "e_wallet"
  | "stripe"
  | "stripe_terminal"
  | "cash";

/** `in_store`: nhân viên lên đơn tại quầy (màn POS) — không giao hàng, trả tiền xong là hoàn tất. */
export type OrderChannel = "online" | "in_store";

export interface OrderItem {
  id: string;
  productId?: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  ward?: string;
  district?: string;
  province: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  shippingAddressDetail?: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  channel: OrderChannel;
  note?: string;
  /** Thời điểm Stripe xác nhận đã nhận tiền (chỉ đơn thanh toán online). */
  paidAt?: string;
  stripeCheckoutSessionId?: string;
  /** Mở giao dịch trên Stripe Dashboard — hoàn tiền làm ở đó. */
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Chờ thanh toán",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
  refunded: "Đã hoàn tiền",
};

/** Các trạng thái được backend cho phép chuyển trực tiếp từ trạng thái hiện tại. */
export const ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  // Sang "pending" chỉ do webhook Stripe làm khi tiền về (kèm trừ kho) — không bấm tay được.
  awaiting_payment: ["cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
  failed: "Thanh toán lỗi",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cod: "Thanh toán khi nhận",
  bank_transfer: "Chuyển khoản",
  credit_card: "Thẻ tín dụng",
  e_wallet: "Ví điện tử",
  stripe: "Thẻ / PayPay (Stripe)",
  stripe_terminal: "Quẹt thẻ tại quầy (POS)",
  cash: "Tiền mặt",
};

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  online: "Đặt trên web",
  in_store: "Tại quầy",
};

/**
 * Gốc Stripe Dashboard để mở giao dịch. Mặc định là chế độ test — production đặt
 * `NEXT_PUBLIC_STRIPE_DASHBOARD_URL=https://dashboard.stripe.com`.
 */
const STRIPE_DASHBOARD_URL = (
  process.env.NEXT_PUBLIC_STRIPE_DASHBOARD_URL ??
  "https://dashboard.stripe.com/test"
).replace(/\/+$/, "");

export function stripePaymentUrl(paymentIntentId: string): string {
  return `${STRIPE_DASHBOARD_URL}/payments/${encodeURIComponent(paymentIntentId)}`;
}
