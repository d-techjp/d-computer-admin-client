import { create } from "zustand";

export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_WIDTH_COLLAPSED = 64;
export const MOBILE_BREAKPOINT = 768;

interface LayoutState {
  /** Sidebar thu gọn (desktop) — bản gốc toggle 250px <-> 50px */
  collapsed: boolean;
  /** Drawer sidebar (mobile) */
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setMobileOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
