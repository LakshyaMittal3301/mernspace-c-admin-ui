// src/pages/Categories.tsx
import { useMemo, useState } from "react";
import { Card, Table, Result, Button, Typography, Form, Input, Checkbox, Space, App } from "antd";
import type { ColumnsType, TablePaginationConfig, TableProps } from "antd/es/table";
import { EditOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import ListHeader from "../components/common/ListHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import TableActions from "../components/common/TableActions";
import CategoryDrawer from "../components/categories/CategoryDrawer";

import type { Role } from "../types";
import { useAuthStore } from "../stores/auth";
import {
    listCategories,
    deleteCategory,
    getCategory,
    type CategoryListItem,
} from "../http/services/catalogApi";

export default function CategoriesPage() {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const role: Role | undefined = user?.role;
    const isAdmin = role === "admin";

    // search & filter
    const [qDraft, setQDraft] = useState("");
    const [q, setQ] = useState("");
    const [includeDeleted, setIncludeDeleted] = useState(false); // Admin only

    // table state (client-side for now)
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sortKey, setSortKey] = useState<"name" | "createdAt" | "updatedAt">("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const { data, isLoading, isRefetching, isError, refetch } = useQuery({
        queryKey: ["categories", { includeDeleted: isAdmin && includeDeleted }],
        queryFn: () =>
            listCategories({ includeDeleted: isAdmin && includeDeleted ? true : undefined }),
        staleTime: 60_000,
    });

    const delMut = useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            message.success("Category deleted");
            refetch();
        },
        onError: (err: any) => message.error(err?.message || "Failed to delete category"),
    });

    const all: CategoryListItem[] = data ?? [];

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        let out = all;
        if (needle) out = out.filter((c) => c.name.toLowerCase().includes(needle));
        return [...out].sort((a, b) => {
            const dir = sortOrder === "asc" ? 1 : -1;
            if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
            const da = new Date((a as any)[sortKey]).getTime();
            const db = new Date((b as any)[sortKey]).getTime();
            return (da - db) * dir;
        });
    }, [all, q, sortKey, sortOrder]);

    // pagination slice
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = filtered.slice(start, end);

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);

    const openCreate = () => {
        setMode("create");
        setEditingId(null);
        setDrawerOpen(true);
    };

    const openEdit = (id: string, isDeletedRow: boolean) => {
        // prefetch detail for snappy drawer
        queryClient.prefetchQuery({
            queryKey: [
                "category",
                id,
                { includeDeleted: isAdmin && (includeDeleted || isDeletedRow) },
            ],
            queryFn: () =>
                getCategory(id, { includeDeleted: isAdmin && (includeDeleted || isDeletedRow) }),
            staleTime: 60_000,
        });
        setMode("edit");
        setEditingId(id);
        setDrawerOpen(true);
    };

    const columns: ColumnsType<CategoryListItem> = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            sorter: true,
            render: (value: string, r) => (
                <span>
                    <Typography.Link
                        onClick={() => openEdit(r.id, !!r.isDeleted)}
                        onMouseEnter={() => {
                            if (!isAdmin) return;
                            if (r.isDeleted) {
                                queryClient.prefetchQuery({
                                    queryKey: ["category", r.id, { includeDeleted: true }],
                                    queryFn: () => getCategory(r.id, { includeDeleted: true }),
                                    staleTime: 60_000,
                                });
                            }
                        }}
                        style={{ fontWeight: 600 }}
                    >
                        {value}
                    </Typography.Link>
                    {isAdmin && includeDeleted && r.isDeleted ? (
                        <span style={{ marginLeft: 8 }}>
                            <Typography.Text type="danger">(Deleted)</Typography.Text>
                        </span>
                    ) : null}
                </span>
            ),
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            sorter: true,
            render: (v: string) => formatDate(v),
        },
        {
            title: "Updated",
            dataIndex: "updatedAt",
            key: "updatedAt",
            sorter: true,
            render: (v: string) => formatDate(v),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_v, r) => {
                const disabled = !!r.isDeleted || !isAdmin;
                if (!isAdmin) return null; // managers: no actions
                return (
                    <TableActions>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={disabled}
                            onClick={() => openEdit(r.id, !!r.isDeleted)}
                        >
                            Edit
                        </Button>
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={disabled}
                            onClick={() => {
                                setDeleting(r);
                                setDeleteOpen(true);
                            }}
                        >
                            Delete
                        </Button>
                    </TableActions>
                );
            },
        },
    ];

    if (isError) {
        return (
            <Result
                status="error"
                title="Failed to load categories"
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

    const pagination: TablePaginationConfig = {
        current: page,
        pageSize,
        total: filtered.length,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total) => `Total ${total} categories`,
    };

    // delete modal state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<CategoryListItem | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    return (
        <>
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
                                        placeholder="Search name"
                                        value={qDraft}
                                        onChange={(e) => setQDraft(e.target.value)}
                                        onPressEnter={() => {
                                            setPage(1);
                                            setQ(qDraft.trim());
                                        }}
                                        style={{ width: 260 }}
                                    />
                                </Form.Item>
                                {isAdmin && (
                                    <Form.Item>
                                        <Checkbox
                                            checked={includeDeleted}
                                            onChange={(e) => {
                                                setIncludeDeleted(e.target.checked);
                                                setPage(1);
                                                refetch();
                                            }}
                                        >
                                            Show deleted
                                        </Checkbox>
                                    </Form.Item>
                                )}
                                <Form.Item>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => refetch()}
                                        loading={isRefetching}
                                    >
                                        Refresh
                                    </Button>
                                </Form.Item>
                            </Form>
                        }
                        right={
                            isAdmin ? (
                                <Space>
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={openCreate}
                                    >
                                        New Category
                                    </Button>
                                </Space>
                            ) : (
                                <span />
                            )
                        }
                    />
                }
            >
                <Table<CategoryListItem>
                    rowKey="id"
                    loading={isLoading || isRefetching}
                    columns={columns as ColumnsType<any>}
                    dataSource={pageRows}
                    pagination={pagination}
                    onChange={(p, _f, sorter: any) => {
                        if (p.current && p.current !== page) setPage(p.current);
                        if (p.pageSize && p.pageSize !== pageSize) {
                            setPageSize(p.pageSize);
                            if ((p.current || 1) !== 1) setPage(1);
                        }
                        const nextOrder =
                            sorter?.order === "ascend"
                                ? "asc"
                                : sorter?.order === "descend"
                                ? "desc"
                                : sortOrder;
                        const nextKey: any =
                            sorter?.field === "createdAt"
                                ? "createdAt"
                                : sorter?.field === "updatedAt"
                                ? "updatedAt"
                                : sorter?.field === "name"
                                ? "name"
                                : sortKey;
                        setSortKey(nextKey);
                        setSortOrder(nextOrder);
                    }}
                    locale={{ emptyText: "No categories yet" }}
                />
            </Card>

            {/* Drawer */}
            <CategoryDrawer
                mode={mode}
                open={drawerOpen}
                categoryId={mode === "edit" ? editingId ?? undefined : undefined}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditingId(null);
                }}
                onCreated={(cat) => {
                    message.success("Category created");
                    // swap into edit mode on newly created id
                    setMode("edit");
                    setEditingId(cat.id);
                    queryClient.setQueryData(["category", cat.id, { includeDeleted: false }], cat);
                    refetch();
                }}
                onUpdated={() => {
                    refetch();
                }}
                onDeleted={() => {
                    setDrawerOpen(false);
                    setEditingId(null);
                    refetch();
                }}
                isAdmin={isAdmin}
            />

            {/* Delete modal */}
            <ConfirmModal
                open={deleteOpen}
                title="Delete category?"
                danger
                confirming={confirmingDelete}
                description={
                    <>
                        This will soft delete <strong>{deleting?.name}</strong>. It will be hidden
                        by default and read-only.
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
                        refetch();
                    } finally {
                        setConfirmingDelete(false);
                    }
                }}
            />
        </>
    );
}

function formatDate(v?: string | Date | null) {
    if (!v) return "—";
    const d = typeof v === "string" ? new Date(v) : v;
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}
