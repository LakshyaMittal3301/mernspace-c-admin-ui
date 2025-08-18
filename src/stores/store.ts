import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { User } from "../types";

interface AuthState {
    user: null | User;
    hydrated: boolean;
    setUser: (user: User) => void;
    logout: () => void;
    setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    devtools((set) => ({
        user: null,
        hydrated: false,
        setUser: (user) => set({ user }),
        logout: () => set({ user: null }),
        setHydrated: (v) => set({ hydrated: v }),
    }))
);
