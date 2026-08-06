# Kế hoạch refactor FE theo schema sản phẩm mới

Nguồn: `product-creation-flows.md`, `database.dbml`, `openapi/openapi.json`.

Quyết định đã chốt:

- Màn sửa sản phẩm: **workspace nhiều tab**, mỗi tab tự lưu bằng API riêng.
- **Không làm phần kho** (tồn kho / phiếu nhập / phiếu xuất) trong đợt này.
- Phạm vi: Phase 0–4 (product) + Phase 6 (orders, dashboard). Bỏ Phase 5.

---

## 1. Mức độ vỡ hiện tại

FE đang mô hình hoá sản phẩm **phẳng**: 1 product = 1 SKU = 1 giá = 1 tồn. BE đã tách
master / variant / option / bundle. Đây không phải "thiếu tính năng" — module product
**đang hỏng ngay lúc này**:

| Vị trí | Hiện trạng | Sau restructure |
|---|---|---|
| `src/types/product.ts:13-42` | `Product` giữ `sku`, `price`, `cost`, `stock`, `compareAtPrice`, `lowStockThreshold` | Đã chuyển hết xuống `product_variants` |
| `src/lib/api/products.ts:125-151` `toProduct()` | đọc `record.sku/price/stock` | Luôn trả `""` / `0` → danh sách hiện giá 0₫, tồn 0, SKU rỗng |
| `src/app/(dashboard)/products/page.tsx:166-182` | cột `price`, `stock` | Phải là `minPrice–maxPrice`, `totalStock` |
| `src/app/(dashboard)/products/ProductForm.tsx:377-435` | `POST /products` không gửi `variants` | `variants` **required, min 1** → mọi lần tạo đều 400 |
| `updateProduct()` | `PATCH` JSON kèm price/stock | Master PATCH không nhận price/stock; OpenAPI chỉ khai multipart |
| `src/config/permissions.ts:17-19` | comment nhắc `PATCH /products/{id}/stock` | Endpoint không còn tồn tại |

Ưu tiên tuyệt đối: **hiện tại không tạo được sản phẩm nào.**

---

## 2. Lệch giữa doc và OpenAPI — cần confirm với BE

OpenAPI là contract thật, doc viết tay đã đơn giản hoá:

1. **`PUT /products/:id/options`** — doc ghi mảng phẳng `[{name, values:["Brown"]}]`.
   OpenAPI: `{ options: [{ name, position, values: [{ value, position }] }] }`.
   Values là **object**, có wrapper key `options`.
2. **`PUT /variants/:id/bundle-items`** — doc ghi mảng phẳng. OpenAPI: `{ items: [...] }`.
3. **`POST /products`, `PATCH /products/:id`, `PATCH /variants/:id` chỉ khai
   `multipart/form-data`**, không có `application/json`. Nếu đúng vậy thì mọi mutation
   phải build FormData kể cả khi không có ảnh. → **Cần confirm.**
4. **Không endpoint nào có response schema** (`"responses": {"200": {"description": ""}}`).
   Không generate type được → tự khai type từ doc + dbml, giữ lớp mapper defensive.
   → Đề nghị BE bổ sung `ProductResponseDto` / `VariantResponseDto`.
5. **`GET /variants/low-stock` không có param nào** — không phân trang, không filter.
6. **Không có endpoint search variant toàn cục.** Picker thành phần combo buộc phải đi
   2 cấp: `GET /products?productType=standard&search=` → `GET /products/:id/variants`.
   → Đề nghị BE thêm `GET /variants?search=`.
7. **Không có bảng `stock_movements`** trong dbml → phiếu nhập/xuất kho không có backend.
   (Ngoài phạm vi đợt này.)

---

## 3. Nguyên tắc UX

> **80% sản phẩm chỉ có 1 SKU. Không bắt admin học mô hình master/variant.**

- Chế độ mặc định "một phiên bản": khối *Giá & kho* ghi thẳng vào `variants[0]`, admin
  thấy **giống hệt form cũ**, không gặp chữ "biến thể".
- Chỉ khi bật toggle "Sản phẩm có nhiều phiên bản" mới lộ bảng variant.
- `productType` quyết định UI: `service` ẩn sạch ô kho, `bundle` thay tab kho bằng tab
  thành phần.

**Tạo và sửa không dùng chung component nữa:**

