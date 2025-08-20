import { Card, List, Typography, Tag, Button, Skeleton, Tooltip, theme } from "antd";
import { ClockCircleTwoTone, ReloadOutlined } from "@ant-design/icons";
import { useNavigate, Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type OrderStatus = "Preparing" | "On the way" | "Delivered" | "Cancelled";

type Order = {
    id: string;
    name: string; // customer or order title
    address: string;
    price: number; // number (we'll format)
    status: OrderStatus;
};

// ---- mock fetch (swap with your API) ----
async function fetchRecentOrders(): Promise<Order[]> {
    await new Promise((r) => setTimeout(r, 400));
    return [
        {
            id: "1001",
            name: "Jane Doe",
            address: "221B Baker Street, London",
            price: 89,
            status: "Preparing",
        },
        {
            id: "1002",
            name: "John Smith",
            address: "742 Evergreen Terrace, Springfield",
            price: 129,
            status: "On the way",
        },
        {
            id: "1003",
            name: "Acme Inc.",
            address: "1600 Amphitheatre Pkwy, Mountain View, CA",
            price: 56,
            status: "Delivered",
        },
        {
            id: "1004",
            name: "Foo Bar",
            address: "1 Infinite Loop, Cupertino, CA",
            price: 199,
            status: "Cancelled",
        },
        {
            id: "1005",
            name: "Contoso Ltd.",
            address: "4 Privet Drive, Little Whinging",
            price: 42,
            status: "Preparing",
        },
        // add more to test scroll…
        {
            id: "1006",
            name: "Wayne Ent.",
            address: "1007 Mountain Drive, Gotham",
            price: 75,
            status: "Delivered",
        },
        {
            id: "1007",
            name: "Stark Ind.",
            address: "200 Park Ave, NY",
            price: 320,
            status: "Preparing",
        },
        {
            id: "1008",
            name: "Umbrella",
            address: "Raccoon City, Midwest",
            price: 58,
            status: "On the way",
        },
        {
            id: "1009",
            name: "Wonka",
            address: "Cherry Tree Lane, London",
            price: 112,
            status: "Delivered",
        },
        {
            id: "1010",
            name: "Soylent",
            address: "Ocean Ave, San Francisco",
            price: 64,
            status: "Cancelled",
        },
        {
            id: "1011",
            name: "Aperture",
            address: "Enrichment Center, Upper Michigan",
            price: 41,
            status: "Preparing",
        },
    ];
}

export default function RecentOrdersCard() {
    const { token } = theme.useToken();
    const navigate = useNavigate();

    // tone for header strip & footer underline
    const fg = token.colorInfo;
    const bg = token.colorInfoBg;

    const { data, isLoading, isRefetching, refetch } = useQuery({
        queryKey: ["dashboard", "recent-orders"],
        queryFn: fetchRecentOrders,
        staleTime: 60_000,
    });

    // status → tag color (token-based, dark-mode safe)
    const statusColor = useMemo(() => {
        return new Map<OrderStatus, { bg: string; fg: string; bd: string }>([
            [
                "Preparing",
                { bg: token.colorInfoBg, fg: token.colorInfo, bd: token.colorInfoBorder },
            ],
            [
                "On the way",
                { bg: token.colorWarningBg, fg: token.colorWarning, bd: token.colorWarningBorder },
            ],
            [
                "Delivered",
                { bg: token.colorSuccessBg, fg: token.colorSuccess, bd: token.colorSuccessBorder },
            ],
            [
                "Cancelled",
                { bg: token.colorErrorBg, fg: token.colorError, bd: token.colorErrorBorder },
            ],
        ]);
    }, [token]);

    // small scoped CSS for subtle row hover (token-aware)
    const hoverBg = token.colorFillSecondary;

    // show as many as fit, max 10 (rest are accessible via “See all orders”)
    const items = (data ?? []).slice(0, 10);

    return (
        <Card
            style={{ width: "100%", height: "100%", borderTop: `4px solid ${fg}` }}
            styles={{
                header: { padding: "16px 20px" }, // match Stat/Sales cards
                // make body a flex column so list occupies all remaining height
                body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" },
            }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* icon chip */}
                    <span
                        style={{
                            display: "inline-grid",
                            placeItems: "center",
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: bg,
                            color: fg,
                            flex: "0 0 36px",
                        }}
                    >
                        <span style={{ fontSize: 20, lineHeight: 1 }}>
                            <ClockCircleTwoTone twoToneColor={[fg, "transparent"]} />
                        </span>
                    </span>

                    <Typography.Text strong style={{ fontSize: 18, lineHeight: 1.2 }}>
                        Recent Orders
                    </Typography.Text>
                </div>
            }
            extra={
                <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => refetch()}
                    loading={isLoading || isRefetching}
                    aria-label="Refresh recent orders"
                />
            }
        >
            <style>
                {`
          .orders-list .orders-item {
            transition: background-color 120ms ease;
            border-radius: 6px;
          }
          .orders-list .orders-item:hover {
            background: ${hoverBg};
          }
        `}
            </style>

            {isLoading ? (
                <div style={{ padding: 16 }}>
                    <Skeleton active title={false} paragraph={{ rows: 6 }} />
                </div>
            ) : (
                <List
                    className="orders-list"
                    dataSource={items}
                    locale={{ emptyText: "No Data" }}
                    // occupy remaining space; footer stays inside the list (last row)
                    style={{ padding: 12, paddingTop: 8, flex: 1, overflowY: "auto" }}
                    renderItem={(o) => {
                        const { bg, fg, bd } = statusColor.get(o.status as OrderStatus) ?? {
                            bg: token.colorBgBase,
                            fg: token.colorText,
                            bd: token.colorBorder,
                        };
                        return (
                            <List.Item
                                className="orders-item"
                                style={{ padding: "10px 12px", cursor: "pointer" }}
                                onClick={() => navigate(`/orders/${o.id}`)}
                            >
                                {/* LEFT: name (strong) + address (ellipsis) */}
                                <List.Item.Meta
                                    title={
                                        <Typography.Text strong style={{ fontSize: 14 }}>
                                            {o.name}
                                        </Typography.Text>
                                    }
                                    description={
                                        <Tooltip title={o.address}>
                                            <Typography.Paragraph
                                                type="secondary"
                                                style={{ margin: 0 }}
                                                ellipsis={{ rows: 1 }}
                                            >
                                                {o.address}
                                            </Typography.Paragraph>
                                        </Tooltip>
                                    }
                                />

                                {/* RIGHT: price + status tag */}
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <Typography.Text
                                        strong
                                        style={{ minWidth: 80, textAlign: "right" }}
                                    >
                                        {new Intl.NumberFormat(undefined, {
                                            style: "currency",
                                            currency: "USD",
                                            maximumFractionDigits: 0,
                                        }).format(o.price)}
                                    </Typography.Text>
                                    <Tag
                                        style={{
                                            borderRadius: 999,
                                            fontWeight: 500,
                                            background: bg,
                                            color: fg,
                                            borderColor: bd,
                                            borderWidth: 1,
                                            borderStyle: "solid",
                                            paddingInline: 10,
                                        }}
                                    >
                                        {o.status}
                                    </Tag>
                                </div>
                            </List.Item>
                        );
                    }}
                    // 👇 footer is part of the List, so it’s definitely inside the Card
                    footer={
                        <div
                            style={{
                                marginTop: 4,
                                paddingTop: 8,
                                borderTop: `1px solid ${token.colorBorderSecondary}`,
                                textAlign: "left",
                            }}
                        >
                            <Link
                                to="/orders"
                                style={{
                                    color: token.colorText,
                                    textDecoration: "none",
                                    borderBottom: `2px solid ${fg}`,
                                    paddingBottom: 2,
                                    fontWeight: 600,
                                }}
                            >
                                See all orders
                            </Link>
                        </div>
                    }
                />
            )}
        </Card>
    );
}
