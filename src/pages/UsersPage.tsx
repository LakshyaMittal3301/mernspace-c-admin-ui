// src/pages/users/UsersPage.tsx
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
    App,
} from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import type { TableProps } from "antd";
import type { User, Role } from "../types";
import { getUsers, type UsersResponse, deleteUser } from "../http/api";
import { useAuthStore } from "../stores/auth";

import ListHeader from "../components/common/ListHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import UserDrawer from "../components/users/UserDrawer";
import { Link } from "react-router-dom";

const ROLE_OPTIONS: Role[] = ["admin", "manager", "customer"];
const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function UsersPage() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const selfUser = useAuthStore((s) => s.user)!; // authenticated user

    // filters
    const [q, setQ] = useState("");
    const [role, setRole] = useState<Role | "all">("all");

    // create/edit drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<User | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const { data, isLoading, isRefetching, isError, refetch } = useQuery<UsersResponse>({
        queryKey: ["user-list"],
        queryFn: getUsers,
        staleTime: 5 * 60 * 1000,
    });

    // standalone mutation; UI tied to our own confirmingDelete state
    const delMut = useMutation({
        mutationFn: (id: number) => deleteUser(id),
        onError: (err: any) => message.error(err?.message || "Failed to delete user"),
    });

    const roleTagStyles = (r: Role) => {
        switch (r) {
            case "admin":
                return { bg: token.colorInfoBg, bd: token.colorInfo, fg: token.colorInfoText };
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
        const { bg, bd, fg } = roleTagStyles(value);
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
                {toTitle(value)}
            </Tag>
        );
    };

    const columns: TableProps<User>["columns"] = [
        {
            title: "Name",
            key: "name",
            render: (_v, r) => (
                <Typography.Text style={{ fontWeight: 600 }}>
                    {r.firstName} {r.lastName}
                </Typography.Text>
            ),
        },
        { title: "Email", dataIndex: "email", key: "email" },
        {
            title: "Role",
            dataIndex: "role",
            key: "role",
            render: (r: Role) => <RoleTag value={r} />,
            filters: ROLE_OPTIONS.map((r) => ({ text: toTitle(r), value: r })),
            onFilter: (value, rec) => rec.role === value,
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (v: string | Date | undefined) => {
                if (!v) return "—";
                const d = typeof v === "string" ? new Date(v) : v;
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
            render: (_v, r) => {
                const cannotDelete = selfUser?.id === r.id; // cannot delete self
                return (
                    <Space>
                        <Link to={`/users/${r.id}`}>
                            <Button size="small" icon={<EyeOutlined />}>
                                View
                            </Button>
                        </Link>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setMode("edit");
                                setEditingUser(r);
                                setDrawerOpen(true);
                            }}
                        >
                            Edit
                        </Button>
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={cannotDelete}
                            onClick={() => {
                                if (cannotDelete) return;
                                setDeleting(r);
                                setDeleteOpen(true);
                            }}
                        >
                            Delete
                        </Button>
                    </Space>
                );
            },
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
    const filteredUsers = useMemo(() => {
        const qn = q.trim().toLowerCase();
        return allUsers.filter((u) => {
            const matchesQuery =
                !qn ||
                u.email.toLowerCase().includes(qn) ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(qn);
            const matchesRole = role === "all" || u.role === role;
            return matchesQuery && matchesRole;
        });
    }, [allUsers, q, role]);

    return (
        <>
            {/* Header (filters + actions) */}
            <Card
                bordered={false}
                style={{ marginTop: 8 }}
                styles={{ header: { padding: "12px 16px" }, body: { padding: 16 } }}
                title={
                    <ListHeader
                        left={
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
                                        onChange={setRole}
                                        style={{ width: 180 }}
                                        options={[
                                            { value: "all", label: "All roles" },
                                            ...ROLE_OPTIONS.map((r) => ({
                                                value: r,
                                                label: toTitle(r),
                                            })),
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Button icon={<SearchOutlined />} onClick={() => refetch()}>
                                        Search
                                    </Button>
                                </Form.Item>
                            </Form>
                        }
                        right={
                            <Space>
                                <Button
                                    onClick={() => refetch()}
                                    loading={isRefetching}
                                    icon={<ReloadOutlined />}
                                >
                                    Refresh
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => {
                                        setMode("create");
                                        setEditingUser(null);
                                        setDrawerOpen(true);
                                    }}
                                >
                                    New User
                                </Button>
                            </Space>
                        }
                    />
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

            {/* Drawer */}
            <UserDrawer
                mode={mode}
                open={drawerOpen && (mode !== "edit" || !!editingUser)} // ✅ guard
                onClose={() => setDrawerOpen(false)}
                onSaved={() => {
                    setDrawerOpen(false);
                    setEditingUser(null);
                    refetch();
                }}
                {...(mode === "edit" && editingUser ? { user: editingUser } : ({} as any))}
            />

            {/* Delete modal */}
            <ConfirmModal
                open={deleteOpen}
                title="Delete user?"
                danger
                confirming={confirmingDelete}
                description={
                    <>
                        This will remove{" "}
                        <strong>
                            {deleting?.firstName} {deleting?.lastName}
                        </strong>
                        . You can’t undo this.
                    </>
                }
                onCancel={() => {
                    if (confirmingDelete) return;
                    setDeleteOpen(false);
                    setDeleting(null);
                }}
                onConfirm={async () => {
                    if (!deleting) return;
                    try {
                        setConfirmingDelete(true);
                        await delMut.mutateAsync(deleting.id);
                        setDeleteOpen(false);
                        setDeleting(null);
                        message.success("User deleted");
                        refetch();
                    } finally {
                        setConfirmingDelete(false);
                    }
                }}
            />
        </>
    );
}