- **Tạo**: chưa có `id` → bắt buộc **1 request `POST /products` duy nhất** kèm `variants[]`.
- **Sửa**: master / variant / option / bundle là 4 API khác nhau, 2 permission khác nhau
  (`product.manage` vs `inventory.manage`), không có transaction. Một nút "Lưu" chung sẽ
  phải orchestrate N request, fail giữa chừng là rollback nửa vời.
  → **Workspace nhiều tab, mỗi tab tự lưu, dirty state cục bộ.**

---

## 4. Thiết kế UI/UX

### 4.1 Điều hướng

```
/products                        danh sách
/products/new                    bước 0 chọn loại → form tạo
/products/[id]?tab=general       thông tin chung (master)
/products/[id]?tab=description   mô tả chi tiết (giữ lazy-load hiện tại)
/products/[id]?tab=variants      Giá & kho | Phiên bản   (standard / service)
/products/[id]?tab=options       biến thể           (standard, nhiều phiên bản)
/products/[id]?tab=bundle        Thành phần combo        (bundle)
```

Dùng query param thay route lồng để giữ 1 lần fetch `GET /products/:id` (đã kèm
`variants` + `options`) và không remount khi đổi tab.

### 4.2 Màn tạo `/products/new`

**Bước 0 — 3 card chọn loại:** Hàng hoá / Combo / Dịch vụ.
`productType` **không sửa được sau khi tạo** → nói rõ ngay tại bước này.

**Bước 1 — form theo loại:**

- **standard**: khối "Giá & kho" (SKU, giá, giá so sánh, giá vốn, tồn, ngưỡng) map vào
  `variants[0]`. Toggle *"Sản phẩm có nhiều phiên bản"* → đổi thành bảng khai tay
  (Luồng B): SKU / tên / giá / giá so sánh / giá vốn / tồn / mặc định, tối thiểu 1 dòng.
  Vẫn đúng 1 POST.
- **service**: ẩn toàn bộ ô kho, ép `trackInventory: false`, chỉ SKU + giá.
- **bundle**: SKU + giá combo + 2 radio card chọn `bundleInventoryPolicy` kèm mô tả công
  thức tồn kho. Tạo xong **redirect thẳng vào tab Thành phần** + banner "Combo chưa có
  thành phần".

**Luồng C (generate từ option) cố tình không nằm trong wizard tạo** — `generate` cần
`productId`; nhồi vào wizard sẽ tạo trạng thái nửa vời nếu bước sau fail. Chỉ để hint:
*"Cần 10+ tổ hợp? Tạo sản phẩm trước, rồi khai option ở tab Phiên bản."*

### 4.3 Tab "Phiên bản & kho" (standard / service)

Bảng editable inline:
`[ảnh] Tên/tổ hợp · SKU · Giá · Giá so sánh · Giá vốn · Tồn · Ngưỡng · Mặc định (radio unique) · Bật/tắt · […]`

- Lưu **từng dòng** (`PATCH /variants/:id`). Nút "Lưu tất cả" chạy tuần tự; dòng fail thì
  highlight đỏ và **giữ nguyên giá trị đã sửa** (partial failure, không reset).
- **Tồn kho sau khi tạo chỉ đổi qua modal "Điều chỉnh kho"** (`PATCH /variants/:id/stock`,
  `{delta, reason}`) — có `reason` để vào activity log, đúng permission `inventory.manage`.
  Ô `stock` inline chỉ enable ở màn tạo. Modal có quick `+1/+5/+10` và preview
  "tồn sau điều chỉnh".
- Tag cảnh báo *"Chưa gán cấu hình"* cho variant có `optionValues: []` khi product đã khai
  option (doc §4).
- Disable xoá ở variant cuối cùng + tooltip lý do; variant đang là component của combo
  thì BE trả 400 → hiển thị message nguyên văn.
- "Thêm phiên bản": nếu đã có option → modal bắt chọn **đủ 1 value cho mỗi option**,
  FE chặn tổ hợp trùng trước khi gọi.

### 4.4 Tab "biến thể"

- Mỗi option = 1 card: tên + chip list values, kéo đổi `position`.
- `PUT` là **replace-all, 400 nếu xoá value đang dùng** → FE đếm trước số variant dùng mỗi
  value (từ `variants[].optionValues`), chip hiện badge số; bấm X thì confirm *"Có N phiên
  bản đang dùng giá trị này, xoá các phiên bản đó trước"*. **Chặn tại FE thay vì để 400
  rơi ra.**
