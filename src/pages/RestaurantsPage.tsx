import { useMemo, useState } from "react";
import { Card, Table, Result, Button, Typography, Tooltip, Form, App } from "antd";
import type { TableProps } from "antd";
import { EyeOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";

import type { Tenant } from "../types";
import {
    getTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    type TenantsResponse,
} from "../http/api";

// common helpers
import ListHeader from "../components/common/ListHeader";
import ConfirmModal from "../components/common/ConfirmModal";
import UpsertDrawer from "../components/common/UpsertDrawer";
import TableActions from "../components/common/TableActions";

// entity form
import TenantForm, { type TenantValues } from "../components/tenants/TenantForm";

export default function RestaurantsPage() {
    const { message } = App.useApp();

    // modal state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<Tenant | null>(null);

    // local, modal-only spinner
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // react-query mutation (no UI bound to its isPending)
    const delMut = useMutation({
        mutationFn: (id: number) => deleteTenant(id),
        onError: (err: any) => message.error(err?.message || "Failed to delete"),
    });

    // list query
    const { data, isLoading, isRefetching, isError, refetch } = useQuery<TenantsResponse>({
        queryKey: ["tenant-list"],
        queryFn: getTenants,
        staleTime: 5 * 60 * 1000,
    });

    // local state
    const [q, setQ] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
    const [editing, setEditing] = useState<{ id: number; name: string; address: string }>();

    const [_pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    // mutations
    const createMut = useMutation({ mutationFn: createTenant });
    const updateMut = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: TenantValues }) =>
            updateTenant(id, payload),
    });

    // table data (client filter now; server later)
    const all = data?.tenants ?? [];
    const filtered = useMemo(() => {
        const qn = q.trim().toLowerCase();
        if (!qn) return all;
        return all.filter(
            (t) => t.name.toLowerCase().includes(qn) || (t.address ?? "").toLowerCase().includes(qn)
        );
    }, [all, q]);

    // columns
    const columns: TableProps<Tenant>["columns"] = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
        },
        {
            title: "Address",
            dataIndex: "address",
            key: "address",
            render: (addr: string) =>
                addr ? (
                    <Tooltip title={addr}>
                        <Typography.Paragraph style={{ margin: 0 }} ellipsis={{ rows: 1 }}>
                            {addr}
                        </Typography.Paragraph>
                    </Tooltip>
                ) : (
                    "—"
                ),
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
            render: (_value, record) => (
                <TableActions>
                    <Link to={`/restaurants/${record.id}`}>
                        <Button size="small" icon={<EyeOutlined />}>
                            View
                        </Button>
                    </Link>

                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setEditing({
                                id: record.id,
                                name: record.name,
                                address: record.address,
                            });
                            setDrawerMode("edit");
                            setDrawerOpen(true);
                        }}
                    >
                        Edit
                    </Button>

                    {/* No loading here; only modal shows loading */}
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setDeleting(record);
                            setPendingDeleteId(record.id);
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
                title="Failed to load tenants"
                subTitle="Please try again."
                extra={
                    <Button type="primary" onClick={() => refetch()} loading={isRefetching}>
                        Retry
                    </Button>
                }
            />
        );
    }

    // Drawer form instance
    const [form] = Form.useForm<TenantValues>();
    const submitting = createMut.isPending || updateMut.isPending;

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (drawerMode === "create") {
                await createMut.mutateAsync(values);
                message.success("Restaurant created");
            } else if (drawerMode === "edit" && editing) {
                await updateMut.mutateAsync({ id: editing.id, payload: values });
                message.success("Restaurant updated");
            }
            setDrawerOpen(false);
            setEditing(undefined);
            refetch();
            form.resetFields();
        } catch {
            // antd validation handles field errors
        }
    };

    return (
        <>
            <Card
                bordered={false}
                style={{ marginTop: 8 }}
                styles={{ header: { padding: "12px 16px" }, body: { padding: 16 } }}
                title={
                    <ListHeader
                        q={q}
                        onChangeQ={setQ}
                        onSearchClick={() => refetch()} // later: add { q } to queryKey for server search
                        onRefresh={() => refetch()}
                        refreshLoading={isRefetching}
                        primaryText="New Restaurant"
                        onPrimary={() => {
                            setEditing(undefined);
                            setDrawerMode("create");
                            setDrawerOpen(true);
                        }}
                    />
                }
            >
                <Table<Tenant>
                    rowKey="id"
                    loading={isLoading || isRefetching}
                    columns={columns}
                    dataSource={filtered}
                    // pagination={false}
                    locale={{ emptyText: "No restaurants yet" }}
                />
            </Card>

            <UpsertDrawer
                open={drawerOpen}
                mode={drawerMode}
                titleCreate="Create Restaurant"
                titleEdit="Edit Restaurant"
                onClose={() => {
                    setDrawerOpen(false);
                    setEditing(undefined);
                }}
                onSubmit={handleSubmit}
                submitting={submitting}
            >
                <TenantForm
                    form={form}
                    mode={drawerMode}
                    initial={
                        drawerMode === "edit"
                            ? { name: editing?.name ?? "", address: editing?.address ?? "" }
                            : undefined
                    }
                />
            </UpsertDrawer>

            <ConfirmModal
                open={deleteOpen}
                title="Delete tenant?"
                danger
                confirming={confirmingDelete} // ✅ drive spinner locally
                description={
                    <>
                        This will remove <strong>{deleting?.name}</strong>. You can’t undo this.
                    </>
                }
                onCancel={() => {
                    if (confirmingDelete) return; // guard
                    setDeleteOpen(false);
                    setDeleting(null);
                }}
                onConfirm={async () => {
                    if (!deleting) return;
                    try {
                        setConfirmingDelete(true); // start spinner
                        await delMut.mutateAsync(deleting.id);
                        message.success(`Deleted "${deleting.name}"`);
                        setDeleteOpen(false);
                        setDeleting(null);
                        refetch();
                    } finally {
                        setConfirmingDelete(false); // stop spinner, even on error
                    }
                }}
            />
        </>
    );
}
