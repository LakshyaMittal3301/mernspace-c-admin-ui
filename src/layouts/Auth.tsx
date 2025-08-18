import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../stores/auth";
import { Suspense } from "react";
import { PageLoader } from "../ui/PageLoader";

const Auth = () => {
    const user = useAuthStore((s) => s.user);
    const hydrated = useAuthStore((s) => s.hydrated);

    if (!hydrated) return <PageLoader />;

    if (user) return <Navigate to="/" replace />;

    return (
        <div>
            <h1>Auth</h1>
            <Suspense fallback={<PageLoader />}>
                <Outlet />
            </Suspense>
        </div>
    );
};

export default Auth;
