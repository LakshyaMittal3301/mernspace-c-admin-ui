import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../store";

const Auth = () => {
    const { user } = useAuthStore();

    if (user !== null) {
        return <Navigate to="/" replace={true} />;
    }

    return (
        <div>
            <h1>Auth</h1>
            <Outlet />
        </div>
    );
};

export default Auth;
