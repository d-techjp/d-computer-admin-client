# Rules: API & data

1. Every backend call goes through `apiFetch` in `lib/api/<module>.ts`. Components never call `fetch` directly.
2. Paths passed to `apiFetch` have **no `/admin`** (`apiFetch("/orders")`), because the base URL already
   includes it. Writing `/admin/...` produces `/api/v1/admin/admin/...` and a 404. When a new endpoint
   returns 404, check this first.
3. Always map responses into the types in `types/` with the `lib/api/parse.ts` helpers (`asString`,
   `asNumber`, `asEnum`…). Never cast raw JSON with `as`. `numeric` columns arrive as strings, so prices
   must go through `asNumber`.
4. Lists use `parseListResponse` + `toListQuery` (`lib/api/pagination.ts`). Outgoing payloads use
   `compactPayload` to drop empty fields. The backend runs `forbidNonWhitelisted`, so unknown fields get a 400.
5. Catch `ApiError` / `NetworkError` from `lib/api/client.ts` and show `error.message` (the backend
   already returns Vietnamese messages). 401s are handled centrally by `useAuthStore`; components never
   log out on their own.
6. Never keep server data in Zustand. Stores are only for auth, layout and theme.
