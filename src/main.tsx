import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import "antd/dist/reset.css";
import "./index.css";

import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import AppThemeProvider from "./ui/AppThemeProvider";
import { attachAuthInterceptor } from "./http/client";
import { useAuthStore } from "./stores/auth";

attachAuthInterceptor(() => {
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
