import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import StatCard from "./StatCard";
import { ShoppingTwoTone } from "@ant-design/icons";
import { theme } from "antd";

async function fetchTotalOrders() {
    // swap with real API
    const total = "295";
    return { total };
}

function StatOrdersCardBase() {
    const { token } = theme.useToken();
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["dashboard", "total-orders"],
        queryFn: fetchTotalOrders,
        staleTime: 5 * 60 * 1000,
    });

    return (
        <StatCard
            title="Total Orders"
            tone="primary" // green semantic
            icon={<ShoppingTwoTone twoToneColor={[token.colorPrimary, "transparent"]} />}
            value={data?.total ?? 0}
            isLoading={isLoading || isRefetching}
            onRefresh={() => refetch()}
            tooltip="Total number of orders placed"
            minHeight={160}
        />
    );
}

export default memo(StatOrdersCardBase);
