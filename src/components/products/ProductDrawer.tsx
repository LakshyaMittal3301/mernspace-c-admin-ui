// src/components/products/ProductDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import {
    App,
    Avatar,
    Button,
    Divider,
    Drawer,
    Empty,
    Form,
    Image,
    Input,
    InputNumber,
    Modal,
    Radio,
    Select,
    Space,
    Switch,
    Tabs,
    Tag,
    Typography,
    Upload,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Role } from "../../types";
import { useAuthStore } from "../../stores/auth";

import {
    addModification,
    addModificationOptions,
    getCategory,
    getProduct,
    listCategories,
    presignUpload,
    setBaseRadio,
    setDefaultRadioOption,
    updateModification,
    updateModificationOption,
    updateProduct,
    type Category,
    type CategoryListItem,
    type Id,
    type Product,
    type ProductStatus,
} from "../../http/services/catalogApi";
import { getTenants, type TenantsResponse } from "../../http/services/authApi";

type Props = {
    mode: "create" | "edit";
    open: boolean;
    productId?: Id;
    isAdmin: boolean;
    onClose: () => void;
    onCreated: (product: Product) => void;
    onUpdated: () => void;
    onDeleted: () => void;
};

const STATUS_OPTIONS: ProductStatus[] = ["draft", "active", "archived"];

