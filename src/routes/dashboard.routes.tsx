import { lazy } from "react";
import type { RouteObject } from "react-router";
import RequireRole from "../components/auth/RequireRole";
import { rolesFor } from "../routes/access";

const HomePage = lazy(() => import("../pages/HomePage"));
const UsersPage = lazy(() => import("../pages/users/UsersPage"));
const ProductsPage = lazy(() => import("../pages/ProductsPage"));
const PromosPage = lazy(() => import("../pages/PromosPage"));
const RestaurantsPage = lazy(() => import("../pages/RestaurantsPage"));

const protect = (path: string, element: React.JSX.Element) => (
    <RequireRole roles={rolesFor(path)}>{element}</RequireRole>
);

export const dashboardChildren: RouteObject[] = [
    {
        index: true,
        element: protect("/", <HomePage />),
    },
    {
        path: "users",
        element: protect("/users", <UsersPage />),
    },
    {
        path: "promos",
        element: protect("/promos", <PromosPage />),
    },
    {
        path: "products",
        element: protect("/products", <ProductsPage />),
    },
    {
        path: "restaurants",
        element: protect("/restaurants", <RestaurantsPage />),
    },
];
