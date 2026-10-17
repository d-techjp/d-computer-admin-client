"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  App,
  AutoComplete,
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Result,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  Banknote,
  ChevronUp,
  CreditCard,
  Landmark,
  ImageOff,
  Mail,
  Minus,
  Pencil,
  Percent,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import routes from "@/config/routes";
import {
  cancelPosCollect,
  cancelPosOrder,
  collectPosPayment,
  createPosOrder,
  fetchPosPayment,
  listPosReaders,
  searchPosCustomers,
  simulatePosTap,
  TEST_CARDS,
  type PosCustomer,
  type PosPayment,
  type PosPaymentMethod,
  type PosReaders,
} from "@/lib/api/pos";
import { listProducts } from "@/lib/api/products";
import { cn, formatCurrency } from "@/lib/utils";

/** Một dòng có thể bán: biến thể đang bật của sản phẩm đang bán */
interface SellableVariant {
  variantId: string;
  productName: string;
  /** Tên biến thể; rỗng khi sản phẩm không có biến thể */
  variantName?: string;
  sku: string;
  thumbnail?: string;
  price: number;
  stock: number;
  trackInventory: boolean;
}

interface CartLine extends SellableVariant {
  quantity: number;
}

type DiscountMode = "amount" | "percent";

const POLL_INTERVAL_MS = 1500;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_PHONE_DIGITS = 3;
const DISCOUNT_PRESETS: Array<{
  label: string;
  mode: DiscountMode;
  value: number;
}> = [
  { label: "5%", mode: "percent", value: 5 },
  { label: "10%", mode: "percent", value: 10 },
  { label: "¥500", mode: "amount", value: 500 },
  { label: "¥1,000", mode: "amount", value: 1000 },
];

const PAY_METHOD_OPTIONS: Array<{
  value: PosPaymentMethod;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "stripe_terminal",
    label: "Máy POS",
    icon: <CreditCard size={14} />,
  },
  { value: "cash", label: "Tiền mặt", icon: <Banknote size={14} /> },
  {
    value: "bank_transfer",
    label: "Chuyển khoản",
    icon: <Landmark size={14} />,
  },
];

/** Gợi ý số tiền khách đưa: vừa đủ, rồi làm tròn lên các mệnh giá tiền giấy */
function cashSuggestions(total: number): number[] {
  if (total <= 0) return [];
  const rounded = [1000, 5000, 10000].map(
    (unit) => Math.ceil(total / unit) * unit,
  );
  return [...new Set([total, ...rounded])].sort((a, b) => a - b).slice(0, 3);
}

const FIT_BREAKPOINT = "(min-width: 1280px)";
/** Chừa đáy trang (padding của `main`) */
const FIT_BOTTOM_GAP = 24;
/** Màn hình quá thấp thì thôi ép, để trang cuộn như bình thường */
const FIT_MIN_HEIGHT = 560;

/**
 * Chiều cao để khối bán hàng vừa khít phần còn lại của màn hình (chỉ trên màn
 * rộng) — nút thanh toán luôn nằm trong tầm mắt, không phải cuộn trang tìm.
 */
function useFitHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const media = window.matchMedia(FIT_BREAKPOINT);
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = ref.current;
        if (!element || !media.matches) {
          setHeight(undefined);
          return;
        }
        const top = element.getBoundingClientRect().top + window.scrollY;
        setHeight(
          Math.max(FIT_MIN_HEIGHT, window.innerHeight - top - FIT_BOTTOM_GAP),
        );
      });
    };

    update();
    window.addEventListener("resize", update);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      media.removeEventListener("change", update);
    };
  }, [ref]);

  return height;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function maxQuantity(line: SellableVariant) {
  return line.trackInventory ? line.stock : 999;
}