- Nút "Sinh phiên bản" (`generate`): modal nhập `skuPrefix` + giá + tồn khởi tạo,
  **preview bảng tổ hợp M×N**, highlight tổ hợp đã tồn tại sẽ bị bỏ qua. Cảnh báo khi
  > 50 tổ hợp. Idempotent → ghi rõ "tổ hợp đã có sẽ được giữ nguyên".

### 4.5 Tab "Thành phần" (bundle)

- Bảng: `[ảnh] tên variant · SKU · tồn thành phần · số lượng (stepper) · "Quà tặng"
  (isOptional) · xoá`, kéo đổi `position`.
- Modal chọn thành phần 2 cấp (xem §2.6). Cache kết quả search.
- FE chặn trước 3/5 lỗi backend: tự chứa; combo lồng combo (lọc sẵn `productType=standard`);
  trùng dòng (đã có → tăng `quantity` + toast, không thêm dòng mới).
- Panel **"Khả năng bán"** (`GET /variants/:id/availability`, refetch sau mỗi lần lưu):
  *"Còn bán được 20 combo"*, list `limitedBy` dạng *"LOGI-MXM3S: tồn 40, cần 2/combo →
  giới hạn 20"* + link tới variant đó. `available: null` → "Không giới hạn".
- `derived_from_components`: ô tồn combo readonly + tooltip công thức.
  `own_stock`: hiện ô tồn + nút điều chỉnh như hàng thường.
  Đổi policy khi đã có thành phần → cảnh báo thay đổi cách trừ kho.

### 4.6 Danh sách sản phẩm

- Cột Giá: `minPrice === maxPrice ? fmt(min) : fmt(min)–fmt(max)`.
- Dòng phụ dưới tên: 1 phiên bản → `variants[0].sku`; nhiều → *"N phiên bản"*
  (master không còn SKU).
- Cột Tồn: `totalStock`. Chip loại "Combo" / "Dịch vụ" cạnh tên (standard không cần chip).
- Filter thêm: `productType`, `inStock`, `isFeatured`.
- **Expandable row** bung bảng variant rút gọn — list response chỉ trả default variant nên
  fetch `GET /products/:id/variants` khi expand.
- Quick action "Điều chỉnh kho" ngay ở dòng cho sản phẩm 1 phiên bản.

---

## 5. Ripple sang Orders (Phase 6)

`src/types/order.ts` lệch contract khá nặng:

| Vấn đề | Hiện tại | Contract |
|---|---|---|
| `OrderStatus` | `pending/confirmed/shipping/delivered/cancelled` | `pending/confirmed/**processing**/shipping/**completed**/cancelled/**refunded**` |
| `paymentStatus` | **không có** | `unpaid/paid/refunded/failed` |
| `discount` | không có | có trong `orders` |
| `OrderItem` | `productId, productName, sku, quantity, price` | thêm `id, variantId, variantName, parentItemId, thumbnail, unitPrice, total` |

Việc cần làm:

- `OrderDetail.tsx:132` dùng `rowKey="productId"` → **trùng key** khi một đơn có nhiều
  variant cùng product. Đổi sang `id`.
- Bảng items: lọc `parentItemId === null` cho dòng tính tiền; dòng con render thụt vào
  dưới dòng cha dạng "gồm có…", `total = 0`, **không cộng vào tổng**.
- `FLOW` trong Steps phải theo state machine mới (thêm `processing`, `delivered` →
  `completed`; `cancelled`/`refunded` nằm ngoài luồng).
- Đổi trạng thái không còn là 1 Select chung — có **3 endpoint riêng**:
  `PATCH /orders/:id/status` (kèm `reason` bắt buộc khi chuyển `cancelled`),
  `PATCH /orders/:id/payment-status`, `PATCH /orders/:id/cancel`.
  → UI tách: Select trạng thái đơn + control trạng thái thanh toán riêng + nút "Huỷ đơn"
  riêng có modal nhập lý do.
- `GET /orders` hỗ trợ filter `status`, `paymentStatus`, `paymentMethod`, `from`, `to`,
  `userId` → bổ sung vào SearchFilterBar.
- Bỏ mock: `src/mock/orders.ts` (dùng ở `orders/page.tsx`, `orders/[id]/page.tsx`,
  `lib/analytics.ts`).

