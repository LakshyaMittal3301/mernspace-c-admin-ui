import { StrictMode } from "react";
import { ConfigProvider } from "antd";

import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#F65F42",
                },
            }}
        >
            <RouterProvider router={router} />
        </ConfigProvider>
    </StrictMode>
);