function isSoldOut(variant: SellableVariant) {
  return variant.trackInventory && variant.stock <= 0;
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function lineName(line: SellableVariant) {
  return line.variantName
    ? `${line.productName} - ${line.variantName}`
    : line.productName;
}

export default function PosPage() {
  const { message, modal } = App.useApp();

  // --- Tìm sản phẩm -------------------------------------------------------
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SellableVariant[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(
    async (value: string) => {
      setSearching(true);
      try {
        const response = await listProducts({
          page: 1,
          limit: 24,
          search: value || undefined,
          status: "active",
        });
        setResults(
          response.data.flatMap((product) =>
            product.variants
              .filter((variant) => variant.isActive)
              .map((variant) => ({
                variantId: variant.id,
                productName: product.name,
                variantName:
                  variant.name && variant.name !== product.name
                    ? variant.name
                    : undefined,
                sku: variant.sku,
                thumbnail:
                  variant.thumbnail ?? product.thumbnail ?? product.images[0],
                price: variant.price,
                stock: variant.stock,
                trackInventory: variant.trackInventory,
              })),
          ),
        );
      } catch (error) {
        message.error(errorMessage(error, "Không tìm được sản phẩm"));
      } finally {
        setSearching(false);
      }
    },
    [message],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => void search(keyword.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [keyword, search]);

  // --- Giỏ tại quầy -------------------------------------------------------
  const [cart, setCart] = useState<CartLine[]>([]);

  const quantityInCart = useMemo(
    () => new Map(cart.map((line) => [line.variantId, line.quantity])),
    [cart],
  );
  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );

  const addToCart = (variant: SellableVariant) => {
    setCart((lines) => {
      const existing = lines.find(
        (line) => line.variantId === variant.variantId,
      );
      if (!existing) return [...lines, { ...variant, quantity: 1 }];
      if (existing.quantity >= maxQuantity(existing)) {
        message.warning(
          `"${lineName(variant)}" chỉ còn ${variant.stock} sản phẩm`,
        );
        return lines;
      }
      return lines.map((line) =>
        line.variantId === variant.variantId
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      );
    });
  };

  const setQuantity = (variantId: string, quantity: number) => {
    setCart((lines) =>
      lines
        .map((line) =>
          line.variantId === variantId ? { ...line, quantity } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  };

  // --- Khách hàng ---------------------------------------------------------
  const [customer, setCustomer] = useState<PosCustomer>();
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fetchedSuggestions, setSuggestions] = useState<PosCustomer[]>([]);
  const [lookingUp, setLookingUp] = useState(false);

  const digits = phoneDigits(phone);
  const lookupEnabled = !customer && digits.length >= MIN_PHONE_DIGITS;
  const suggestions = lookupEnabled ? fetchedSuggestions : [];
  const exactMatch = suggestions.find(
    (item) => phoneDigits(item.phone ?? "") === digits,
  );

  useEffect(() => {
    if (!lookupEnabled) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLookingUp(true);
      try {
        const found = await searchPosCustomers(digits);
        if (!cancelled) setSuggestions(found);
      } catch {
        // Gợi ý hỏng không chặn bán hàng — vẫn lên đơn theo số điện thoại được
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [digits, lookupEnabled]);

  const selectCustomer = (selected: PosCustomer) => {
    setCustomer(selected);
    setPhone(selected.phone ?? "");
    setCustomerName(selected.fullName);
    setCustomerEmail(selected.email ?? "");
  };

  const clearCustomer = () => {
    setCustomer(undefined);
    setPhone("");
    setCustomerName("");
    setCustomerEmail("");
  };

  // --- Giảm giá -----------------------------------------------------------
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState<number | null>(null);

  const discount = useMemo(() => {
    const value = discountValue ?? 0;
    if (value <= 0) return 0;
    if (discountMode === "percent")
      return Math.floor((subtotal * Math.min(value, 100)) / 100);
    return Math.min(value, subtotal);
  }, [discountMode, discountValue, subtotal]);
  const total = subtotal - discount;
  const discountCapped =
    discountMode === "amount" &&
    (discountValue ?? 0) > subtotal &&
    subtotal > 0;

  const changeDiscountMode = (mode: DiscountMode) => {
    setDiscountMode(mode);
    setDiscountValue(null);
  };

  // --- Phương thức thanh toán ---------------------------------------------
  const [payMethod, setPayMethod] =
    useState<PosPaymentMethod>("stripe_terminal");
  const [cashReceived, setCashReceived] = useState<number | null>(null);
  const changeDue = (cashReceived ?? 0) - total;
  const cashShort =
    payMethod === "cash" && (cashReceived === null || changeDue < 0);

  const resetSale = () => {
    setCart([]);
    clearCustomer();
    setDiscountValue(null);
    setCashReceived(null);
    void search(keyword.trim()); // tồn kho vừa đổi
  };

  // --- Máy POS ------------------------------------------------------------
  const [readers, setReaders] = useState<PosReaders>();
  const [readerId, setReaderId] = useState<string>();

  useEffect(() => {
    listPosReaders()
      .then((response) => {
        setReaders(response);
        setReaderId(response.defaultReaderId ?? response.readers[0]?.id);
      })
      .catch((error: unknown) =>
        message.error(errorMessage(error, "Không đọc được danh sách máy POS")),
      );
  }, [message]);

  // --- Thanh toán -----------------------------------------------------------
  const [payment, setPayment] = useState<PosPayment>();
  const [paymentError, setPaymentError] = useState<string>();
  const [busy, setBusy] = useState(false);
  /** Dòng phụ trên màn hình thành công, vd tiền thối */
  const [successNote, setSuccessNote] = useState<string>();
  const pollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stopPolling = () => clearTimeout(pollTimer.current);
  useEffect(() => stopPolling, []);

  const waitingForCard =
    payment?.status === "awaiting_payment" &&
    payment.readerAction?.status === "in_progress";

  // Poll khi máy đang chờ khách chạm thẻ
  useEffect(() => {
    if (!payment || !waitingForCard) return;
    pollTimer.current = setTimeout(async () => {
      try {
        setPayment(await fetchPosPayment(payment.orderId, readerId));
      } catch (error) {
        setPaymentError(
          errorMessage(error, "Không đọc được trạng thái thanh toán"),
        );
      }
    }, POLL_INTERVAL_MS);
    return stopPolling;
  }, [payment, waitingForCard, readerId]);

  const run = async (work: () => Promise<PosPayment>, fallback: string) => {
    setBusy(true);
    setPaymentError(undefined);
    try {
      setPayment(await work());
    } catch (error) {
      setPaymentError(errorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const orderPayload = () => ({
    customerId: customer?.id,
    items: cart.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
    })),
    customerName: customerName.trim() || undefined,
    customerPhone: phone.trim() || undefined,
    customerEmail: customerEmail.trim() || undefined,
    discount: discount || undefined,
  });

  /** Tiền mặt / chuyển khoản: nhân viên đã cầm tiền — tạo đơn là xong luôn */
  const completeManualPayment = async (method: "cash" | "bank_transfer") => {
    setBusy(true);
    try {
      const order = await createPosOrder({
        ...orderPayload(),
        paymentMethod: method,
      });
      setSuccessNote(
        method === "cash" && changeDue > 0
          ? `Khách đưa ${formatCurrency(cashReceived ?? 0)} — trả lại ${formatCurrency(changeDue)}`
          : method === "bank_transfer"
            ? "Thanh toán bằng chuyển khoản"
            : undefined,
      );
      setPayment({
        orderId: order.id,
        orderCode: order.code,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
      });
    } catch (error) {
      message.error(errorMessage(error, "Không tạo được đơn"));
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = () => {
    if (payMethod === "cash") {
      void completeManualPayment("cash");
      return;
    }
    if (payMethod === "bank_transfer") {
      modal.confirm({
        title: "Xác nhận đã nhận chuyển khoản?",
        content: `Kiểm tra tài khoản đã nhận đủ ${formatCurrency(total)} rồi mới xác nhận. Đơn sẽ hoàn tất và trừ kho ngay.`,
        okText: "Đã nhận tiền",
        cancelText: "Chưa",
        onOk: () => completeManualPayment("bank_transfer"),
      });
      return;
    }
    void startPayment();
  };

  const startPayment = async () => {
    if (!readerId) {
      message.error("Chưa chọn máy POS");
      return;
    }
    setBusy(true);
    setPaymentError(undefined);
    setSuccessNote(undefined);
    let orderId: string | undefined;
    try {
      const order = await createPosOrder({
        ...orderPayload(),
        paymentMethod: "stripe_terminal",
      });
      orderId = order.id;
      // Hiện modal ngay cả khi đẩy xuống máy lỗi — đơn đã tạo, cho thu lại / huỷ
      setPayment({
        orderId: order.id,
        orderCode: order.code,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
      });
      setPayment(await collectPosPayment(order.id, readerId));
    } catch (error) {
      if (orderId) {
        setPaymentError(
          errorMessage(error, "Không gửi được số tiền xuống máy POS"),
        );
      } else {
        message.error(errorMessage(error, "Không tạo được đơn"));
      }
    } finally {
      setBusy(false);
    }
  };

  const closePayment = () => {
    stopPolling();
    setSuccessNote(undefined);
    if (payment?.paymentStatus === "paid") resetSale();
    setPayment(undefined);
    setPaymentError(undefined);
  };

  const layoutRef = useRef<HTMLDivElement>(null);
  const fitHeight = useFitHeight(layoutRef);

  const selectedReader = readers?.readers.find(
    (reader) => reader.id === readerId,
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <PageHeader title="Bán tại quầy" />

      <div
        ref={layoutRef}
        style={fitHeight ? { height: fitHeight } : undefined}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]"
      >
        {/* ---- Sản phẩm: danh sách cuộn bên trong ---- */}
        <Card
          title="Sản phẩm"
          className="flex min-h-0 flex-col"
          styles={{
            body: {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            },
          }}
          extra={
            <Input
              allowClear
              prefix={<Search size={16} className="text-muted" />}
              placeholder="Tìm theo tên hoặc SKU"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="w-56 sm:w-72"
            />
          }
        >
          <Spin
            spinning={searching}
            wrapperClassName="flex min-h-0 flex-1 flex-col [&>.ant-spin-container]:min-h-0 [&>.ant-spin-container]:flex-1"
          >
            {results.length === 0 && !searching ? (
              <Empty description="Không có sản phẩm phù hợp" />
            ) : (
              <div className="divide-line border-line flex h-full max-h-[70vh] flex-col divide-y overflow-y-auto rounded-lg border xl:max-h-none">
                {results.map((variant) => (
                  <ProductRow
                    key={variant.variantId}
                    variant={variant}
                    inCart={quantityInCart.get(variant.variantId) ?? 0}
                    onAdd={() => addToCart(variant)}
                  />
                ))}
              </div>
            )}
          </Spin>
        </Card>

        {/* ---- Cột phải: khách / món (cuộn) / thanh toán (ghim đáy) ---- */}
        <div className="bg-card border-line shadow-card flex min-h-0 flex-col overflow-hidden rounded-lg border">
          {/* Khách hàng */}
          <section className="border-line shrink-0 border-b p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">Khách hàng</span>
              {(customer || phone) && (
                <Button
                  type="link"
                  size="small"
                  className="p-0"
                  onClick={clearCustomer}
                >
                  Đổi khách
                </Button>
              )}
            </div>

            {customer ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <Avatar size={36} className="bg-brand shrink-0">
                    {customer.fullName.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {customer.fullName}
                      </span>
                      <Tag color="blue" className="m-0">
                        Khách hiện có
                      </Tag>
                    </div>
                    <div className="text-description text-xs">
                      {customer.phone}
                    </div>
                  </div>
                </div>
                <Input
                  size="small"
                  prefix={<Mail size={14} className="text-muted" />}
                  type="email"
                  placeholder="Email nhận biên nhận"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AutoComplete
                  value={phone}
                  onChange={(value: string) => setPhone(value)}
                  onSelect={(_, option) => {
                    const selected = suggestions.find(
                      (item) => item.id === option.key,
                    );
                    if (selected) selectCustomer(selected);
                  }}
                  options={suggestions.map((item) => ({
                    key: item.id,
                    value: item.phone ?? item.id,
                    label: (
                      <div className="flex items-center gap-2 py-1">
                        <Avatar size={28} className="bg-brand shrink-0">
                          {item.fullName.charAt(0).toUpperCase()}
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {item.fullName}
                          </div>
                          <div className="text-description truncate text-xs">
                            {item.phone}
                            {item.email ? ` · ${item.email}` : ""}
                          </div>
                        </div>
                      </div>
                    ),
                  }))}
                  notFoundContent={
                    lookingUp ? <Spin size="small" /> : undefined
                  }
                >
                  <Input
                    allowClear
                    inputMode="tel"
                    prefix={<Phone size={16} className="text-muted" />}
                    placeholder="Số điện thoại — để trống nếu khách vãng lai"
                  />
                </AutoComplete>

                {digits.length > 0 && (
                  <>
                    <CustomerHint
                      digits={digits}
                      lookingUp={lookingUp}
                      suggestionCount={suggestions.length}
                      exactMatch={exactMatch}
                      onPickExact={() =>
                        exactMatch && selectCustomer(exactMatch)
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        size="small"
                        prefix={<UserRound size={14} className="text-muted" />}
                        placeholder="Tên khách"
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(event.target.value)
                        }
                      />
                      <Input
                        size="small"
                        prefix={<Mail size={14} className="text-muted" />}
                        type="email"
                        placeholder="Email (tuỳ chọn)"
                        value={customerEmail}
                        onChange={(event) =>
                          setCustomerEmail(event.target.value)
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Món trong đơn — phần duy nhất co giãn và cuộn */}
          <section className="flex min-h-[120px] flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-2">
              <span className="font-semibold">
                Đơn hàng
                {itemCount > 0 && (
                  <span className="text-description ml-1 text-sm font-normal">
                    ({itemCount} sản phẩm)
                  </span>
                )}
              </span>
              {cart.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  danger
                  className="p-0"
                  onClick={() => setCart([])}
                >
                  Xoá hết
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
              {cart.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Chọn sản phẩm bên trái để thêm vào đơn"
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {cart.map((line) => (
                    <CartRow
                      key={line.variantId}
                      line={line}
                      onChange={(quantity) =>
                        setQuantity(line.variantId, quantity)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Tổng tiền + thanh toán — luôn ghim ở đáy */}
          <section className="border-line bg-subtle flex shrink-0 flex-col gap-3 border-t p-4">
            <div className="flex flex-col gap-1">
              <div className="text-content flex justify-between text-sm">
                <span>Tạm tính</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cart.length > 0 && (
                <DiscountField
                  mode={discountMode}
                  value={discountValue}
                  discount={discount}
                  capped={discountCapped}
                  onModeChange={changeDiscountMode}
                  onValueChange={setDiscountValue}
                  onPreset={(preset) => {
                    setDiscountMode(preset.mode);
                    setDiscountValue(preset.value);
                  }}
                />
              )}
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-brand text-2xl font-bold">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PAY_METHOD_OPTIONS.map((option) => {
                const selected = option.value === payMethod;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPayMethod(option.value)}
                    className={cn(
                      "bg-card flex items-center justify-center gap-1.5 rounded-lg border px-1 py-2 text-sm whitespace-nowrap transition",
                      selected
                        ? "border-brand text-brand font-semibold"
                        : "border-line text-content hover:border-brand cursor-pointer",
                    )}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                );
              })}
            </div>

            {payMethod === "stripe_terminal" && (
              <div className="flex flex-col gap-1">
                <Select
                  placeholder="Chọn máy POS"
                  value={readerId}
                  onChange={setReaderId}
                  loading={!readers}
                  options={readers?.readers.map((reader) => ({
                    value: reader.id,
                    label: `${reader.label ?? reader.id}${reader.simulated ? " (ảo)" : ""}${
                      reader.status === "offline" ? " — offline" : ""
                    }`,
                  }))}
                />
                {selectedReader?.status === "offline" && (
                  <Typography.Text type="warning" className="text-xs">
                    Máy đang offline — kiểm tra nguồn và mạng trước khi thu tiền
                  </Typography.Text>
                )}
              </div>
            )}

            {payMethod === "cash" && (
              <CashField
                total={total}
                received={cashReceived}
                changeDue={changeDue}
                disabled={cart.length === 0}
                onChange={setCashReceived}
              />
            )}

            {payMethod === "bank_transfer" && (
              <div className="text-content text-xs">
                Khách chuyển <b className="text-fg">{formatCurrency(total)}</b>{" "}
                vào tài khoản cửa hàng. Kiểm tra tiền đã vào đủ rồi mới xác
                nhận.
              </div>
            )}

            <Button
              type="primary"
              size="large"
              block
              className="h-12 text-base font-semibold"
              icon={
                PAY_METHOD_OPTIONS.find((option) => option.value === payMethod)
                  ?.icon
              }
              disabled={
                cart.length === 0 ||
                (payMethod === "stripe_terminal" && !readerId) ||
                cashShort
              }
              loading={busy && !payment}
              onClick={submitPayment}
            >
              {payMethod === "stripe_terminal"
                ? `Thu ${formatCurrency(total)} bằng máy POS`
                : payMethod === "cash"
                  ? "Xác nhận đã nhận tiền mặt"
                  : "Xác nhận đã nhận chuyển khoản"}
            </Button>
          </section>
        </div>
      </div>

      <Modal
        open={!!payment}
        title={payment ? `Thanh toán đơn ${payment.orderCode}` : undefined}
        footer={null}
        closable={!waitingForCard && !busy}
        maskClosable={false}
        keyboard={false}
        onCancel={closePayment}
        destroyOnHidden
      >
        {payment && (
          <PaymentPanel
            payment={payment}
            successNote={successNote}
            error={paymentError}
            busy={busy}
            testMode={!!readers?.testMode}
            onRetry={() =>
              run(
                () => collectPosPayment(payment.orderId, readerId),
                "Không gửi được số tiền xuống máy",
              )
            }
            onStopReader={() =>
              run(
                () => cancelPosCollect(payment.orderId, readerId),
                "Không dừng được máy POS",
              )
            }
            onCancelOrder={() =>
              run(
                () =>
                  cancelPosOrder(payment.orderId, {
                    readerId,
                    reason: "Huỷ tại quầy",
                  }),
                "Không huỷ được đơn",
              )
            }
            onSimulate={(cardNumber) =>
              run(
                () => simulatePosTap(payment.orderId, { readerId, cardNumber }),
                "Không giả lập được",
              )
            }
            onDone={closePayment}
          />
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Thumbnail({
  src,
  alt,
  size,
}: {
  src?: string;
  alt: string;
  size: string;
}) {
  return src ? (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={size}
      className="object-cover"
    />
  ) : (
    <span className="text-muted flex h-full items-center justify-center">
      <ImageOff size={20} />
    </span>
  );
}

/** Một dòng trong danh sách sản phẩm — bấm cả dòng để thêm vào đơn. */
function ProductRow({
  variant,
  inCart,
  onAdd,
}: {
  variant: SellableVariant;
  inCart: number;
  onAdd: () => void;
}) {
  const soldOut = isSoldOut(variant);
  const lowStock = variant.trackInventory && !soldOut && variant.stock <= 5;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={onAdd}
      className={cn(
        "flex w-full items-center gap-3 px-3 py-2 text-left transition",
        soldOut
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-row-hover cursor-pointer",
        inCart > 0 && "bg-brand-soft/40",
      )}
    >
      <Badge
        count={inCart}
        color="var(--color-brand)"
        size="small"
        offset={[-4, 4]}
      >
        <div className="bg-subtle border-line relative h-14 w-14 shrink-0 overflow-hidden rounded border">
          <Thumbnail
            src={variant.thumbnail}
            alt={lineName(variant)}
            size="56px"
          />
        </div>
      </Badge>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{variant.productName}</div>
        <div className="text-description truncate text-xs">
          {variant.variantName ? `${variant.variantName} · ` : ""}
          {variant.sku}
        </div>
      </div>

      <div className="w-20 shrink-0 text-right text-xs">
        {soldOut ? (
          <Tag color="default" className="m-0">
            Hết hàng
          </Tag>
        ) : variant.trackInventory ? (
          <span className={lowStock ? "text-warning" : "text-muted"}>
            Còn {variant.stock}
          </span>
        ) : (
          <span className="text-muted">Không giới hạn</span>
        )}
      </div>

      <div className="text-brand w-24 shrink-0 text-right font-semibold">
        {formatCurrency(variant.price)}
      </div>

      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          soldOut ? "bg-subtle text-muted" : "bg-brand text-white",
        )}
        aria-hidden
      >
        <Plus size={16} />
      </span>
    </button>
  );
}

function CartRow({
  line,
  onChange,
}: {
  line: CartLine;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-subtle border-line relative h-12 w-12 shrink-0 overflow-hidden rounded border">
        <Thumbnail src={line.thumbnail} alt={lineName(line)} size="48px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{line.productName}</div>
        <div className="text-description truncate text-xs">
          {line.variantName ? `${line.variantName} · ` : ""}
          {formatCurrency(line.price)}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <Space.Compact size="small">
            <Button
              icon={
                line.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />
              }
              danger={line.quantity === 1}
              onClick={() => onChange(line.quantity - 1)}
              aria-label={line.quantity === 1 ? "Xoá dòng" : "Bớt"}
            />
            <InputNumber
              size="small"
              min={1}
              max={maxQuantity(line)}
              value={line.quantity}
              onChange={(value) => onChange(value ?? 1)}
              controls={false}
              className="text-center"
              style={{ width: 44 }}
            />
            <Button
              icon={<Plus size={12} />}
              disabled={line.quantity >= maxQuantity(line)}
              onClick={() => onChange(line.quantity + 1)}
              aria-label="Thêm"
            />
          </Space.Compact>
          <span className="font-semibold">
            {formatCurrency(line.price * line.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomerHint({
  digits,
  lookingUp,
  suggestionCount,
  exactMatch,
  onPickExact,
}: {
  digits: string;
  lookingUp: boolean;
  suggestionCount: number;
  exactMatch?: PosCustomer;
  onPickExact: () => void;
}) {
  if (digits.length === 0) {
    return (
      <Typography.Text type="secondary" className="text-xs">
        Để trống nếu là khách vãng lai. Nhập số để tìm khách cũ hoặc tạo khách
        mới.
      </Typography.Text>
    );
  }
  if (digits.length < MIN_PHONE_DIGITS || lookingUp) return null;
  if (exactMatch) {
    return (
      <Typography.Text className="text-xs">
        Số này thuộc khách <b>{exactMatch.fullName}</b> —{" "}
        <Button
          type="link"
          size="small"
          className="h-auto p-0 text-xs"
          onClick={onPickExact}
        >
          chọn khách này
        </Button>
      </Typography.Text>
    );
  }
  return (
    <div className="bg-brand-soft flex items-center gap-2 rounded px-2 py-1 text-xs">
      <Plus size={14} className="text-brand shrink-0" />
      <span>
        {suggestionCount > 0
          ? "Chọn khách trong gợi ý, hoặc nhập đủ số để tạo khách mới khi lên đơn."
          : "Khách mới — sẽ được lưu vào danh sách khách hàng khi lên đơn."}
      </span>
    </div>
  );
}

/**
 * Thu gọn thành một dòng "Giảm giá" — đa số đơn không giảm. Bấm "Thêm" mới mở
 * khung nhập, "Ẩn" để thu lại (vẫn giữ mức giảm); đã có giảm giá thì dòng hiện
 * số tiền giảm kèm nút sửa / bỏ.
 */
function DiscountField({
  mode,
  value,
  discount,
  capped,
  onModeChange,
  onValueChange,
  onPreset,
}: {
  mode: DiscountMode;
  value: number | null;
  discount: number;
  capped: boolean;
  onModeChange: (mode: DiscountMode) => void;
  onValueChange: (value: number | null) => void;
  onPreset: (preset: (typeof DISCOUNT_PRESETS)[number]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const active = discount > 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-content">
          Giảm giá
          {active && mode === "percent" && (
            <span className="text-description ml-1 text-xs">({value}%)</span>
          )}
        </span>
        <span className="flex items-center gap-1">
          {active && (
            <span className="text-success font-medium">
              -{formatCurrency(discount)}
            </span>
          )}
          {editing ? (
            <Button
              type="link"
              size="small"
              className="p-0"
              icon={<ChevronUp size={14} />}
              iconPosition="end"
              onClick={() => setEditing(false)}
            >
              Ẩn
            </Button>
          ) : active ? (
            <>
              <Button
                type="text"
                size="small"
                icon={<Pencil size={14} />}
                onClick={() => setEditing(true)}
                aria-label="Sửa giảm giá"
              />
              <Button
                type="text"
                size="small"
                icon={<X size={14} />}
                onClick={() => onValueChange(null)}
                aria-label="Bỏ giảm giá"
              />
            </>
          ) : (
            <Button
              type="link"
              size="small"
              className="p-0"
              icon={<Plus size={14} />}
              onClick={() => setEditing(true)}
            >
              Thêm
            </Button>
          )}
        </span>
      </div>

      {editing && (
        <div className="bg-subtle flex flex-col gap-2 rounded-lg p-3">
          <div className="flex gap-2">
            <Segmented<DiscountMode>
              value={mode}
              onChange={onModeChange}
              options={[
                { value: "amount", label: "¥" },
                {
                  value: "percent",
                  label: <Percent size={14} className="mt-1.5" />,
                },
              ]}
            />
            <InputNumber
              style={{ flex: 1 }}
              min={0}
              max={mode === "percent" ? 100 : undefined}
              step={mode === "percent" ? 1 : 100}
              precision={0}
              value={value}
              onChange={onValueChange}
              placeholder={mode === "percent" ? "Phần trăm" : "Số tiền"}
              suffix={mode === "percent" ? "%" : "円"}
              autoFocus={editing && !active}
            />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {DISCOUNT_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                type={
                  preset.mode === mode && preset.value === value
                    ? "primary"
                    : "default"
                }
                onClick={() => onPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {capped && (
            <Typography.Text type="warning" className="text-xs">
              Không giảm quá tạm tính — đã giới hạn ở {formatCurrency(discount)}
            </Typography.Text>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Cùng nhịp với các dòng Tạm tính / Tổng cộng phía trên: nhãn trái, số phải.
 * Dùng `Input` thường thay cho `InputNumber` — tự định dạng `18,262,000` và để
 * trống được (InputNumber có prefix bị vỡ khung trong grid, ô rỗng lại hiện 0).
 */
function CashField({
  total,
  received,
  changeDue,
  disabled,
  onChange,
}: {
  total: number;
  received: number | null;
  changeDue: number;
  disabled: boolean;
  onChange: (value: number | null) => void;
}) {
  const entered = received !== null;
  const short = entered && changeDue < 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-content shrink-0 text-sm">Khách đưa</span>
        <Input
          size="large"
          inputMode="numeric"
          disabled={disabled}
          prefix={<span className="text-muted">¥</span>}
          placeholder="0"
          value={entered ? received.toLocaleString("ja-JP") : ""}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange(digits ? Number(digits) : null);
          }}
          allowClear
          className="max-w-60 flex-1 [&_input]:text-right [&_input]:font-semibold"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {cashSuggestions(total).map((amount) => (
          <Button
            key={amount}
            block
            disabled={disabled}
            type={received === amount ? "primary" : "default"}
            onClick={() => onChange(amount)}
            className="px-1"
          >
            {amount === total ? "Vừa đủ" : formatCurrency(amount)}
          </Button>
        ))}
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-content text-sm">
          {short ? "Còn thiếu" : "Tiền thối lại"}
        </span>
        <span
          className={cn(
            "text-xl font-bold",
            !entered ? "text-muted" : short ? "text-danger" : "text-success",
          )}
        >
          {entered ? formatCurrency(Math.abs(changeDue)) : "—"}
        </span>
      </div>
    </div>
  );
}

interface PaymentPanelProps {
  payment: PosPayment;
  successNote?: string;
  error?: string;
  busy: boolean;
  testMode: boolean;
  onRetry: () => void;
  onStopReader: () => void;
  onCancelOrder: () => void;
  onSimulate: (cardNumber: string) => void;
  onDone: () => void;
}

function PaymentPanel({
  payment,
  successNote,
  error,
  busy,
  testMode,
  onRetry,
  onStopReader,
  onCancelOrder,
  onSimulate,
  onDone,
}: PaymentPanelProps) {
  const amount = formatCurrency(payment.total);

  if (payment.paymentStatus === "paid" && payment.status === "completed") {
    return (
      <Result
        status="success"
        title={`Đã thu ${amount}`}
        subTitle={
          <>
            <div>Đơn {payment.orderCode} đã hoàn tất, kho đã được trừ.</div>
            {successNote && (
              <div className="text-fg mt-1 font-semibold">{successNote}</div>
            )}
          </>
        }
        extra={[
          <Button key="new" type="primary" onClick={onDone}>
            Đơn mới
          </Button>,
          <Link key="detail" href={routes.orders.detail(payment.orderId)}>
            <Button>Xem đơn</Button>
          </Link>,
        ]}
      />
    );
  }

  if (payment.status === "cancelled" && payment.paymentStatus === "unpaid") {
    return (
      <Result
        status="info"
        title="Đã huỷ đơn"
        subTitle={`Đơn ${payment.orderCode} đã huỷ, không thu tiền.`}
        extra={
          <Button type="primary" onClick={onDone}>
            Quay lại
          </Button>
        }
      />
    );
  }

  // Đã trả tiền nhưng đơn bị huỷ do hết hàng — backend tự hoàn tiền
  if (
    payment.paymentStatus === "paid" ||
    payment.paymentStatus === "refunded"
  ) {
    return (
      <Result
        status="warning"
        title="Đơn không hoàn tất được"
        subTitle="Khách đã trả tiền nhưng hàng không đủ — tiền đã được hoàn tự động. Kiểm tra lại đơn."
        extra={
          <Link href={routes.orders.detail(payment.orderId)}>
            <Button type="primary">Xem đơn</Button>
          </Link>
        }
      />
    );
  }

  const action = payment.readerAction;
  const waiting = action?.status === "in_progress";
  const failedMessage =
    action?.status === "failed" ? action.failureMessage : undefined;

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <Typography.Title level={2} style={{ margin: 0 }}>
        {amount}
      </Typography.Title>

      {waiting ? (
        <>
          <Spin size="large" />
          <Typography.Text>
            Mời khách chạm, quẹt hoặc cắm thẻ trên máy POS…
          </Typography.Text>
        </>
      ) : (
        <Typography.Text type="secondary">
          Máy POS chưa sẵn sàng thu đơn này
        </Typography.Text>
      )}

      {failedMessage && (
        <Tag color="error">Thẻ bị từ chối: {failedMessage}</Tag>
      )}
      {error && <Tag color="error">{error}</Tag>}

      <Space wrap className="justify-center">
        {waiting ? (
          <Button onClick={onStopReader} loading={busy}>
            Dừng trên máy
          </Button>
        ) : (
          <Button type="primary" onClick={onRetry} loading={busy}>
            Thu lại
          </Button>
        )}
        <Button danger onClick={onCancelOrder} disabled={busy}>
          Huỷ đơn
        </Button>
      </Space>

      {testMode && waiting && (
        <div className="border-line w-full rounded border border-dashed p-3">
          <Typography.Text type="secondary" className="mb-2 block text-xs">
            Sandbox — giả lập khách chạm thẻ trên reader ảo
          </Typography.Text>
          <Space wrap className="justify-center">
            <Button
              size="small"
              disabled={busy}
              onClick={() => onSimulate(TEST_CARDS.success)}
            >
              Thẻ hợp lệ
            </Button>
            <Button
              size="small"
              danger
              disabled={busy}
              onClick={() => onSimulate(TEST_CARDS.declined)}
            >
              Thẻ bị từ chối
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
}
