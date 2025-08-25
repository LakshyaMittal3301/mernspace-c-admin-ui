// src/components/categories/tabs/BasicsTab.tsx
import { Card, Descriptions, Form, Input, Button, Space } from "antd";
import { useState } from "react";
import type { Category } from "../../../http/services/catalogApi";

export default function BasicsTab({
    category,
    canEdit,
    loading,
    onRename,
    onDelete,
}: {
    category: Category;
    canEdit: boolean;
    loading?: boolean;
    onRename: (name: string) => Promise<any> | any;
    onDelete?: () => Promise<any> | any;
}) {
    const [form] = Form.useForm<{ name: string }>();
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            await onRename(values.name.trim());
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Card size="small" title="Basic info">
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ name: category.name }}
                    disabled={!canEdit || loading}
                >
                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: "Name is required" }]}
                    >
                        <Input placeholder="Category name" />
                    </Form.Item>

                    {canEdit && (
                        <Button type="primary" onClick={handleSave} loading={submitting}>
                            Save name
                        </Button>
                    )}
                </Form>
            </Card>

            <Card size="small" title="Timestamps">
                <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Created at">
                        {formatDate(category.createdAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Updated at">
                        {formatDate(category.updatedAt)}
                    </Descriptions.Item>
                    {category.isDeleted && (
                        <Descriptions.Item label="Deleted at">
                            {formatDate(category.deletedAt)}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>
        </Space>
    );
}

function formatDate(v?: string | null) {
    if (!v) return "—";
    const d = new Date(v);
    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
    }).format(d);
}
