export type Credentials = {
    email: string;
    password: string;
};

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
}

export type Role = "admin" | "manager" | "customer";
