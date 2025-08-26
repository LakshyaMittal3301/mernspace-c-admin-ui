import { useEffect } from "react";
import { App, Alert, Card, Checkbox, Form, Radio, Space, Switch } from "antd";
import type {
    Product,
    Category,
    AttributeValue,
    AttributeDef,
} from "../../http/services/catalogApi";

type Props = {
    product: Product;
    category?: Category;
    onSave: (values: AttributeValue[]) => Promise<void>;
};

export default function AttributesTab({ product, category, onSave }: Props) {
    const { message } = App.useApp();
    const [form] = Form.useForm();

    useEffect(() => {
        // Map product.attributeValues to form initial state
        const initial: any = {};
        for (const v of product.attributeValues ?? []) {
            if (v.kind === "radio" || v.kind === "switch") {
                initial[v.defId] = v.selectedOptionId ?? null;
            } else if (v.kind === "checkbox") {
                initial[v.defId] = v.selectedOptionIds ?? [];
            }
        }
        form.setFieldsValue(initial);
    }, [product, form]);

    if (!category) {
        return <Alert type="info" message="Select a category to configure attributes." />;
    }

    const defs = category.attributes ?? [];

    return (
        <Card title="Attribute Values" bordered={false}>
            <Form
                form={form}
                layout="vertical"
                onFinish={async (vals: any) => {
                    const payload: AttributeValue[] = defs.map((def) => {
                        if (def.kind === "radio") {
                            const selectedOptionId = vals[def.id] ?? null;
                            return { defId: def.id, kind: "radio", selectedOptionId };
                        }
                        if (def.kind === "switch") {
                            const selectedOptionId = vals[def.id];
                            return { defId: def.id, kind: "switch", selectedOptionId };
                        }
                        const selectedOptionIds: string[] = (vals[def.id] ?? []) as string[];
                        return { defId: def.id, kind: "checkbox", selectedOptionIds };
                    });
                    try {
                        await onSave(payload);
                        message.success("Attributes saved");
                    } catch (err: any) {
                        message.error(err?.message || "Failed to save attributes");
                    }
                }}
            >
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    {defs.map((def) => (
                        <Form.Item
                            key={def.id}
                            label={def.name}
                            name={def.id}
                            rules={
                                def.kind === "radio" && (def as any).isRequired
                                    ? [{ required: true, message: "Required" }]
                                    : []
                            }
                            valuePropName={def.kind === "switch" ? "checked" : undefined}
                        >
                            {renderControl(def)}
                        </Form.Item>
                    ))}

                    <Form.Item>
                        <button type="submit" className="ant-btn ant-btn-primary">
                            Save changes
                        </button>
                    </Form.Item>
                </Space>
            </Form>
        </Card>
    );
}

function renderControl(def: AttributeDef) {
    if (def.kind === "radio") {
        return (
            <Radio.Group>
                {def.options
                    .filter((o) => !o.isDeleted)
                    .map((o) => (
                        <Radio key={o.id} value={o.id}>
                            {o.label}
                        </Radio>
                    ))}
            </Radio.Group>
        );
    }
    if (def.kind === "switch") {
        // Switch expects boolean, but our API expects one of the 2 option IDs
        // Strategy: render as Switch but store optionId in hidden field is tricky.
        // Simpler: render as Radio with 2 options for accurate value semantics.
        return (
            <Radio.Group>
                {def.options
                    .filter((o) => !o.isDeleted)
                    .map((o) => (
                        <Radio key={o.id} value={o.id}>
                            {o.label}
                        </Radio>
                    ))}
            </Radio.Group>
        );
    }
    // checkbox
    return (
        <Checkbox.Group
            options={def.options
                .filter((o) => !o.isDeleted)
                .map((o) => ({ label: o.label, value: o.id }))}
        />
    );
}
