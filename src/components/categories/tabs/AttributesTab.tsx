// src/components/categories/tabs/AttributesTab.tsx
import { useMemo, useState } from "react";
import {
    App,
    Alert,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Radio,
    Space,
    Switch as AntSwitch,
} from "antd";
import type { Category } from "../../../http/services/catalogApi";
import { addAttribute, type AttributeDef } from "../../../http/services/catalogApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AttributeCard from "../AttributeCard";

export default function AttributesTab({
    category,
    readOnly,
}: {
    category: Category;
    readOnly: boolean;
}) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [showDeleted, setShowDeleted] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [kind, setKind] = useState<"radio" | "checkbox" | "switch">("radio");
    const [form] = Form.useForm();

    const list = useMemo(() => {
        return (category.attributes ?? []).filter((a) => showDeleted || !a.isDeleted);
    }, [category.attributes, showDeleted]);

    const addMut = useMutation({
        mutationFn: async (payload: any) => addAttribute(category.id, payload),
        onSuccess: (updated) => {
            queryClient.setQueryData(["category", category.id, { includeDeleted: true }], updated);
            message.success("Attribute added");
            setAddOpen(false);
            form.resetFields();
        },
        onError: (err: any) => message.error(err?.message || "Failed to add attribute"),
    });

    const submitAdd = async () => {
        const values = await form.validateFields();
        if (kind === "radio") {
            const payload = {
                kind: "radio" as const,
                name: values.name,
                isRequired: !!values.isRequired,
                options: (values.options || []).map((l: string) => ({ label: l })),
                ...(typeof values.defaultOptionIndex === "number"
                    ? { defaultOptionIndex: values.defaultOptionIndex }
                    : {}),
            };
            addMut.mutate(payload);
        } else if (kind === "checkbox") {
            const payload = {
                kind: "checkbox" as const,
                name: values.name,
                minSelected: values.minSelected ?? undefined,
                maxSelected: values.maxSelected ?? undefined,
                options: (values.options || []).map((l: string) => ({ label: l })),
            };
            addMut.mutate(payload);
        } else {
            // switch: exactly 2 options
            const payload = {
                kind: "switch" as const,
                name: values.name,
                options: [{ label: values.optionA }, { label: values.optionB }] as [
                    { label: string },
                    { label: string }
                ],
                ...(typeof values.defaultOptionIndex === "number"
                    ? { defaultOptionIndex: values.defaultOptionIndex }
                    : {}),
            };
            addMut.mutate(payload);
        }
    };

    return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Alert
                type={readOnly ? "info" : "success"}
                showIcon
                message={readOnly ? "Read-only view" : "Edit attributes in-place"}
                description={
                    readOnly
                        ? "Managers and deleted categories are read-only."
                        : "Use the buttons below to add/edit/delete attributes, options, and defaults. Invariants are enforced."
                }
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space>
                    <AntSwitch checked={showDeleted} onChange={setShowDeleted} />
                    <span>Show deleted nested items</span>
                </Space>
                {!readOnly && (
                    <Button
                        type="primary"
                        onClick={() => {
                            setKind("radio");
                            setAddOpen(true);
                        }}
                    >
                        Add attribute
                    </Button>
                )}
            </div>

            {/* Attribute list */}
            {list.length === 0 ? (
                <Card>
                    <em>No attributes</em>
                </Card>
            ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {list.map((attr: AttributeDef) => (
                        <AttributeCard
                            key={attr.id}
                            categoryId={category.id}
                            attribute={attr}
                            readOnly={readOnly}
                            showDeleted={showDeleted}
                        />
                    ))}
                </Space>
            )}

            {/* Add attribute modal */}
            <Modal
                title="Add attribute"
                open={addOpen}
                onCancel={() => setAddOpen(false)}
                onOk={submitAdd}
                okButtonProps={{ loading: addMut.isPending }}
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    <Radio.Group
                        value={kind}
                        onChange={(e) => {
                            setKind(e.target.value);
                            form.resetFields();
                        }}
                        options={[
                            { label: "Radio", value: "radio" },
                            { label: "Checkbox", value: "checkbox" },
                            { label: "Switch", value: "switch" },
                        ]}
                        optionType="button"
                        buttonStyle="solid"
                    />

                    <Form form={form} layout="vertical">
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input placeholder="Attribute name" />
                        </Form.Item>

                        {kind === "radio" && (
                            <>
                                <Form.Item label="Options" required>
                                    <Form.List name="options" initialValue={["", ""]}>
                                        {(fields, { add, remove }) => (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {fields.map((f) => (
                                                    <Space key={f.key} align="baseline">
                                                        <Form.Item
                                                            {...f}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: "Label required",
                                                                },
                                                            ]}
                                                        >
                                                            {" "}
                                                            <Input placeholder="Label" />{" "}
                                                        </Form.Item>
                                                        {fields.length > 1 && (
                                                            <Button onClick={() => remove(f.name)}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </Space>
                                                ))}
                                                <Button onClick={() => add("")}>Add option</Button>
                                            </Space>
                                        )}
                                    </Form.List>
                                </Form.Item>
                                <Form.Item
                                    name="isRequired"
                                    label="Required"
                                    valuePropName="checked"
                                >
                                    <AntSwitch />
                                </Form.Item>
                                <Form.Item
                                    name="defaultOptionIndex"
                                    label="Default option index (optional)"
                                >
                                    <Input
                                        type="number"
                                        min={0}
                                        placeholder="Index of options array"
                                    />
                                </Form.Item>
                            </>
                        )}

                        {kind === "checkbox" && (
                            <>
                                <Form.Item label="Options" required>
                                    <Form.List name="options" initialValue={["", ""]}>
                                        {(fields, { add, remove }) => (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {fields.map((f) => (
                                                    <Space key={f.key} align="baseline">
                                                        <Form.Item
                                                            {...f}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: "Label required",
                                                                },
                                                            ]}
                                                        >
                                                            {" "}
                                                            <Input placeholder="Label" />{" "}
                                                        </Form.Item>
                                                        {fields.length > 1 && (
                                                            <Button onClick={() => remove(f.name)}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </Space>
                                                ))}
                                                <Button onClick={() => add("")}>Add option</Button>
                                            </Space>
                                        )}
                                    </Form.List>
                                </Form.Item>
                                <Form.Item name="minSelected" label="Min selected">
                                    <Input type="number" min={0} />
                                </Form.Item>
                                <Form.Item name="maxSelected" label="Max selected">
                                    <Input type="number" min={0} />
                                </Form.Item>
                            </>
                        )}

                        {kind === "switch" && (
                            <>
                                <Form.Item
                                    name="optionA"
                                    label="Option A"
                                    rules={[{ required: true }]}
                                >
                                    <Input placeholder="e.g., Yes" />
                                </Form.Item>
                                <Form.Item
                                    name="optionB"
                                    label="Option B"
                                    rules={[{ required: true }]}
                                >
                                    <Input placeholder="e.g., No" />
                                </Form.Item>
                                <Form.Item
                                    name="defaultOptionIndex"
                                    label="Default option index (0 or 1)"
                                    rules={[{ type: "number" }]}
                                >
                                    <Input type="number" min={0} max={1} />
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </Space>
            </Modal>
        </Space>
    );
}
