import { Form, Input, Typography } from "antd";
import { useEffect } from "react";

export type TenantValues = { name: string; address: string };

type Props = {
    form: any; // antd FormInstance<TenantValues>
    initial?: { name: string; address: string };
    mode: "create" | "edit";
};

export default function TenantForm({ form, initial, mode }: Props) {
    // prefill/reset handled here so UpsertDrawer stays generic
    useEffect(() => {
        if (mode === "edit" && initial) {
            form.setFieldsValue(initial);
        } else {
            form.resetFields();
        }
    }, [form, initial, mode]);

    return (
        <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item
                label="Name"
                name="name"
                rules={[
                    { required: true, message: "Please enter a tenant name" },
                    { min: 2, message: "Name is too short" },
                ]}
            >
                <Input placeholder="e.g., Domino’s Sector 17" />
            </Form.Item>

            <Form.Item
                label="Address"
                name="address"
                rules={[{ required: true, message: "Please enter an address" }]}
            >
                <Input.TextArea rows={3} placeholder="Street, City, State" />
            </Form.Item>

            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Tip: keep names unique per city to avoid confusion in operations.
            </Typography.Paragraph>
        </Form>
    );
}
