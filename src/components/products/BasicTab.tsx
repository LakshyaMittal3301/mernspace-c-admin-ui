import { useMemo, useState } from "react";
import {
    App,
    Button,
    Card,
    Descriptions,
    Form,
    Input,
    Select,
    Space,
    Tag,
    Typography,
    Modal,
    Segmented,
} from "antd";
import type { Product, Id } from "../../http/services/catalogApi";
import type { CreateProductPayload, UpdateProductPayload } from "../../http/services/catalogApi";

type Props = {
    mode: "create" | "edit";
    isAdmin: boolean;
    product?: Product;
    categories: { id: Id; name: string }[];
    onCreate: (payload: CreateProductPayload) => Promise<void>;
    onPatch: (patch: UpdateProductPayload) => Promise<void>;
    onChangeCategory: (categoryId: Id) => Promise<void>;
    onDelete: () => Promise<void>;
};

type CreateValues = {
    tenantId?: string;
    name: string;
    description?: string;
    categoryId: Id;
    basePrice: number;
    status: "draft" | "active" | "archived";
};

export default function BasicTab({
    mode,
    isAdmin,
    product,
    categories,
    onCreate,
    onPatch,
    onChangeCategory,
    onDelete,
}: Props) {
    const { message } = App.useApp();
    const [form] = Form.useForm<CreateValues>();

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.id, label: c.name })),
        [categories]
    );

    // --- CREATE MODE ---
    if (mode === "create") {
        return (
            <Card title="Create Product" bordered={false}>
                <Form<CreateValues>
                    form={form}
                    layout="vertical"
                    initialValues={{ status: "draft" }}
                    onFinish={async (vals) => {
                        const payload: CreateProductPayload = {
                            tenantId: vals.tenantId,
                            name: vals.name.trim(),
                            description: vals.description?.trim(),
                            categoryId: vals.categoryId,
                            // attributeValues omitted initially; user will fill in after create
                            modifications: [
                                {
                                    kind: "radio",
                                    name: "Base",
                                    isBase: true,
                                    isRequired: true,
                                    options: [{ label: "Standard", price: Number(vals.basePrice) }],
                                    defaultOptionIndex: 0,
                                },
                            ],
                            status: vals.status,
                        };
                        await onCreate(payload);
                    }}
                >
                    {isAdmin && (
                        <Form.Item
                            label="Tenant ID"
                            name="tenantId"
                            rules={[{ required: true, message: "Tenant is required (Admin only)" }]}
                        >
                            <Input placeholder="tenant-1" />
                        </Form.Item>
                    )}

                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: "Name is required" }]}
                    >
                        <Input placeholder="Product name" />
                    </Form.Item>

                    <Form.Item label="Description" name="description">
                        <Input.TextArea placeholder="Describe the product" rows={3} />
                    </Form.Item>

                    <Form.Item
                        label="Category"
                        name="categoryId"
                        rules={[{ required: true, message: "Category is required" }]}
                    >
                        <Select
                            options={categoryOptions}
                            placeholder="Select category"
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Base Price (₹)"
                        name="basePrice"
                        rules={[
                            { required: true, message: "Base price is required" },
                            {
                                validator: (_r, v) =>
                                    Number.isInteger(v) && v >= 0
                                        ? Promise.resolve()
                                        : Promise.reject("Enter a non-negative integer"),
                            },
                        ]}
                    >
                        <Input type="number" min={0} step={1} placeholder="e.g., 299" />
                    </Form.Item>

                    <Form.Item label="Status" name="status">
                        <Segmented
                            options={[
                                { value: "draft", label: "Draft" },
                                { value: "active", label: "Active" },
                                { value: "archived", label: "Archived" },
                            ]}
                        />
                    </Form.Item>

                    <Space>
                        <Button type="primary" onClick={() => form.submit()}>
                            Create
                        </Button>
                    </Space>
                </Form>
            </Card>
        );
    }

    // --- EDIT MODE ---
    if (!product) return null;

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <Card title="Basics" bordered={false}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    {/* Name + Description */}
                    <InlineEdit
                        title="Name & Description"
                        controls={
                            <Form<UpdateProductPayload>
                                layout="vertical"
                                initialValues={{
                                    name: product.name,
                                    description: product.description ?? "",
                                }}
                                onFinish={async (vals) => {
                                    await onPatch({
                                        name: vals.name?.trim(),
                                        description: vals.description?.trim(),
                                    });
                                }}
                            >
                                <Form.Item
                                    label="Name"
                                    name="name"
                                    rules={[{ required: true, message: "Name is required" }]}
                                >
                                    <Input placeholder="Product name" />
                                </Form.Item>
                                <Form.Item label="Description" name="description">
                                    <Input.TextArea rows={3} placeholder="Optional" />
                                </Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Save
                                </Button>
                            </Form>
                        }
                    />

                    {/* Category (immutable to product data, but PATCH clears attributeValues) */}
                    <InlineEdit
                        title="Category"
                        controls={
                            <Form
                                layout="inline"
                                onFinish={async (vals: any) => {
                                    if (!vals.categoryId || vals.categoryId === product.categoryId)
                                        return;
                                    Modal.confirm({
                                        title: "Change category?",
                                        content:
                                            "This will clear all current attribute values. You can set new values based on the new category.",
                                        onOk: async () => {
                                            await onChangeCategory(vals.categoryId);
                                        },
                                    });
                                }}
                                initialValues={{ categoryId: product.categoryId }}
                            >
                                <Form.Item name="categoryId" style={{ minWidth: 260 }}>
                                    <Select
                                        options={categoryOptions}
                                        showSearch
                                        optionFilterProp="label"
                                    />
                                </Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Apply
                                </Button>
                            </Form>
                        }
                    />

                    {/* Status */}
                    <InlineEdit
                        title="Status"
                        controls={
                            <Form
                                layout="inline"
                                initialValues={{ status: product.status }}
                                onFinish={async (vals: any) => onPatch({ status: vals.status })}
                            >
                                <Form.Item name="status">
                                    <Segmented
                                        options={[
                                            { value: "draft", label: "Draft" },
                                            { value: "active", label: "Active" },
                                            { value: "archived", label: "Archived" },
                                        ]}
                                    />
                                </Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Apply
                                </Button>
                            </Form>
                        }
                    />
                </Space>
            </Card>

            <Card title="Meta" bordered={false}>
                <Descriptions column={2} size="small">
                    <Descriptions.Item label="Tenant">{product.tenantId}</Descriptions.Item>
                    <Descriptions.Item label="Category">{product.categoryId}</Descriptions.Item>
                    <Descriptions.Item label="Created">{fmt(product.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="Updated">{fmt(product.updatedAt)}</Descriptions.Item>
                    {product.deletedAt && (
                        <Descriptions.Item label="Deleted">
                            {fmt(product.deletedAt)}
                        </Descriptions.Item>
                    )}
                    <Descriptions.Item label="State">
                        <Tag
                            color={
                                product.status === "active"
                                    ? "green"
                                    : product.status === "archived"
                                    ? "orange"
                                    : "default"
                            }
                        >
                            {product.status.toUpperCase()}
                        </Tag>
                        {product.isDeleted && (
                            <Tag color="red" style={{ marginLeft: 8 }}>
                                DELETED
                            </Tag>
                        )}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            <div>
                <Button
                    danger
                    onClick={() => {
                        Modal.confirm({
                            title: "Delete product?",
                            content: "This will soft-delete the product.",
                            okButtonProps: { danger: true },
                            onOk: onDelete,
                        });
                    }}
                >
                    Delete Product
                </Button>
            </div>
        </Space>
    );
}

function InlineEdit({ title, controls }: { title: string; controls: React.ReactNode }) {
    return (
        <div>
            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                {title}
            </Typography.Text>
            {controls}
        </div>
    );
}

function fmt(v?: string | Date | null) {
    if (!v) return "—";
    const d = typeof v === "string" ? new Date(v) : v;
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}
