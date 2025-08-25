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
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import {
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { Role } from "../types";
import { getUsers, deleteUser } from "../http/services/authApi";
import type { ApiUser, ListUsersApiResponse, GetUsersParams } from "../http/services/authApi";

import ListHeader from "../components/common/ListHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import UserDrawer from "../components/users/UserDrawer";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth";

const ROLE_OPTIONS: Role[] = ["admin", "manager", "customer"];
const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function UsersPage() {
    const { token } = theme.useToken();
    const { message } = App.useApp();
    const selfUser = useAuthStore((s) => s.user)!; // authenticated user

    // filters
    const [qDraft, setQDraft] = useState(""); // what user is typing
    const [q, setQ] = useState(""); // submitted value used for querying
    const [role, setRole] = useState<Role | "all">("all");

    // server-side params (controlled by Table pagination/sorter)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [sort, setSort] = useState<"id" | "createdAt">("id");
    const [order, setOrder] = useState<"asc" | "desc">("desc");

    // create/edit drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingUser, setEditingUser] = useState<ApiUser | null>(null);

    // delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ApiUser | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const params = useMemo<GetUsersParams>(
        () => ({
            page,
            limit,
            sort,
            order,
            q: q.trim() || undefined,
            role: role === "all" ? undefined : role,
        }),
        [page, limit, sort, order, q, role]
    );

    const { data, isPending, isFetching, isError, refetch } = useQuery<ListUsersApiResponse>({
        queryKey: ["user-list", params],
        queryFn: () => getUsers(params),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
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

    const columns: ColumnsType<ApiUser> = [
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
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            sorter: true, // server-side sort via onChange handler
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
                        loading={isFetching}
                        icon={<ReloadOutlined />}
                    >
                        Retry
                    </Button>
                }
            />
        );
    }

    // AntD Table built-in pagination config (controlled)
    const pagination: TablePaginationConfig = {
        current: page,
        pageSize: limit,
        total: data?.total,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total) => `Total ${total} users`,
    };

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
                                        value={qDraft}
                                        onChange={(e) => setQDraft(e.target.value)}
                                        onPressEnter={() => {
                                            setPage(1);
                                            setQ(qDraft.trim());
                                        }}
                                        style={{ width: 260 }}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Select
                                        value={role}
                                        onChange={(val) => {
                                            setRole(val);
                                            setPage(1); // changing params triggers fetch
                                        }}
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
                                    <Button
                                        icon={<SearchOutlined />}
                                        onClick={() => {
                                            setPage(1);
                                            setQ(qDraft.trim()); // changing params triggers the query
                                        }}
                                    >
                                        Search
                                    </Button>
                                </Form.Item>
                            </Form>
                        }
                        right={
                            <Space>
                                <Button
                                    onClick={() => refetch()}
                                    loading={isFetching}
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
                <Table<ApiUser>
                    rowKey="id"
                    loading={isPending || isFetching}
                    columns={columns}
                    dataSource={data?.rows ?? []}
                    pagination={pagination}
                    onChange={(p, _filters, sorter: any) => {
                        // Pagination changes
                        if (p.current !== page) setPage(p.current || 1);
                        if (p.pageSize && p.pageSize !== limit) {
                            setLimit(p.pageSize);
                            // reset to page 1 when pageSize changes
                            if ((p.current || 1) !== 1) setPage(1);
                        }
                        // Sorting changes
                        const nextOrder =
                            sorter?.order === "ascend"
                                ? "asc"
                                : sorter?.order === "descend"
                                ? "desc"
                                : order;
                        const nextSort = sorter?.field === "createdAt" ? "createdAt" : "id";
                        if (nextSort !== sort) setSort(nextSort);
                        if (nextOrder !== order) setOrder(nextOrder);
                    }}
                    locale={{ emptyText: "No users yet" }}
                />
            </Card>

            {/* Drawer */}
            <UserDrawer
                mode={mode}
                open={drawerOpen && (mode !== "edit" || !!editingUser)} // guard
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
