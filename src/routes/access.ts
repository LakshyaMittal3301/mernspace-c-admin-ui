import type { Role } from "../types";

export const routeAccess: Record<string, Role[] | "any"> = {
    "/": "any",
    "/users": ["admin"],
    "/products": ["admin", "manager"],
    "/restaurants": ["admin"],
    "/promos": ["admin", "manager"],
    "/categories": ["admin", "manager"],
};

export const rolesFor = (path: string): Role[] | "any" | undefined => routeAccess[path];
