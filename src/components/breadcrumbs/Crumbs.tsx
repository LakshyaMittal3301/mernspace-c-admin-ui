import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";

/** Build a standard crumb (text only). */
export function makeCrumb(title: string, href?: string): BreadcrumbItemType {
    return { title, href };
}

export const DashboardCrumb = makeCrumb("Dashboard", "/");
export const UsersCrumb = makeCrumb("Users", "/users");
export const CreateUserCrumb = makeCrumb("Create", "/users/create");
export const ProductsCrumb = makeCrumb("Products", "/products");
export const PromosCrumb = makeCrumb("Promos", "/promos");
export const RestaurantsCrumb = makeCrumb("Restaurants", "/restaurants");
