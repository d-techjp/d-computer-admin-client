import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "d-computer-theme";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/**
 * Bản gốc lưu theme vào localStorage rồi `window.location.reload()`.
 * Ở đây giữ nguyên ý tưởng persist nhưng đổi màu tức thì qua thuộc tính
 * `data-theme` trên <html>, không cần reload.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({ mode: state.mode === "light" ? "dark" : "light" })),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);
