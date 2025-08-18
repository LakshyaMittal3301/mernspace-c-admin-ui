export type ThemeMode = "light" | "dark";

export type Credentials = {
    email: string;
    password: string;
};

export interface Tenant {
    id: number;
    name: string;
    address: string;
}

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    tenant?: Tenant;
}

export type Role = "admin" | "manager" | "customer";
