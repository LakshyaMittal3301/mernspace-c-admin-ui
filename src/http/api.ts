import type { Credentials, User } from "../types";
import { api } from "./client";

// Auth service
export const login = async (credentials: Credentials): Promise<void> => {
    await api.post("/auth/login", credentials);
};

export const self = async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/self");
    return data;
};

export const refresh = async (): Promise<void> => {
    await api.post("/auth/refresh");
};

export const logout = async (): Promise<void> => {
    await api.post("/auth/logout");
};