export default function ProductDrawer({
    mode,
    open,
    productId,
    isAdmin,
    onClose,
    onCreated,
    onUpdated,
}: Props) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const user = useAuthStore((s) => s.user);
    const role = (user?.role ?? "customer") as Role;
    const readOnly = false; // Managers can edit; archived/deleted still allow edits per rules

    // ----- Base data -----
    const { data: cats } = useQuery({
        queryKey: ["categories", { includeDeleted: false }],
        queryFn: () => listCategories({ includeDeleted: false }),
        staleTime: 5 * 60 * 1000,
        enabled: open,
    });

    const { data: tenantsData } = useQuery<TenantsResponse>({
        queryKey: ["tenant-list"],
        queryFn: getTenants,
        enabled: open && isAdmin && mode === "create",
        staleTime: 5 * 60 * 1000,
    });

    // Product detail (edit)
    const { data: product, isFetching: loadingProduct } = useQuery<Product>({
        queryKey: ["product", productId!, { includeDeleted: isAdmin }],
        queryFn: () => getProduct(productId!, { includeDeleted: isAdmin }),
        enabled: open && mode === "edit" && !!productId,
        staleTime: 30_000,
    });

    // Category (for attribute defs)
    const { data: category } = useQuery<Category>({
        queryKey: ["category", product?.categoryId ?? "", { includeDeleted: false }],
        queryFn: () => getCategory(product!.categoryId, { includeDeleted: false }),
        enabled: open && mode === "edit" && !!product?.categoryId,
        staleTime: 30_000,
    });

    // =========================
    // Create (minimal shell)
    // =========================
    const [createForm] = Form.useForm<{
        tenantId?: string;
        name: string;
        description?: string;
        categoryId: string;
        status: ProductStatus;
        baseLabel: string;
        basePrice: number;
    }>();

    const createMut = useMutation({
        mutationFn: async (values: any) => {
            const payload = {
                tenantId: values.tenantId, // required if admin
                name: values.name.trim(),
                description: (values.description ?? "").trim() || undefined,
                categoryId: values.categoryId,
                status: values.status as ProductStatus,
                // minimal modifications: exactly one base radio with one option (default)
                modifications: [
                    {
                        kind: "radio" as const,
                        name: "Base",
                        isBase: true,
                        options: [
                            {
                                label: values.baseLabel || "Regular",
                                price: Number(values.basePrice) || 0,
                            },
                        ],
                        defaultOptionIndex: 0,
                    },
                ],
            };
            const { createProduct } = await import("../../http/services/catalogApi");
            return createProduct(payload);
        },
        onSuccess: (p) => {
            onCreated(p);
        },
        onError: (err: any) => message.error(err?.message || "Failed to create product"),
    });

    // =========================
    // Edit: mutate basic fields
    // =========================
    const updMut = useMutation({
        mutationFn: (payload: Parameters<typeof updateProduct>[1]) =>
            updateProduct(productId!, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["product", productId] });
            onUpdated();
        },
        onError: (err: any) => message.error(err?.message || "Update failed"),
    });

    // =========================
    // Upload (presign + post)
    // =========================
    async function uploadViaPresign(
        file: File,
        tenantIdForCreate?: string,
        productIdHint?: string
    ) {
        const resp = await presignUpload({
            purpose: "productImage",
            filename: file.name,
            contentType: file.type as any,
            tenantId: isAdmin
                ? mode === "create"
                    ? tenantIdForCreate
                    : product?.tenantId
                : undefined,
            productId: productIdHint ?? product?.id,
        });
        const { upload, asset } = resp;

        const fd = new FormData();
        Object.entries(upload.fields).forEach(([k, v]) => fd.append(k, v));
        fd.append("file", file);

        const put = await fetch(upload.url, { method: "POST", body: fd });
        if (!put.ok) throw new Error("Upload failed");

        if (mode === "edit") {
            // Patch image by key
            await updMut.mutateAsync({ image: { key: asset.key } });
        }
        return asset;
    }

    // =========================
    // Modifications helpers
    // =========================
    const addModMut = useMutation({
        mutationFn: (payload: any) => addModification(productId!, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to add modification"),
    });

    const updModMut = useMutation({
        mutationFn: (args: { modId: Id; payload: any }) =>
            updateModification(productId!, args.modId, args.payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to update modification"),
    });

    const setBaseMut = useMutation({
        mutationFn: (modId: Id) => setBaseRadio(productId!, modId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to set base"),
    });

    const addOptMut = useMutation({
        mutationFn: (args: { modId: Id; options: { label: string; price: number }[] }) =>
            addModificationOptions(productId!, args.modId, args.options),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to add option"),
    });

    const updOptMut = useMutation({
        mutationFn: (args: { modId: Id; optId: Id; payload: { label?: string; price?: number } }) =>
            updateModificationOption(productId!, args.modId, args.optId, args.payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to update option"),
    });

    const setDefaultOptMut = useMutation({
        mutationFn: (args: { modId: Id; optId: Id }) =>
            setDefaultRadioOption(productId!, args.modId, args.optId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["product", productId] }),
        onError: (err: any) => message.error(err?.message || "Failed to set default"),
    });

    // =========================
    // Attribute values (edit)
    // =========================
    const [attrDraft, setAttrDraft] = useState<Record<string, any>>({});
    useEffect(() => {
        if (product) {
            const map: Record<string, any> = {};
            for (const v of product.attributeValues ?? []) {
                if (v.kind === "radio") map[v.defId] = v.selectedOptionId ?? null;
                if (v.kind === "switch") map[v.defId] = v.selectedOptionId;
                if (v.kind === "checkbox") map[v.defId] = v.selectedOptionIds ?? [];
            }
            setAttrDraft(map);
        }
    }, [product?.id]); // reset on product change

    const saveAttrValue = async (def: Category["attributes"][number]) => {
        if (!product) return;
        const vals = product.attributeValues ? [...product.attributeValues] : [];
        const idx = vals.findIndex((x) => x.defId === def.id);

        const nextOne =
            def.kind === "radio"
                ? {
                      defId: def.id,
                      kind: "radio" as const,
                      selectedOptionId: (attrDraft[def.id] ?? null) || null,
                  }
                : def.kind === "switch"
                ? { defId: def.id, kind: "switch" as const, selectedOptionId: attrDraft[def.id] }
                : {
                      defId: def.id,
                      kind: "checkbox" as const,
                      selectedOptionIds: attrDraft[def.id] ?? [],
                  };

        if (idx >= 0) vals[idx] = nextOne as any;
        else vals.push(nextOne as any);

        await updMut.mutateAsync({ attributeValues: vals as any });
    };

    // ---- UI helpers ----
    const title = mode === "create" ? "Create Product" : product?.name || "Product";

    return (
        <Drawer
            open={open}
            width={880}
            onClose={onClose}
            destroyOnClose
            title={title}
            extra={
                <Space>
                    <Button onClick={onClose}>Close</Button>
                </Space>
            }
            styles={{ body: { paddingTop: 12 } }}
        >
            {mode === "create" ? (
                <CreateProductForm
                    form={createForm}
                    isAdmin={isAdmin}
                    categories={cats ?? []}
                    tenants={tenantsData?.tenants ?? []}
                    onSubmit={async (vals, file) => {
                        try {
                            // If user picked image, presign+upload first to get key for create payload
                            let uploadedKey: string | undefined;
                            if (file) {
                                const asset = await uploadViaPresign(file, vals.tenantId);
                                uploadedKey = asset.key;
                            }
                            await createMut.mutateAsync({
                                ...vals,
                                ...(uploadedKey ? { image: { key: uploadedKey } } : {}),
                            });
                        } catch (e) {
                            // errors surfaced by mutations
                        }
                    }}
                />
            ) : loadingProduct ? (
                <div style={{ padding: 16 }}>
                    <Empty description="Loading product..." />
                </div>
            ) : !product ? (
                <Empty description="Product not found" />
            ) : (
                <Tabs
                    defaultActiveKey="basic"
                    items={[
                        {
                            key: "basic",
                            label: "Basic",
                            children: (
                                <BasicTab
                                    product={product}
                                    categories={cats ?? []}
                                    onChangeCategory={async (cid) => {
                                        await updMut.mutateAsync({ categoryId: cid }); // server clears attributeValues
                                    }}
                                    onSaveBasic={async (patch) => {
                                        await updMut.mutateAsync(patch);
                                    }}
                                    onUploadImage={async (file) => {
                                        await uploadViaPresign(file);
                                    }}
                                />
                            ),
                        },
                        {
                            key: "attributes",
                            label: "Attributes",
                            children: (
                                <AttributesTab
                                    category={category}
                                    draft={attrDraft}
                                    setDraft={setAttrDraft}
                                    onSave={saveAttrValue}
                                />
                            ),
                        },
                        {
                            key: "mods",
                            label: "Modifications",
                            children: (
                                <ModificationsTab
                                    product={product}
                                    onAdd={(payload) => addModMut.mutateAsync(payload)}
                                    onEdit={(modId, patch) =>
                                        updModMut.mutateAsync({ modId, payload: patch })
                                    }
                                    onAddOption={(modId, label, price) =>
                                        addOptMut.mutateAsync({
                                            modId,
                                            options: [{ label, price }],
                                        })
                                    }
                                    onEditOption={(modId, optId, patch) =>
                                        updOptMut.mutateAsync({ modId, optId, payload: patch })
                                    }
                                    onSetDefault={(modId, optId) =>
                                        setDefaultOptMut.mutateAsync({ modId, optId })
                                    }
                                    onSetBase={(modId) => setBaseMut.mutateAsync(modId)}
                                />
                            ),
                        },
                    ]}
                />
            )}
        </Drawer>
    );
}

/* ===========================================
 * Create form (minimal shell + optional image)
 * ===========================================
 */
function CreateProductForm({
    form,
    isAdmin,
    categories,
    tenants,
    onSubmit,
}: {
    form: any;
    isAdmin: boolean;
    categories: CategoryListItem[];
    tenants: Array<{ id: number; name: string }>;
    onSubmit: (vals: any, file?: File) => Promise<void>;
}) {
    const [file, setFile] = useState<File | undefined>();

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{ status: "draft", baseLabel: "Regular", basePrice: 0 }}
            onFinish={(vals) => onSubmit(vals, file)}
        >
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                {isAdmin && (
                    <Form.Item
                        name="tenantId"
                        label="Tenant"
                        rules={[{ required: true, message: "Select a tenant" }]}
                    >
                        <Select
                            placeholder="Select tenant"
                            options={tenants.map((t) => ({ value: String(t.id), label: t.name }))}
                        />
                    </Form.Item>
                )}

                <Form.Item
                    name="name"
                    label="Name"
                    rules={[{ required: true, message: "Name is required" }]}
                >
                    <Input placeholder="Product name" />
                </Form.Item>

                <Form.Item name="description" label="Description">
                    <Input.TextArea rows={3} placeholder="Short description" />
                </Form.Item>

                <Form.Item
                    name="categoryId"
                    label="Category"
                    rules={[{ required: true, message: "Select a category" }]}
                >
                    <Select
                        placeholder="Select category"
                        options={categories.map((c) => ({ value: c.id, label: c.name }))}
                        showSearch
                        filterOption={(i, opt) =>
                            (opt?.label as string)?.toLowerCase().includes(i.toLowerCase())
                        }
                    />
                </Form.Item>

                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))} />
                </Form.Item>

                <Divider style={{ margin: "8px 0 0" }} />
                <Typography.Text strong>Base Price (required)</Typography.Text>
                <Space.Compact block>
                    <Form.Item name="baseLabel" noStyle>
                        <Input style={{ width: "60%" }} placeholder="Base option label" />
                    </Form.Item>
                    <Form.Item
                        name="basePrice"
                        noStyle
                        rules={[{ required: true, message: "Price required" }]}
                    >
                        <InputNumber min={0} style={{ width: "40%" }} addonBefore="₹" />
                    </Form.Item>
                </Space.Compact>

                <Divider />
                <Typography.Text strong>Image (optional)</Typography.Text>
                <Upload
                    accept="image/jpeg,image/png"
                    maxCount={1}
                    beforeUpload={(f) => {
                        setFile(f);
                        return false; // prevent auto upload
                    }}
                    onRemove={() => setFile(undefined)}
                >
                    <Button icon={<PlusOutlined />}>Select Image</Button>
                </Upload>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <Space>
                        <Form.Item noStyle>
                            <Button htmlType="submit" type="primary">
                                Create
                            </Button>
                        </Form.Item>
                    </Space>
                </div>
            </Space>
        </Form>
    );
}

