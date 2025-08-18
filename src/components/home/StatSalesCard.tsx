import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import StatCard from "./StatCard";
import { PieChartTwoTone } from "@ant-design/icons";
import { theme } from "antd";

async function fetchTotalSales() {
    // swap with real API
    const total = "$500,000";
    return { total };
}

function StatSalesCardBase() {
    const { token } = theme.useToken();
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ["dashboard", "total-sales"],
        queryFn: fetchTotalSales,
        staleTime: 5 * 60 * 1000,
    });

    return (
        <StatCard
            title="Total Sale"
            tone="success" // blue semantic (or "primary" to use your brand)
            icon={<PieChartTwoTone twoToneColor={[token.colorSuccess, "transparent"]} />}
            value={data?.total ?? 0}
            isLoading={isLoading || isRefetching}
            onRefresh={() => refetch()}
            tooltip="Gross sales across the selected period"
            minHeight={160}
        />
    );
}

export default memo(StatSalesCardBase);
