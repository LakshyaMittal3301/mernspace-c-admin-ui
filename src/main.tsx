import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import "antd/dist/reset.css";
import "./index.css";

import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import AppThemeProvider from "./ui/AppThemeProvider";
import { useAuthStore } from "./stores/auth";
import { attachAuthInterceptor } from "./http/interceptors/attachAuthInterceptor";
import { api } from "./http/baseClient";
import { refresh } from "./http/services/authApi";

attachAuthInterceptor(api, refresh, () => {
    useAuthStore.getState().logout();
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <AppThemeProvider>
                <RouterProvider router={router} />
            </AppThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
