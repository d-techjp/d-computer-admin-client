/**
 * Registry đường dẫn — tách riêng khỏi dữ liệu menu, đúng như
 * app/config/routes/index.js của bản gốc. Mọi nơi tham chiếu route
 * qua object này thay vì hardcode chuỗi.
 */
export const routes = {
  dashboard: "/dashboard",

  users: {
    index: "/users",
    customers: {
      index: "/users/customers",
      detail: (id: string) => `/users/customers/${id}`,
    },
    admins: {
      index: "/users/admins",
      new: "/users/admins/new",
      detail: (id: string) => `/users/admins/${id}`,
    },
    roles: {
      index: "/users/roles",
    },
  },

  products: {
    index: "/products",
    new: "/products/new",
    detail: (id: string) => `/products/${id}`,
    categories: "/products/categories",
    brands: "/products/brands",
  },

  campaigns: {
    index: "/campaigns",
    carousels: "/campaigns/carousels",
  },

  orders: {
    index: "/orders",
    detail: (id: string) => `/orders/${id}`,
  },

  warehouse: {
    index: "/warehouse",
    stockIn: "/warehouse/stock-in",
    stockOut: "/warehouse/stock-out",
  },

  posts: {
    index: "/posts",
    new: "/posts/new",
    detail: (id: string) => `/posts/${id}`,
  },

  activityLogs: "/activity-logs",

  auth: {
    login: "/login",
  },
} as const;

export default routes;
