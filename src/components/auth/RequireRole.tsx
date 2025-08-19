import { Navigate, useLocation } from "react-router-dom";
import { Result, Button } from "antd";
import { useAuthStore } from "../../stores/auth";
import type { Role, User } from "../../types";

const canAccess = (user: User | null, allowed?: Role[] | "any") => {
    if (!allowed || allowed === "any") return true;
    if (!user) return false;
    return allowed.includes(user.role as Role);
};

export default function RequireRole({
    roles,
    children,
}: {
    roles?: Role[] | "any";
    children: React.JSX.Element;
}) {
    const user = useAuthStore((s) => s.user);
    const hydrated = useAuthStore((s) => s.hydrated);
    const location = useLocation();

    if (!hydrated) return null; // your Dashboard shows a loader already

    if (!user) {
        return <Navigate to="/auth/login" replace state={{ from: location }} />;
    }

    if (!canAccess(user, roles)) {
        return (
            <Result
                status="403"
                title="403"
                subTitle="Sorry, you are not authorized to access this page."
                extra={
                    <Button type="primary" href="/">
                        Back Home
                    </Button>
                }
            />
        );
    }

    return children;
}