/* ================
 * Basic tab (edit)
 * ================
 */
function BasicTab({
    product,
    categories,
    onChangeCategory,
    onSaveBasic,
    onUploadImage,
}: {
    product: Product;
    categories: CategoryListItem[];
    onChangeCategory: (id: string) => Promise<void>;
    onSaveBasic: (
        patch: Partial<Pick<Product, "name" | "description" | "status">>
    ) => Promise<void>;
    onUploadImage: (file: File) => Promise<void>;
}) {
    const [name, setName] = useState(product.name);
    const [description, setDescription] = useState(product.description ?? "");
    const [status, setStatus] = useState<ProductStatus>(product.status);

    useEffect(() => {
        setName(product.name);
        setDescription(product.description ?? "");
        setStatus(product.status);
    }, [product.id]);

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <div>
                <Form layout="vertical">
                    <Form.Item label="Name" required>
                        <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </Form.Item>
                    <Form.Item label="Description">
                        <Input.TextArea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item label="Status" required>
                        <Select
                            value={status}
                            onChange={setStatus}
                            options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                        />
                    </Form.Item>
                    <Form.Item label="Category">
                        <Select
                            value={product.categoryId}
                            onChange={(v) => onChangeCategory(v)}
                            options={categories.map((c) => ({ value: c.id, label: c.name }))}
                        />
                        <div
                            style={{
                                fontSize: 12,
                                color: "var(--ant-color-text-tertiary)",
                                marginTop: 4,
                            }}
                        >
                            Changing the category clears attribute values.
                        </div>
                    </Form.Item>

                    <Space>
                        <Button
                            type="primary"
                            onClick={() =>
                                onSaveBasic({
                                    name: name.trim(),
                                    description: description.trim() || undefined,
                                    status,
                                })
                            }
                        >
                            Save changes
                        </Button>
                    </Space>
                </Form>
            </div>

            <div>
                <Typography.Text strong>Image</Typography.Text>
                <div style={{ marginTop: 8 }}>
                    {product.image?.url ? (
                        <Image
                            src={product.image.url}
                            width={300}
                            height={220}
                            style={{ objectFit: "cover", borderRadius: 8 }}
                        />
                    ) : (
                        <div
                            style={{
                                width: 300,
                                height: 220,
                                borderRadius: 8,
                                background: "var(--ant-color-fill-tertiary)",
                                display: "grid",
                                placeItems: "center",
                            }}
                        >
                            <Avatar shape="square" size={80} icon={<PictureOutlined />} />
                        </div>
                    )}
                </div>
                <Upload
                    accept="image/jpeg,image/png"
                    maxCount={1}
                    customRequest={async (opts) => {
                        const file = opts.file as File;
                        try {
                            await onUploadImage(file);
                            opts.onSuccess?.({}, new XMLHttpRequest());
                        } catch (e: any) {
                            opts.onError?.(e);
                        }
                    }}
                    showUploadList={false}
                >
                    <Button icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                        Upload / Replace
                    </Button>
                </Upload>

                <Divider />
                <MetaKV label="Created" value={fmtDate(product.createdAt)} />
                <MetaKV label="Updated" value={fmtDate(product.updatedAt)} />
                {product.deletedAt ? (
                    <MetaKV label="Deleted" value={fmtDate(product.deletedAt)} danger />
                ) : null}
            </div>
        </div>
    );
}

