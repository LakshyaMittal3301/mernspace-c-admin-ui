import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store";
import { Suspense } from "react";
import { PageLoader } from "../ui/PageLoader";

const Dashboard = () => {
    const { user } = useAuthStore();

    if (user === null) {
        return <Navigate to="/auth/login" replace={true} />;
    }
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
