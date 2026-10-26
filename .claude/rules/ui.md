# Rules: UI, forms & permissions

1. Messages and modals use `const { message, modal } = App.useApp()`. Never use the static
   `message.success` (it ignores theme/context). Delete confirmations use `ConfirmDialog` / `useConfirmDialog`.
2. Antd for complex components, Tailwind only for layout and spacing. Colors come from the theme
   (`lib/antd-theme.ts`, CSS vars in `globals.css`); no hard-coded hex. Everything must work in dark theme.
3. Tables use `components/common/DataTable`, page headers use `PageHeader`, filter bars use
   `SearchFilterBar` + `FormItemLayout`. Statuses render with `StatusTag`, labels come from `types/*` (`*_LABEL`).
4. Forms use React Hook Form with the fields in `components/form/fields/*`. Long edit forms must use
   `useUnsavedChangesGuard(isDirty)`.
5. A new route must be added in 3 places: `config/routes.ts`, `config/menuConfig.ts`,
   `config/permissions.ts`. Wrap permission-dependent buttons or columns in `PermissionGate` (UX only;
   the backend does the real enforcement).
6. Sync list-page filters and pagination to the URL with `useUrlSearchParams` when they need to be
   shareable/bookmarkable.
7. UI strings and code comments are written in **Vietnamese** (existing repo convention). Dates use
   `dayjs` (vi locale), money uses `formatCurrency`.
8. Before reporting done: `npm run lint && npx tsc --noEmit && npm run build`.