function MetaKV({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div
            style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}
        >
            <span style={{ color: "var(--ant-color-text-tertiary)" }}>{label}</span>
            <span style={{ color: danger ? "var(--ant-color-error)" : "inherit" }}>{value}</span>
        </div>
    );
}

/* =================
 * Attributes tab
 * =================
 */
function AttributesTab({
    category,
    draft,
    setDraft,
    onSave,
}: {
    category?: Category;
    draft: Record<string, any>;
    setDraft: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    onSave: (def: Category["attributes"][number]) => Promise<void>;
}) {
    if (!category) return <Empty description="Select a category to configure attributes" />;

    return (
        <div style={{ display: "grid", gap: 12 }}>
            {category.attributes?.length ? (
                category.attributes.map((def) => (
                    <div
                        key={def.id}
                        style={{
                            border: "1px solid var(--ant-color-border)",
                            borderRadius: 8,
                            padding: 12,
                        }}
                    >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <div>
                                <Typography.Text strong>{def.name}</Typography.Text>{" "}
                                <Tag color="default">{def.kind}</Tag>
                            </div>
                            <Button size="small" type="primary" onClick={() => onSave(def)}>
                                Save
                            </Button>
                        </Space>

                        <div style={{ marginTop: 8 }}>
                            {def.kind === "radio" && (
                                <Radio.Group
                                    value={draft[def.id] ?? null}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, [def.id]: e.target.value }))
                                    }
                                >
                                    <Radio value={null}>None</Radio>
                                    {def.options
                                        .filter((o) => !o.isDeleted)
                                        .map((o) => (
                                            <Radio key={o.id} value={o.id}>
                                                {o.label}
                                            </Radio>
                                        ))}
                                </Radio.Group>
                            )}

                            {def.kind === "switch" && (
                                <Radio.Group
                                    value={draft[def.id]}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, [def.id]: e.target.value }))
                                    }
                                >
                                    {def.options
                                        .filter((o) => !o.isDeleted)
                                        .map((o) => (
                                            <Radio key={o.id} value={o.id}>
                                                {o.label}
                                            </Radio>
                                        ))}
                                </Radio.Group>
                            )}

                            {def.kind === "checkbox" && (
                                <Select
                                    mode="multiple"
                                    style={{ width: 420 }}
                                    value={draft[def.id] ?? []}
                                    onChange={(vals) => setDraft((d) => ({ ...d, [def.id]: vals }))}
                                    options={def.options
                                        .filter((o) => !o.isDeleted)
                                        .map((o) => ({ value: o.id, label: o.label }))}
                                />
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <Empty description="No attributes on this category" />
            )}
        </div>
    );
}

