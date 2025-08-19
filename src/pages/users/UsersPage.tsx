import { useMemo, useState } from "react";
import {
    Card,
    Table,
    Tag,
    Result,
    Button,
    Typography,
    theme,
    Form,
    Input,
    Select,
    Space,
} from "antd";
import { useQuery } from "@tanstack/react-query";
import { PlusOutlined, ReloadOutlined, SearchOutlined, EyeOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import type { TableProps } from "antd";
import type { User, Role } from "../../types";
import { getUsers, type UsersResponse } from "../../http/api";

const ROLE_OPTIONS: Role[] = ["admin", "manager", "customer"];

const toTitleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function UsersPage() {
    const { token } = theme.useToken();

    // local UI state (client-side filter for now)
    const [q, setQ] = useState<string>("");
    const [role, setRole] = useState<Role | "all">("all");

    const { data, isLoading, isRefetching, isError, refetch } = useQuery<UsersResponse>({
        queryKey: ["user-list"], // later include { q, role, page, pageSize }
        queryFn: getUsers,
        staleTime: 5 * 60 * 1000,
    });

    // role → subtle tag styles using tokens (light/dark friendly)
    const roleStyles = (r: Role) => {
        switch (r) {
            case "admin":
                return {
                    bg: token.colorInfoBg,
                    bd: token.colorInfo, // border
                    fg: token.colorInfoText, // text
                };
            case "manager":
                return {
                    bg: token.colorWarningBg,
                    bd: token.colorWarning,
                    fg: token.colorWarningText,
                };
            case "customer":
                return {
                    bg: token.colorSuccessBg,
                    bd: token.colorSuccess,
                    fg: token.colorSuccessText,
                };
            default:
                return {
                    bg: token.colorFillQuaternary,
                    bd: token.colorBorderSecondary,
                    fg: token.colorTextSecondary,
                };
        }
    };

    const RoleTag = ({ value }: { value: Role }) => {
        const { bg, bd, fg } = roleStyles(value);
        return (
            <Tag
                style={{
                    background: bg,
                    color: fg,
                    borderColor: bd,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderRadius: 999,
                    fontWeight: 500,
                    paddingInline: 10,
                }}
            >
                {toTitleCase(value)}
            </Tag>
        );
    };

    const columns: TableProps<User>["columns"] = [
        {
            title: "Name",
            key: "name",
            render: (_value, record) => (
                <Typography.Text style={{ fontWeight: 600 }}>
                    {record.firstName} {record.lastName}
                </Typography.Text>
            ),
        },
        { title: "Email", dataIndex: "email", key: "email" },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (r: Role) => <RoleTag value={r} />,
            filters: ROLE_OPTIONS.map((r) => ({ text: toTitleCase(r), value: r })), // local filter UI only
            onFilter: (value, rec) => rec.role === value,
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (value: string | Date | undefined) => {
                if (!value) return "—";
                const d = typeof value === "string" ? new Date(value) : value;
                return new Intl.DateTimeFormat(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                }).format(d);
            },
        },
        {
            title: "Actions",
            key: "actions",
            align: "left",
            render: (_value, record) => (
                <Link to={`/users/${record.id}`}>
                    <Button size="small" icon={<EyeOutlined />}>
                        View
                    </Button>
                </Link>
            ),
        },
    ];

    if (isError) {
        return (
            <Result
                status="error"
                title="Failed to load users"
                subTitle="Please try again."
                extra={
                    <Button
                        type="primary"
                        onClick={() => refetch()}
                        loading={isRefetching}
                        icon={<ReloadOutlined />}
                    >
                        Retry
                    </Button>
                }
            />
        );
    }

    const allUsers = data?.users ?? [];

    // client-side filtering for now
    const filteredUsers = useMemo(() => {
        const qnorm = q.trim().toLowerCase();
        return allUsers.filter((u) => {
            const matchesQuery =
                !qnorm ||
                u.email.toLowerCase().includes(qnorm) ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(qnorm);
            const matchesRole = role === "all" || u.role === role;
            return matchesQuery && matchesRole;
        });
    }, [allUsers, q, role]);

    return (
        <Card
            bordered={false}
            style={{ marginTop: 8 }} // <-- remove this margin if you don't want extra top spacing
            styles={{
                header: { padding: "12px 16px" },
                body: { padding: 16 },
            }}
            title={
                <Form layout="inline" onSubmitCapture={(e) => e.preventDefault()}>
                    <Form.Item>
                        <Input
                            allowClear
                            placeholder="Search name or email"
                            prefix={<SearchOutlined />}
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            style={{ width: 260 }}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Select
                            value={role}
                            onChange={(v) => setRole(v)}
                            style={{ width: 180 }}
                            options={[
                                { value: "all", label: "All roles" },
                                ...ROLE_OPTIONS.map((r) => ({ value: r, label: toTitleCase(r) })),
                            ]}
                        />
                    </Form.Item>

                    <Form.Item>
                        {/* This button will eventually trigger server-side filter:
               - move { q, role } into React Query key and to getUsers params */}
                        <Button icon={<SearchOutlined />} onClick={() => refetch()}>
                            Search
                        </Button>
                    </Form.Item>
                </Form>
            }
            extra={
                <Space>
                    <Button
                        onClick={() => refetch()}
                        loading={isRefetching}
                        icon={<ReloadOutlined />}
                    >
                        Refresh
                    </Button>
                    <Link to="/users/create">
                        <Button type="primary" icon={<PlusOutlined />}>
                            New User
                        </Button>
                    </Link>
                </Space>
            }
        >
            <Table<User>
                rowKey="id"
                loading={isLoading || isRefetching}
                columns={columns}
                dataSource={filteredUsers}
                pagination={false}
                locale={{ emptyText: "No users yet" }}
            />
        </Card>
    );
}
