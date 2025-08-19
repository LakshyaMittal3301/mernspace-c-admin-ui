import type { Credentials, Tenant, User } from "../types";
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
export type UsersResponse = { users: User[] };

export const getUsers = async (): Promise<UsersResponse> => {
    const { data } = await api.get("/admin/users");
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