/* ===================
 * Modifications tab
 * ===================
 */
function ModificationsTab({
    product,
    onAdd,
    onEdit,
    onAddOption,
    onEditOption,
    onSetDefault,
    onSetBase,
}: {
    product: Product;
    onAdd: (payload: any) => Promise<any>;
    onEdit: (modId: Id, patch: any) => Promise<any>;
    onAddOption: (modId: Id, label: string, price: number) => Promise<any>;
    onEditOption: (modId: Id, optId: Id, patch: any) => Promise<any>;
    onSetDefault: (modId: Id, optId: Id) => Promise<any>;
    onSetBase: (modId: Id) => Promise<any>;
}) {
    const { message } = App.useApp();
    const [addOpen, setAddOpen] = useState(false);
    const [kind, setKind] = useState<"radio" | "checkbox">("radio");
    const [name, setName] = useState("");
    const [isRequired, setIsRequired] = useState(false); // radio only
    const [minSelected, setMinSelected] = useState<number | undefined>(undefined);
    const [maxSelected, setMaxSelected] = useState<number | undefined>(undefined);

    const baseId = useMemo(
        () => product.modifications.find((m: any) => m.kind === "radio" && m.isBase)?.id,
        [product]
    );

    const resetAdd = () => {
        setKind("radio");
        setName("");
        setIsRequired(false);
        setMinSelected(undefined);
        setMaxSelected(undefined);
    };

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <Space style={{ marginBottom: 8 }}>
                <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                    Add modification
                </Button>
            </Space>

            {product.modifications.length ? (
                product.modifications.map((m) => (
                    <div
                        key={m.id}
                        style={{
                            border: "1px solid var(--ant-color-border)",
                            borderRadius: 8,
                            padding: 12,
                        }}
                    >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <div>
                                <Typography.Text strong>{m.name}</Typography.Text>{" "}
                                <Tag color="default">{m.kind}</Tag>
                                {"isBase" in m && m.isBase ? <Tag color="success">Base</Tag> : null}
                            </div>
                            <Space>
                                {m.kind === "radio" && !m.isBase && (
                                    <Button size="small" onClick={() => onSetBase(m.id)}>
                                        Make Base
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        Modal.confirm({
                                            title: "Edit modification",
                                            content: (
                                                <div style={{ display: "grid", gap: 8 }}>
                                                    <Input
                                                        defaultValue={m.name}
                                                        onChange={(e) =>
                                                            ((m as any).__name = e.target.value)
                                                        }
                                                        placeholder="Name"
                                                    />
                                                    {m.kind === "radio" ? (
                                                        <div>
                                                            <span style={{ marginRight: 8 }}>
                                                                Required
                                                            </span>
                                                            <Switch
                                                                defaultChecked={
                                                                    !!(m as any).isRequired
                                                                }
                                                                onChange={(v) =>
                                                                    ((m as any).__req = v)
                                                                }
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Space>
                                                            <InputNumber
                                                                placeholder="minSelected"
                                                                defaultValue={
                                                                    (m as any).minSelected
                                                                }
                                                                onChange={(v) =>
                                                                    ((m as any).__min = v as
                                                                        | number
                                                                        | undefined)
                                                                }
                                                            />
                                                            <InputNumber
                                                                placeholder="maxSelected"
                                                                defaultValue={
                                                                    (m as any).maxSelected
                                                                }
                                                                onChange={(v) =>
                                                                    ((m as any).__max = v as
                                                                        | number
                                                                        | undefined)
                                                                }
                                                            />
                                                        </Space>
                                                    )}
                                                </div>
                                            ),
                                            onOk: async () => {
                                                const patch =
                                                    m.kind === "radio"
                                                        ? {
                                                              name: (m as any).__name ?? m.name,
                                                              isRequired:
                                                                  (m as any).__req ??
                                                                  (m as any).isRequired,
                                                          }
                                                        : {
                                                              name: (m as any).__name ?? m.name,
                                                              minSelected:
                                                                  (m as any).__min ??
                                                                  (m as any).minSelected,
                                                              maxSelected:
                                                                  (m as any).__max ??
                                                                  (m as any).maxSelected,
                                                          };
                                                await onEdit(m.id, patch);
                                            },
                                        });
                                    }}
                                >
                                    Edit
                                </Button>
                            </Space>
                        </Space>

                        <Divider style={{ margin: "8px 0" }} />
                        <div style={{ display: "grid", gap: 8 }}>
                            {m.options
                                .filter((o) => !o.isDeleted)
                                .map((o) => (
                                    <Space key={o.id} style={{ justifyContent: "space-between" }}>
                                        <div>
                                            <Typography.Text>{o.label}</Typography.Text>{" "}
                                            <Tag color="blue">₹ {o.price}</Tag>{" "}
                                            {"defaultOptionId" in m &&
                                            m.defaultOptionId === o.id ? (
                                                <Tag color="success">Default</Tag>
                                            ) : null}
                                        </div>
                                        <Space>
                                            {m.kind === "radio" && (
                                                <Button
                                                    size="small"
                                                    onClick={() => onSetDefault(m.id, o.id)}
                                                >
                                                    Set default
                                                </Button>
                                            )}
                                            <Button
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => {
                                                    let newLabel = o.label;
                                                    let newPrice = o.price;
                                                    Modal.confirm({
                                                        title: "Edit option",
                                                        content: (
                                                            <Space
                                                                direction="vertical"
                                                                style={{ width: "100%" }}
                                                            >
                                                                <Input
                                                                    defaultValue={o.label}
                                                                    onChange={(e) =>
                                                                        (newLabel = e.target.value)
                                                                    }
                                                                />
                                                                <InputNumber
                                                                    min={0}
                                                                    defaultValue={o.price}
                                                                    onChange={(v) =>
                                                                        (newPrice = Number(v))
                                                                    }
                                                                    addonBefore="₹"
                                                                    style={{ width: "100%" }}
                                                                />
                                                            </Space>
                                                        ),
                                                        onOk: async () => {
                                                            await onEditOption(m.id, o.id, {
                                                                label: newLabel,
                                                                price: newPrice,
                                                            });
                                                        },
                                                    });
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        </Space>
                                    </Space>
                                ))}
                        </div>

                        <div style={{ marginTop: 8 }}>
                            <Button
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                    let label = "";
                                    let price = 0;
                                    Modal.confirm({
                                        title: "Add option",
                                        content: (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                <Input
                                                    placeholder="Label"
                                                    onChange={(e) => (label = e.target.value)}
                                                />
                                                <InputNumber
                                                    min={0}
                                                    addonBefore="₹"
                                                    style={{ width: "100%" }}
                                                    onChange={(v) => (price = Number(v))}
                                                />
                                            </Space>
                                        ),
                                        onOk: async () => {
                                            if (!label.trim())
                                                return message.error("Label is required");
                                            await onAddOption(m.id, label.trim(), price || 0);
                                        },
                                    });
                                }}
                            >
                                Add option
                            </Button>
                        </div>
                    </div>
                ))
            ) : (
                <Empty description="No modifications yet" />
            )}

            {/* Add modification modal */}
            <Modal
                open={addOpen}
                title="Add modification"
                onCancel={() => {
                    setAddOpen(false);
                    resetAdd();
                }}
                onOk={async () => {
                    try {
                        if (!name.trim()) throw new Error("Name is required");
                        if (kind === "radio")
                            await onAdd({ kind, name: name.trim(), isRequired, options: [] });
                        else
                            await onAdd({
                                kind,
                                name: name.trim(),
                                minSelected,
                                maxSelected,
                                options: [],
                            });
                        setAddOpen(false);
                        resetAdd();
                    } catch (e: any) {
                        message.error(e?.message || "Failed to add");
                    }
                }}
            >
                <Space direction="vertical" style={{ width: "100%" }}>
                    <Select
                        value={kind}
                        onChange={(v) => setKind(v)}
                        options={[
                            { value: "radio", label: "Radio" },
                            { value: "checkbox", label: "Checkbox" },
                        ]}
                    />
                    <Input
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    {kind === "radio" ? (
                        <div>
                            <span style={{ marginRight: 8 }}>Required</span>
                            <Switch checked={isRequired} onChange={setIsRequired} />
                        </div>
                    ) : (
                        <Space>
                            <InputNumber
                                placeholder="minSelected"
                                value={minSelected}
                                onChange={(v) => setMinSelected(v ?? undefined)}
                            />
                            <InputNumber
                                placeholder="maxSelected"
                                value={maxSelected}
                                onChange={(v) => setMaxSelected(v ?? undefined)}
                            />
                        </Space>
                    )}
                </Space>
            </Modal>
        </div>
    );
}

/* utils */
function fmtDate(v?: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}
