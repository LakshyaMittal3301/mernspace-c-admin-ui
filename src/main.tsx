import { createRoot } from "react-dom/client";
import { StrictMode } from "react";

import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";

import "antd/dist/reset.css";
import "./index.css";

import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import { appTheme } from "./ui/theme";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ConfigProvider theme={appTheme}>
                <RouterProvider router={router} />
            </ConfigProvider>
        </QueryClientProvider>
    </StrictMode>
);
