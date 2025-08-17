import { lazy } from "react";
import type { RouteObject } from "react-router";

const LoginPage = lazy(() => import("../pages/login/login"));

export const authChildren: RouteObject[] = [
    {
        path: "login",
        element: <LoginPage />,
    },
];
