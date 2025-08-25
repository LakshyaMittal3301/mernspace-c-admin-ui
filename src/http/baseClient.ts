import axios from "axios";

export const PATHS = {
    AUTH: "/api/auth",
    CATALOG: "/api/catalog",
} as const;

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL, // gateway root
    withCredentials: true,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
});
