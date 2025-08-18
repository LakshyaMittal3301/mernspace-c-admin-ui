import { Outlet } from "react-router";
import { self } from "../http/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../stores/store";
import { useEffect } from "react";

const Root = () => {
    const setUser = useAuthStore((s) => s.setUser);
    const setHydrated = useAuthStore((s) => s.setHydrated);

    const { data, isSuccess, isError } = useQuery({
        queryKey: ["self"],
        queryFn: self,
        retry: 0,
    });

    useEffect(() => {
        if (isSuccess && data) {
            setUser(data);
            setHydrated(true);
        } else if (isError) {
            setHydrated(true);
        }
    }, [isSuccess, isError, data, setUser, setHydrated]);

    return <Outlet />;
};

export default Root;
