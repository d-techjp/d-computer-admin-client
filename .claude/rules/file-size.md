# Rules: file size limits

Count **logic lines only**: exclude imports, blank lines, comments, type/interface declarations and
constant arrays (options, labels). JSX counts. Admin pages are table- and form-heavy, so the limits are
higher than the storefront's.

| File type | Target | Hard cap (must split) | When / how to split |
|---|---|---|---|
| `components/common`, `form/fields` | 30–120 | 180 | Shared, so keep them thin. Business logic here is misplaced |
| Small component in `_components/` | 30–120 | 180 | When it handles two unrelated jobs |
| List `page.tsx` (table + filters) | ≤ 200 | 300 | Table columns → `columns.tsx`. Load/filter/sort → a `useXxxList` hook |
| Create/edit form or modal | ≤ 200 | 300 | Split by section or tab. Submit/payload mapping → a hook or `lib/api` |
| Workspace tab (VariantsTab…) | ≤ 200 | 300 | Each tab saves through its own API. Sub-tables and sub-modals in their own files |
| Complex business screen (POS, order detail) | ≤ 250 | 350 | Split into panels (cart, customer, payment…), one file each + one state hook |
| Custom hook | 30–120 | 180 | One purpose per hook |
| `lib/api/<module>.ts` | ≤ 150 | 250 | Long mappers → `<module>.mapper.ts`. Several resources → separate files |
| Zustand store | ≤ 100 | 180 | Keep stores thin |
| Utility / helper | 10–80 | 120 | Functions with different purposes go in different files |
| `types/*`, `config/*`, constants, CSS | No fixed limit | — | Split by domain when hard to navigate |

- Functions and sub-components: target ≤ 50 lines.
- Files already over the cap: `pos/page.tsx` (1562), `ProductCreateForm.tsx` (962), `VariantsTab.tsx`
  (829), `products/page.tsx` (680), `BundleTab.tsx`, `CarouselFormModal.tsx`. Do not add new logic to
  them; write new parts as separate components or hooks and import them. Refactor the whole file only
  when asked.
