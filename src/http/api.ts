import type { Credentials, Role, Tenant, User } from "../types";
import { api } from "./client";

// Auth service
export const login = async (credentials: Credentials): Promise<void> => {
    await api.post("/auth/login", credentials);
};

export const self = async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/self?expand=tenant");
    return data;
};

export const refresh = async (): Promise<void> => {
    await api.post("/auth/refresh");
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};

// --- Users ---
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

export const getUsers = async (params: GetUsersParams = {}): Promise<ListUsersApiResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.sort) qs.set("sort", params.sort);
    if (params.order) qs.set("order", params.order);
    if (params.q?.trim()) qs.set("q", params.q.trim());
    if (params.role) qs.set("role", params.role);

    const path = qs.toString() ? `/admin/users?${qs.toString()}` : "/admin/users";
    const { data } = await api.get<ListUsersApiResponse>(path);
    return data;
};

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

export const createAdmin = async (p: CreateAdminPayload) => {
    const { data } = await api.post("/admin/users/admins", p);
    return data;
};
export const createManager = async (p: CreateManagerPayload) => {
    const { data } = await api.post("/admin/users/managers", p);
    return data;
};

export const updateUser = async (
    id: number,
    p: { firstName?: string; lastName?: string; email?: string }
) => {
    const { data } = await api.patch(`/admin/users/${id}`, p);
    return data;
};

export const deleteUser = async (id: number) => {
    await api.delete(`/admin/users/${id}`);
};

export type TenantsResponse = { tenants: Tenant[] };

export const getTenants = async (): Promise<TenantsResponse> => {
    const { data } = await api.get("/tenants");
    return data;
};

export type CreateTenantResponse = { id: number };

export const createTenant = async (payload: {
    name: string;
    address: string;
}): Promise<CreateTenantResponse> => {
    const { data } = await api.post("/tenants", payload);
    return data;
};

export const updateTenant = async (
    id: number,
    payload: { name: string; address: string }
): Promise<Tenant> => {
    const { data } = await api.patch(`/tenants/${id}`, payload);
    return data;
};

export const deleteTenant = async (id: number): Promise<number> => {
    const response = await api.delete(`/tenants/${id}`);
    return response.status;
};
