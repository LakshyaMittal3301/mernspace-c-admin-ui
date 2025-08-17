import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { refresh } from "./api";

export const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

const shouldBypassRefresh = (url: string | undefined) => {
    if (url === undefined) return false;

    return url.includes("/auth/refresh") || url.includes("/auth/login");
};

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

export const attachAuthInterceptor = (onUnauthorized: () => void) => {
    api.interceptors.response.use(
        (response) => response,
        async (err: AxiosError) => {
            const status = err.response?.status;
            const original = err.config as
                | (InternalAxiosRequestConfig<any> & { __RETRIED__: boolean })
                | undefined;

            if (
                status !== 401 ||
                !original ||
                shouldBypassRefresh(original.url) ||
                original.__RETRIED__
            ) {
                return Promise.reject(err);
            }

            try {
                if (isRefreshing && refreshPromise) {
                    await refreshPromise;
                } else {
                    isRefreshing = true;
                    refreshPromise = refresh();
                    await refreshPromise;
                }
                original.__RETRIED__ = true;
                return api.request(original);
            } catch (refreshErr) {
                onUnauthorized();
                return Promise.reject(refreshErr);
            } finally {
                if (isRefreshing) {
                    isRefreshing = false;
                    refreshPromise = null;
                }
            }
        }
    );
};
