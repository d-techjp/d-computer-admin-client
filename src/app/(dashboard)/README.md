# D-Tech Admin

Trang quản trị cho website thương mại điện tử bán thiết bị điện tử & máy tính.

Dự án tái hiện **cấu trúc và cách triển khai component** của admin cũ
`back-office--bo-tools-client` (React + antd + styled-components + less), migrate sang
Next.js App Router. Không sao chép logic nghiệp vụ — chỉ giữ lại pattern.

## Tech stack

| Lớp | Thư viện |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Ant Design v5 (component phức tạp) + Tailwind CSS v4 (layout/spacing) |
| State | Zustand (theme, trạng thái layout) |
| Form | React Hook Form |
| Chart | ApexCharts (`react-apexcharts`) |
| Dữ liệu | Mock nội bộ + `fakeFetch` mô phỏng độ trễ/phân trang/lọc |

## Chạy dự án

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production
npm run lint     # eslint
npx tsc --noEmit # kiểm tra kiểu
```

## Kế thừa từ source cũ

**Màu sắc & font** (`src/app/globals.css`, `src/lib/antd-theme.ts`) lấy trực tiếp từ
`app/config/style/*.js` và `app/assets/less/custom-antd.less` của bản gốc:

- Font chính **Exo 2** (bản gốc ép cứng cho mọi component antd)
- Primary `#397dbb`, hover teal `#00a8b8`, header bảng `#1c90ff`
- Theme tối: nền `#0f1724` / sidebar `#212c3d` / card `#24364e`, accent cyan `#11ece5`
- Theme lưu vào localStorage nhưng đổi màu tức thì qua `data-theme`, không reload như bản cũ

**Pattern được tái hiện:**

| Bản gốc | Ở đây |
|---|---|
| `config/routes` tách khỏi dữ liệu menu | `src/config/routes.ts` + `src/config/menuConfig.ts` |
| `SideNavigation` + `MobileMenu` | `src/components/layout/Sidebar.tsx` (Drawer khi < 768px) |
| `TableData` + `PagingTable` (2 mảnh) | `src/components/common/DataTable` (gộp 1, dùng pagination của antd) |
| `Form/*` wrapper + `FormLayout` | `src/components/form/fields/*` + `FormItemLayout` |
| `DatePickerSearch` (preset + custom range) | `src/components/form/DatePickerPresetRange.tsx` |
| `ButtonSearchGroup` | `src/components/form/SearchFilterBar.tsx` |
| `ChartWrapper` + `DEFAULT_OPTIONS`/`onEditOption` | `src/components/charts/*` + `baseOptions.ts` |
| `PageHeader` (`title` + `extra`) | `src/components/common/PageHeader.tsx` |

## Cấu trúc

```
src/
├── app/(dashboard)/     # 17 route trong shell có sidebar
│   ├── dashboard/       # tổng quan: KPI + 3 chart
│   ├── users/           # khách hàng, nhóm quản trị
│   ├── products/        # danh sách, tạo/sửa, danh mục, thương hiệu
│   ├── orders/          # danh sách + chi tiết
│   ├── warehouse/       # tồn kho, phiếu nhập, phiếu xuất
│   └── posts/           # danh sách + soạn thảo
├── app/(auth)/login/    # trang đăng nhập, không có sidebar
├── components/          # layout / common / form / charts
├── config/              # routes.ts, menuConfig.ts
├── hooks/useListQuery   # logic chung của mọi trang danh sách
├── lib/                 # fakeFetch, analytics, theme, màu chart
├── mock/                # fixture domain máy tính/điện tử
├── store/               # zustand: theme, layout
└── types/
```

## Bảng màu biểu đồ

`src/lib/chart-colors.ts` — 8 màu categorical thứ tự cố định, slot 1 là màu brand.
Đã chạy qua validator kiểm tra mù màu với đúng nền card của dự án (sáng `#ffffff`,
tối `#1d2636`): đạt dải sáng, ngưỡng chroma, tách biệt CVD ΔE 9.1 và ΔE thị lực
thường 19.6. Màu trạng thái đơn hàng gán cố định theo thực thể nên lọc bớt trạng
thái không làm đổi màu phần còn lại.

## Lưu ý khi nối backend thật

Chỉ cần thay thân các hàm trong `src/lib/fakeFetch.ts` bằng lời gọi HTTP —
chữ ký giữ nguyên, các trang không phải sửa.
