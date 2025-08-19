import { lazy } from "react";
import type { RouteObject } from "react-router";

const HomePage = lazy(() => import("../pages/HomePage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const ProductsPage = lazy(() => import("../pages/ProductsPage"));
const PromosPage = lazy(() => import("../pages/PromosPage"));
const RestaurantsPage = lazy(() => import("../pages/RestaurantsPage"));

export const dashboardChildren: RouteObject[] = [
    {
        index: true,
        element: <HomePage />,
    },
    {
        path: "users",
        element: <UsersPage />,
    },
    {
        path: "promos",
        element: <PromosPage />,
    },
    {
        path: "products",
        element: <ProductsPage />,
    },
    {
        path: "restaurants",
        element: <RestaurantsPage />,
    },
];
