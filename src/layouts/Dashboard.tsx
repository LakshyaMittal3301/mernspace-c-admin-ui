import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../store";
import { Suspense } from "react";
import { PageLoader } from "../ui/PageLoader";

const Dashboard = () => {
    const user = useAuthStore((s) => s.user);
    const hydrated = useAuthStore((s) => s.hydrated);
    const location = useLocation();

    if (!hydrated) return <PageLoader />;

    if (!user) return <Navigate to="/auth/login" replace state={{ from: location }} />;
    return (
        <div>
            <h1>Dashboard</h1>
            <Suspense fallback={<PageLoader />}>
                <Outlet />
            </Suspense>{" "}
        </div>
    );
};

export default Dashboard;
