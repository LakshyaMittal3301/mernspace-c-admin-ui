import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ThemeMode } from "../types";

interface UiState {
    themeMode: ThemeMode;
    setThemeMode: (m: ThemeMode) => void;
}

const storageKey = "app.themeMode";

const readInitialMode = (): ThemeMode => {
    const saved = localStorage.getItem(storageKey) as ThemeMode | null;
    return saved ?? "light";
};

export const useUiStore = create<UiState>()(
    devtools(
        (set) => ({
            themeMode: readInitialMode(),
            setThemeMode: (m) => {
                localStorage.setItem(storageKey, m);
                set({ themeMode: m });
            },
        }),
        {
            name: "ui",
        }
    )
);
