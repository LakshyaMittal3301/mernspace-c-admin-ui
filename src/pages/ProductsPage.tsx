import { useEffect, useMemo, useState } from "react";
import {
    App,
    Avatar,
    Button,
    Card,
    Form,
    Image,
    Input,
    Result,
    Select,
    Space,
    Switch,
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
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import ListHeader from "../components/common/ListHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import TableActions from "../components/common/TableActions";
import ProductDrawer from "../components/products/ProductDrawer";

import { useAuthStore } from "../stores/auth";
import type { Role, Tenant } from "../types";
import {
    listProducts,
    deleteProduct,
    listCategories,
    type ProductListItem,
    type ListProductsParams,
} from "../http/services/catalogApi";
import { getTenants, type TenantsResponse } from "../http/services/authApi";

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "archived", label: "Archived" },
] as const;

export default function ProductsPage() {
    const { message } = App.useApp();
    const qc = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const role: Role | undefined = user?.role;
    const isAdmin = role === "admin";

    // filters
    const [qDraft, setQDraft] = useState("");
    const [q, setQ] = useState("");
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<Array<"draft" | "active" | "archived">>([]);
    const [tenantId, setTenantId] = useState<string | undefined>(undefined);
    const [includeDeleted, setIncludeDeleted] = useState(false);

    // table state (server powered)
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // dropdown data
    const { data: cats } = useQuery({
        queryKey: ["categories", { includeDeleted: false }],
        queryFn: () => listCategories({ includeDeleted: false }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: tenants } = useQuery<TenantsResponse>({
        queryKey: ["tenants"],
        queryFn: getTenants,
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const params: ListProductsParams = useMemo(
        () => ({
            tenantId: isAdmin ? tenantId : undefined,
            categoryId: categoryId || undefined,
            status: status.length ? status : undefined,
            includeDeleted: isAdmin ? includeDeleted : false,
            q: q.trim() || undefined,
            page,
            limit,
            sortBy,
            sortOrder,
        }),
        [isAdmin, tenantId, categoryId, status, includeDeleted, q, page, limit, sortBy, sortOrder]
    );

    const { data, isPending, isFetching, isError, refetch } = useQuery({
        queryKey: ["products", params],
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

    const items = data?.items ?? [];
    const pageInfo = data?.pageInfo;

    // Drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);

    const openCreate = () => {
        setMode("create");
        setEditingId(null);
        setDrawerOpen(true);
    };

    const openEdit = (id: string) => {
        setMode("edit");
        setEditingId(id);
        setDrawerOpen(true);
    };

    const columns: ColumnsType<ProductListItem> = [
        {
            title: "",
            key: "thumb",
            width: 56,
            render: (_v, r) =>
                r.image?.url ? (
                    <Image
                        src={r.image.url}
                        width={40}
                        height={40}
                        style={{ objectFit: "cover", borderRadius: 6 }}
                        preview={false}
                    />
                ) : (
                    <Avatar shape="square" size={40} icon={<PictureOutlined />} />
                ),
        },
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (v, r) => (
                <Typography.Link strong onClick={() => openEdit(r.id)}>
                    {v}
                </Typography.Link>
            ),
            sorter: true,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (s: ProductListItem["status"]) => {
                const map: Record<string, { color: string; text: string }> = {
                    draft: { color: "default", text: "Draft" },
                    active: { color: "green", text: "Active" },
                    archived: { color: "orange", text: "Archived" },
                };
                const t = map[s] ?? map.draft;
                return <Tag color={t.color as any}>{t.text}</Tag>;
            },
        },
        {
            title: "Base Price",
            dataIndex: "basePrice",
            key: "basePrice",
            render: (v: number) => (Number.isFinite(v) ? `₹ ${v}` : "—"),
        },
        {
            title: "Category",
            dataIndex: "categoryId",
            key: "categoryId",
            render: (cid: string) => {
                const n = cats?.find((c) => c.id === cid)?.name;
                return n ? (
                    <Tooltip title={n}>
                        <span>{n}</span>
                    </Tooltip>
                ) : (
                    "—"
                );
            },
        },
        ...(isAdmin
            ? [
                  {
                      title: "Tenant",
                      dataIndex: "tenantId",
                      key: "tenantId",
                      render: (t: string) => <Tag>{t}</Tag>,
                  } as any,
              ]
            : []),
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
                const disabled = !!r.isDeleted;
                return (
                    <TableActions>
                        <Button size="small" icon={<EyeOutlined />} onClick={() => openEdit(r.id)}>
                            View
                        </Button>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openEdit(r.id)}
                            disabled={disabled}
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

    useEffect(() => {
        // prefetch drawer product on hover or filter change if needed (optional)
        return () => {};
    }, []);

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
        current: page,
        pageSize: limit,
        total: pageInfo?.total,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (t) => `Total ${t} products`,
    };

    // delete modal
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
                                        allowClear
                                        placeholder="Category"
                                        value={categoryId}
                                        onChange={(v) => {
                                            setCategoryId(v || undefined);
                                            setPage(1);
                                        }}
                                        style={{ width: 220 }}
                                        options={(cats ?? []).map((c) => ({
                                            value: c.id,
                                            label: c.name,
                                        }))}
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Status"
                                        value={status}
                                        onChange={(vals) => {
                                            setStatus(vals as any);
                                            setPage(1);
                                        }}
                                        style={{ width: 220 }}
                                        options={STATUS_OPTIONS as any}
                                    />
                                </Form.Item>

                                {isAdmin && (
                                    <>
                                        <Form.Item>
                                            <Select
                                                allowClear
                                                placeholder="Tenant"
                                                value={tenantId}
                                                onChange={(v) => {
                                                    setTenantId(v || undefined);
                                                    setPage(1);
                                                }}
                                                style={{ width: 220 }}
                                                options={(tenants?.tenants ?? []).map(
                                                    (t: Tenant) => ({
                                                        value: String(t.id),
                                                        label: t.name,
                                                    })
                                                )}
                                            />
                                        </Form.Item>

                                        <Form.Item label="Show deleted" colon={false}>
                                            <Switch
                                                checked={includeDeleted}
                                                onChange={(checked) => {
                                                    setIncludeDeleted(checked);
                                                    setPage(1);
                                                }}
                                            />
                                        </Form.Item>
                                    </>
                                )}

                                <Form.Item>
                                    <Button
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            setPage(1);
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
                    columns={columns}
                    dataSource={items}
                    pagination={pagination}
                    onChange={(p, _f, sorter: any) => {
                        if (p.current && p.current !== page) setPage(p.current);
                        if (p.pageSize && p.pageSize !== limit) setLimit(p.pageSize);
                        const nextOrder =
                            sorter?.order === "ascend"
                                ? "asc"
                                : sorter?.order === "descend"
                                ? "desc"
                                : sortOrder;
                        const nextKey =
                            sorter?.field === "name"
                                ? "name"
                                : sorter?.field === "createdAt"
                                ? "createdAt"
                                : sorter?.field === "updatedAt"
                                ? "updatedAt"
                                : sortBy;
                        setSortBy(nextKey);
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
                    setMode("edit");
                    setEditingId(p.id);
                    // Optimistically add to cache
                    qc.invalidateQueries({ queryKey: ["products"] });
                    message.success("Product created");
                }}
                onUpdated={() => {
                    qc.invalidateQueries({ queryKey: ["products"] });
                }}
                onDeleted={() => {
                    setDrawerOpen(false);
                    setEditingId(null);
                    qc.invalidateQueries({ queryKey: ["products"] });
                }}
            />

            {/* Delete */}
            <ConfirmModal
                open={deleteOpen}
                title="Delete product?"
                danger
                confirming={confirmingDelete}
                description={
                    <>
                        This will soft-delete <strong>{deleting?.name}</strong>. It will be hidden
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
