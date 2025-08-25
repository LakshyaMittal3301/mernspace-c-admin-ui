import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

const shouldBypassRefresh = (url?: string) =>
    !!url && (url.includes("/auth/refresh") || url.includes("/auth/login"));

export function attachAuthInterceptor(
    api: AxiosInstance,
    refreshAccessToken: () => Promise<void>,
    onUnauthorized: () => void
) {
    let isRefreshing = false;
    let refreshPromise: Promise<void> | null = null;

    api.interceptors.response.use(
        (res) => res,
        async (err: AxiosError) => {
            const status = err.response?.status;
            const original = err.config as
                | (InternalAxiosRequestConfig & { __RETRIED__?: boolean })
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
                    refreshPromise = refreshAccessToken();
                    await refreshPromise;
                }
                original.__RETRIED__ = true;
                return api.request(original);
            } catch (refreshErr) {
                onUnauthorized();
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
                refreshPromise = null;
            }
        }
    );
}
