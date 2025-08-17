import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store";
import { Suspense } from "react";
import { PageLoader } from "../ui/PageLoader";

const Auth = () => {
    const { user } = useAuthStore();

    if (user !== null) {
        return <Navigate to="/" replace={true} />;
    }

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
