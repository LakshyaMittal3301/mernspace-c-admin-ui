import type { Credentials, Role, Tenant, User } from "../../types";
import { api, PATHS } from "../baseClient";

const AUTH = PATHS.AUTH; // "/api/auth"

/* ----------------------------- Auth endpoints ----------------------------- */

export async function login(credentials: Credentials): Promise<void> {
    await api.post(`${AUTH}/auth/login`, credentials);
}

export async function self(): Promise<User> {
    const { data } = await api.get<User>(`${AUTH}/auth/self?expand=tenant`);
    return data;
}

export async function refresh(): Promise<void> {
    await api.post(`${AUTH}/auth/refresh`);
}

export async function logout(): Promise<void> {
    await api.post(`${AUTH}/auth/logout`);
}

/* --------------------------------- Users --------------------------------- */

export type ApiUser = {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    tenantId: number | null;
    createdAt: string;
};

export type ListUsersApiResponse = {
    rows: ApiUser[];
    page: number;
    limit: number;
    sort: "id" | "createdAt";
    order: "asc" | "desc";
    total: number;
    totalPages: number;
};

export type GetUsersParams = {
    page?: number;
    limit?: number;
    sort?: "id" | "createdAt";
    order?: "asc" | "desc";
    q?: string;
    role?: Role;
};

export async function getUsers(params: GetUsersParams = {}): Promise<ListUsersApiResponse> {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.sort) qs.set("sort", params.sort);
    if (params.order) qs.set("order", params.order);
    if (params.q?.trim()) qs.set("q", params.q.trim());
    if (params.role) qs.set("role", params.role);

    const path = qs.toString() ? `${AUTH}/admin/users?${qs.toString()}` : `${AUTH}/admin/users`;

    const { data } = await api.get<ListUsersApiResponse>(path);
    return data;
}

export type CreateAdminPayload = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
};

export type CreateManagerPayload = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    tenantId: number;
};

export async function createAdmin(p: CreateAdminPayload) {
    const { data } = await api.post(`${AUTH}/admin/users/admins`, p);
    return data;
}

export async function createManager(p: CreateManagerPayload) {
    const { data } = await api.post(`${AUTH}/admin/users/managers`, p);
    return data;
}

export async function updateUser(
    id: number,
    p: { firstName?: string; lastName?: string; email?: string }
) {
    const { data } = await api.patch(`${AUTH}/admin/users/${id}`, p);
    return data;
}

export async function deleteUser(id: number) {
    await api.delete(`${AUTH}/admin/users/${id}`);
}

/* -------------------------------- Tenants -------------------------------- */

export type TenantsResponse = { tenants: Tenant[] };

export async function getTenants(): Promise<TenantsResponse> {
    const { data } = await api.get(`${AUTH}/tenants`);
    return data as TenantsResponse;
}

export type CreateTenantResponse = { id: number };

export async function createTenant(payload: {
    name: string;
    address: string;
}): Promise<CreateTenantResponse> {
    const { data } = await api.post(`${AUTH}/tenants`, payload);
    return data as CreateTenantResponse;
}

export async function updateTenant(
    id: number,
    payload: { name: string; address: string }
): Promise<Tenant> {
    const { data } = await api.patch(`${AUTH}/tenants/${id}`, payload);
    return data as Tenant;
}

export async function deleteTenant(id: number): Promise<number> {
    const response = await api.delete(`${AUTH}/tenants/${id}`);
    return response.status;
}
