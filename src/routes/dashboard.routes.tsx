import { lazy } from "react";
import type { RouteObject } from "react-router";

const HomePage = lazy(() => import("../pages/HomePage"));
const Categories = lazy(() => import("../pages/Categories"));

export const dashboardChildren: RouteObject[] = [
    {
        index: true,
        element: <HomePage />,
    },
    {
        path: "categories",
        element: <Categories />,
    },
];
