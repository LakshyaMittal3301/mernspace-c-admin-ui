// src/pages/ProductsPage.tsx
import { useMemo, useState } from "react";
import {
    App,
    Button,
    Card,
    Checkbox,
    Form,
    Image,
    Input,
    Result,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import {
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    PlusOutlined,
    PictureOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, keepPreviousData, useQueryClient } from "@tanstack/react-query";

import ListHeader from "../components/common/ListHeader";
import TableActions from "../components/common/TableActions";
import ConfirmModal from "../components/common/ConfirmModal";
import ProductDrawer from "../components/products/ProductDrawer";

import { useAuthStore } from "../stores/auth";
import type { Role } from "../types";

import {
    listProducts,
    deleteProduct,
    type ListProductsParams,
    type ListProductsResponse,
    type ProductListItem,
} from "../http/services/catalogApi";
import { listCategories, type CategoryListItem } from "../http/services/catalogApi";
import { getTenants, type TenantsResponse } from "../http/services/authApi";

let STATUS_OPTIONS = [
    { label: "Draft", value: "draft" },
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
];

export default function ProductsPage() {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const role = user?.role as Role | undefined;
    const isAdmin = role === "admin";

    // Filters
    const [qDraft, setQDraft] = useState("");
    const [q, setQ] = useState("");
    const [categoryId, setCategoryId] = useState<string | "all">("all");
    const [status, setStatus] = useState<Array<"draft" | "active" | "archived">>([]);
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [tenantId, setTenantId] = useState<string | "all">("all");

    // Server-side paging/sort (supported by API)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Options
    const { data: catsData } = useQuery({
        queryKey: ["categories", { includeDeleted: false }],
        queryFn: () => listCategories({ includeDeleted: false }),
        staleTime: 5 * 60 * 1000,
    });
    const categories = catsData ?? [];

    const { data: tenantsData } = useQuery<TenantsResponse>({
        queryKey: ["tenant-list"],
        queryFn: getTenants,
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const params = useMemo<ListProductsParams>(
        () => ({
            tenantId: isAdmin && tenantId !== "all" ? tenantId : undefined,
            categoryId: categoryId !== "all" ? categoryId : undefined,
            status: status.length ? status : undefined,
            includeDeleted: isAdmin ? includeDeleted : undefined,
            q: q.trim() || undefined,
            page,
            limit,
            sortBy,
            sortOrder,
        }),
        [isAdmin, tenantId, categoryId, status, includeDeleted, q, page, limit, sortBy, sortOrder]
    );

    const { data, isPending, isFetching, isError, refetch } = useQuery<ListProductsResponse>({
        queryKey: ["product-list", params],
        queryFn: () => listProducts(params),
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });

    const delMut = useMutation({
        mutationFn: (id: string) => deleteProduct(id),
        onSuccess: () => {
            message.success("Product deleted");
            refetch();
        },
        onError: (err: any) => message.error(err?.message || "Failed to delete product"),
    });

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const openCreate = () => {
        setMode("create");
        setEditingId(null);
        setDrawerOpen(true);
    };
    const openEdit = (id: string, archivedOrDeleted: boolean) => {
        // Prefetch detail so drawer feels instant
        queryClient.prefetchQuery({
            queryKey: [
                "product",
                id,
                { includeDeleted: archivedOrDeleted || (isAdmin && includeDeleted) },
            ],
            queryFn: () =>
                import("../http/services/catalogApi").then(({ getProduct }) =>
                    getProduct(id, {
                        includeDeleted: archivedOrDeleted || (isAdmin && includeDeleted),
                    })
                ),
            staleTime: 60_000,
        });
        setMode("edit");
        setEditingId(id);
        setDrawerOpen(true);
    };

    const rows = data?.items ?? [];
    const pageInfo = data?.pageInfo ?? { page: 1, limit: 20, total: 0, hasNextPage: false };

    const columns: ColumnsType<ProductListItem> = [
        {
            title: "Product",
            key: "name",
            render: (_v, r) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {r.image?.url ? (
                        <Image
                            width={40}
                            height={40}
                            src={r.image.url}
                            alt={r.name}
                            fallback=""
                            style={{ objectFit: "cover", borderRadius: 6 }}
                            preview={false}
                        />
                    ) : (
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 6,
                                background: "var(--ant-color-fill-tertiary)",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            <PictureOutlined />
                        </div>
                    )}
                    <div>
                        <Typography.Link
                            style={{ fontWeight: 600 }}
                            onClick={() => openEdit(r.id, r.isDeleted || r.status === "archived")}
                        >
                            {r.name}
                        </Typography.Link>
                        <div style={{ fontSize: 12, color: "var(--ant-color-text-tertiary)" }}>
                            {r.description ? (
                                <Tooltip title={r.description}>
                                    <span>{r.description}</span>
                                </Tooltip>
                            ) : (
                                "—"
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        ...(isAdmin
            ? [
                  {
                      title: "Tenant",
                      dataIndex: "tenantId",
                      key: "tenantId",
                      render: (t: string) => <Tag>{t}</Tag>,
                  },
              ]
            : []),
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (s: ProductListItem["status"]) => {
                const map = {
                    draft: { color: "default", text: "Draft" },
                    active: { color: "success", text: "Active" },
                    archived: { color: "warning", text: "Archived" },
                } as const;
                const it = map[s] ?? map.draft;
                return <Tag color={it.color as any}>{it.text}</Tag>;
            },
            filters: STATUS_OPTIONS.map((o) => ({ text: o.label, value: o.value })),
        },
        {
            title: "Base Price",
            dataIndex: "basePrice",
            key: "basePrice",
            render: (v: number) => (Number.isFinite(v) ? `₹ ${v}` : "—"),
            sorter: true,
        },
        {
            title: "Created",
            dataIndex: "createdAt",
            key: "createdAt",
            sorter: true,
            render: formatDate,
        },
        {
            title: "Updated",
            dataIndex: "updatedAt",
            key: "updatedAt",
            sorter: true,
            render: formatDate,
        },
        {
            title: "Actions",
            key: "actions",
            render: (_v, r) => (
                <TableActions>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => openEdit(r.id, r.isDeleted || r.status === "archived")}
                    >
                        View
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(r.id, r.isDeleted || r.status === "archived")}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setDeleting(r);
                            setDeleteOpen(true);
                        }}
                    >
                        Delete
                    </Button>
                </TableActions>
            ),
        },
    ];

    if (isError) {
        return (
            <Result
                status="error"
                title="Failed to load products"
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

    const pagination: TablePaginationConfig = {
        current: pageInfo.page,
        pageSize: pageInfo.limit,
        total: pageInfo.total,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (t) => `Total ${t} products`,
    };

    // Delete modal
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ProductListItem | null>(null);
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
                                        placeholder="Search name or description"
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
                                        placeholder="Category"
                                        value={categoryId}
                                        onChange={(v) => {
                                            setCategoryId(v);
                                            setPage(1);
                                        }}
                                        style={{ width: 220 }}
                                        options={[
                                            { value: "all", label: "All categories" },
                                            ...categories.map((c: CategoryListItem) => ({
                                                value: c.id,
                                                label: c.name,
                                            })),
                                        ]}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Select
                                        mode="multiple"
                                        placeholder="Status"
                                        value={status}
                                        onChange={(v) => {
                                            setStatus(v);
                                            setPage(1);
                                        }}
                                        style={{ width: 240 }}
                                        options={STATUS_OPTIONS}
                                    />
                                </Form.Item>

                                {isAdmin && (
                                    <>
                                        <Form.Item>
                                            <Select
                                                placeholder="Tenant"
                                                value={tenantId}
                                                onChange={(v) => {
                                                    setTenantId(v);
                                                    setPage(1);
                                                }}
                                                style={{ width: 240 }}
                                                options={[
                                                    { value: "all", label: "All tenants" },
                                                    ...(tenantsData?.tenants ?? []).map((t) => ({
                                                        value: String(t.id),
                                                        label: t.name,
                                                    })),
                                                ]}
                                            />
                                        </Form.Item>
                                        <Form.Item>
                                            <Checkbox
                                                checked={includeDeleted}
                                                onChange={(e) => {
                                                    setIncludeDeleted(e.target.checked);
                                                    setPage(1);
                                                }}
                                            >
                                                Show deleted
                                            </Checkbox>
                                        </Form.Item>
                                    </>
                                )}

                                <Form.Item>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            setQ(qDraft.trim());
                                            refetch();
                                        }}
                                        loading={isFetching}
                                    >
                                        Refresh
                                    </Button>
                                </Form.Item>
                            </Form>
                        }
                        right={
                            <Space>
                                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                                    New Product
                                </Button>
                            </Space>
                        }
                    />
                }
            >
                <Table<ProductListItem>
                    rowKey="id"
                    loading={isPending || isFetching}
                    columns={columns as ColumnsType<any>}
                    dataSource={rows}
                    pagination={pagination}
                    onChange={(p, _filters, sorter: any) => {
                        const nextPage = p.current ?? 1;
                        const nextLimit = p.pageSize ?? 20;
                        if (nextPage !== page) setPage(nextPage);
                        if (nextLimit !== limit) setLimit(nextLimit);

                        const nextOrder =
                            sorter?.order === "ascend"
                                ? "asc"
                                : sorter?.order === "descend"
                                ? "desc"
                                : sortOrder;
                        const nextSort =
                            sorter?.field === "name"
                                ? "name"
                                : sorter?.field === "updatedAt"
                                ? "updatedAt"
                                : "createdAt";
                        setSortBy(nextSort);
                        setSortOrder(nextOrder);
                    }}
                    locale={{ emptyText: "No products yet" }}
                />
            </Card>

            {/* Drawer */}
            <ProductDrawer
                mode={mode}
                open={drawerOpen}
                productId={mode === "edit" ? editingId ?? undefined : undefined}
                isAdmin={isAdmin}
                onClose={() => {
                    setDrawerOpen(false);
                    setEditingId(null);
                }}
                onCreated={(p) => {
                    // immediately switch into edit mode for the new product
                    setMode("edit");
                    setEditingId(p.id);
                    message.success("Product created");
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
            />

            {/* Delete modal */}
            <ConfirmModal
                open={deleteOpen}
                title="Delete product?"
                danger
                confirming={confirmingDelete}
                description={
                    <>
                        This will soft delete <strong>{deleting?.name}</strong>. It will be hidden
                        by default.
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