**Dashboard** (`lib/analytics.ts`): `REVENUE_STATUSES` phải bỏ `delivered` → `completed`,
loại `refunded`. `buildTopProducts()` cộng `item.price * quantity` — với bundle, dòng con
có `unitPrice = 0` nên **bắt buộc lọc `parentItemId === null`**, nếu không rollup doanh thu
theo sản phẩm sẽ sai. `lowStockCount` chuyển sang `GET /variants/low-stock`.

---

## 6. Cấu trúc code đề xuất

```
types/product.ts     → Product (master), ProductType, ProductStatus, PRODUCT_TYPE_LABEL
types/variant.ts     → ProductVariant, ProductOption, ProductOptionValue,
                       BundleItem, VariantAvailability, BundleInventoryPolicy

lib/api/products.ts  → master CRUD + list + description   (bỏ bớt, đang ôm cả catalog)
lib/api/variants.ts  → variant CRUD, generate, options, stock,
                       bundle-items, availability, low-stock
lib/api/catalog.ts   → categories + brands (tách khỏi products.ts)
lib/api/formData.ts  → buildFormData() generic — product & variant dùng chung convention
                       thumbnailFile / imagesFiles + JSON-stringify object fields

app/(dashboard)/products/
  page.tsx
  new/page.tsx                    ProductTypePicker + ProductCreateForm
  [id]/page.tsx                   ProductWorkspace (tabs)
  _components/
    ProductTypePicker.tsx
    ProductCreateForm.tsx
    tabs/GeneralTab.tsx · DescriptionTab.tsx
    variants/VariantTable.tsx · AddVariantModal.tsx · AdjustStockModal.tsx
    options/OptionEditor.tsx · GenerateVariantsModal.tsx
    bundle/BundleItemsTable.tsx · VariantPickerModal.tsx · AvailabilityPanel.tsx
    shared/PriceRangeText.tsx · ProductTypeTag.tsx
```

`VariantPickerModal` tách riêng vì sẽ dùng lại ở nhiều chỗ cần chọn variant.

Sửa thêm: `src/config/permissions.ts` (comment outdated); tab kho trong workspace phải
gate `inventory.manage` riêng, không dùng chung `product.manage` của cả trang.

---

## 7. Phasing

| Phase | Nội dung | Trạng thái |
|---|---|---|
| **0** | types + api layer + fix trang danh sách | ✅ xong |
| **1** | Create wizard (standard / bundle / service) | ✅ xong |
| **2** | Workspace tabs + tab Phiên bản & kho + adjust stock | ✅ xong |
| **3** | Tab Options + generate | ✅ xong |
| **4** | Tab Bundle + availability | ✅ xong |
| **5** | Kho (tồn kho / phiếu nhập / phiếu xuất) | ⏸ hoãn |
| **6** | Orders + dashboard analytics | ⏸ hoãn — ưu tiên ổn định product trước |

## 8. Hạn chế đã biết & câu hỏi cho BE

1. **Không xoá được `compareAtPrice` / `costPrice` đang có.** Multipart bỏ qua giá
   trị rỗng nên xoá trắng ô sẽ không gửi gì và backend giữ nguyên giá cũ (UI tự
   hiện lại giá trị cũ sau khi lưu). Cần backend chấp nhận `null` hoặc chuỗi rỗng
   để reset.
2. **Không xoá hết được ảnh sản phẩm** — cùng lý do; contract ghi rõ *"không gửi
   thumbnail/images thì giữ nguyên ảnh hiện có"*.
3. `POST /products`, `PATCH /products/:id`, `PATCH /variants/:id` đang gửi
   **multipart kể cả khi không có file**, theo đúng OpenAPI. Nếu backend cũng nhận
   JSON thì nên khai vào contract để FE bớt một lớp chuyển đổi.
4. Nhóm Products/Variants **không có response schema** → FE tự khai kiểu ở
   `types/product.ts` + `types/variant.ts` và đọc qua mapper phòng thủ
   (`lib/api/parse.ts`). Có `ResponseDto` thì generate được kiểu, bớt rủi ro lệch.
5. **Không có `GET /variants?search=`** → picker thành phần combo phải đi hai cấp
   (tìm sản phẩm → nạp biến thể). Có endpoint này thì gộp lại còn một bước.
6. Tài liệu `product-creation-flows.md` §4 và §5 mô tả body `PUT /options` và
   `PUT /bundle-items` là mảng phẳng — code đi theo OpenAPI (`{ options: [...] }`,
   `{ items: [...] }`, `values` là object). Nên sửa lại tài liệu.
