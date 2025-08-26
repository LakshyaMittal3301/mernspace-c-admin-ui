import type { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import {
    CategoriesCrumb,
    CreateUserCrumb,
    DashboardCrumb,
    ProductsCrumb,
    PromosCrumb,
    RestaurantsCrumb,
    UsersCrumb,
} from "./Crumbs";

// src/components/breadcrumbs/registry.ts
export const BREADCRUMBS: Record<string, ItemType[]> = {
    "/users": [DashboardCrumb, UsersCrumb],
    "/users/create": [DashboardCrumb, UsersCrumb, CreateUserCrumb],
    "/products": [DashboardCrumb, ProductsCrumb],
    "/restaurants": [DashboardCrumb, RestaurantsCrumb],
    "/promos": [DashboardCrumb, PromosCrumb],
    "/categories": [DashboardCrumb, CategoriesCrumb],
};
