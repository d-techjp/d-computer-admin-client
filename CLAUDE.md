# d-computer-admin-client (admin back-office)

Back-office for D-Tech: products (variants, options, bundles), categories, brands, inventory, orders,
in-store sales (POS + receipt printing), articles, campaigns (carousels, TikTok, site info), users and
permissions, dashboard, activity log. The UI is in **Vietnamese**. Backend: `../d-computer-service`.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Ant Design 5 (+ React 19 patch) ·
Tailwind CSS v4 (layout, spacing) · Zustand · React Hook Form · ApexCharts · Tiptap · dnd-kit · dayjs (vi).

## Commands

```bash
npm run dev        # :3000 (when running alongside the storefront, put the storefront on :3001)
npm run lint && npx tsc --noEmit && npm run build   # run before reporting done
```

`.env.local`:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3030/api/v1/admin`: **already includes `/admin`**.
- `NEXT_PUBLIC_SITE_URL`: storefront URL for product previews.
- `NEXT_PUBLIC_STRIPE_DASHBOARD_URL`: opens Stripe transactions (refunds are done on the Stripe Dashboard).

The current API contract is `../d-computer-service/openapi/openapi.admin.yaml`; the copies in this
repo's `openapi/` are stale. The `product-*.md` files at the root are design notes for the product flows.

## Architecture

```
src/
├── app/(auth)/login/         # login (calls /admin/auth/login)
├── app/(dashboard)/<route>/  # page.tsx ("use client") + route-private _components/
├── app/providers.tsx         # AntdRegistry, ConfigProvider (vi_VN, theme), antd <App>
├── components/
│   ├── auth/                 # AuthGuard, PermissionGate, Forbidden
│   ├── common/               # DataTable, PageHeader, StatusTag, ConfirmDialog, StatCard…
│   ├── form/fields/          # TextField, SelectField, CurrencyField, ImageUploadField, RichTextField…
│   │                         # (antd wrapped with RHF useController, take `control` + `name`)
│   ├── charts/ layout/
├── config/                   # routes.ts, menuConfig.ts, permissions.ts (route ⇄ permission)
├── hooks/                    # usePermissions, useUrlSearchParams, useUnsavedChangesGuard
├── lib/api/                  # client.ts (apiFetch) + one file per backend module: calls + response mapping
├── lib/                      # antd-theme, chart-colors, imageUpload/imageCrop, printReceipt
├── store/                    # useAuthStore (token, permissions), useLayoutStore, useThemeStore
└── types/                    # domain types + display labels/enums (ORDER_STATUS_LABEL…)
```

- **Auth:** `useAuthStore` persists the token (localStorage when "remember me", otherwise
  sessionStorage) and pushes it into `lib/api/client.ts`. On a 401 (token version bumped by a login
  elsewhere, logout or role change) a central handler clears the session. Each user has **one session**.
- **Permissions:** `GET /auth/permissions` → store. `config/permissions.ts` is the single source for
  both menu filtering and page blocking. Buttons and columns are wrapped in `PermissionGate`. This is
  UX only; the backend does the real enforcement.
- **Data:** many endpoints have no response schema in OpenAPI, so mappers in `lib/api/*` read
  defensively via `lib/api/parse.ts` (`asString`, `asNumber`, `asEnum`…). `numeric` columns arrive as
  **strings**, so prices must go through `asNumber`.
- **Business notes:** `awaiting_payment` orders (Stripe/POS) have not deducted stock yet. In-store
  (`in_store`) orders paid by `cash` / `bank_transfer` go straight to `completed`. Stripe refunds are
  done on the Dashboard; the admin only links there. Receipts print on an 80mm thermal printer through a
  hidden iframe (`lib/printReceipt.ts`); the 10% tax is included in prices.

## Rules

Detailed rules live in `.claude/rules/` (auto-loaded): `api-and-data.md` · `ui.md` · `file-size.md`.

## Deploy

Pushing `main` triggers GitHub Actions: build Docker image (`output: standalone`) → VPS
`docker compose up -d d-computer-admin-client` (prod port 5050). **Pushing main deploys to
production**, so ask before pushing.
