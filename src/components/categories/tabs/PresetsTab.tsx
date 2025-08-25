import { useMemo, useState } from "react";
import { App, Alert, Button, Card, Form, Input, Modal, Radio, Space } from "antd";
import type { Category } from "../../../http/services/catalogApi";
import { addPreset, type ModificationGroup } from "../../../http/services/catalogApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import PresetCard from "../PresetCard";

export default function PresetsTab({
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
    const [kind, setKind] = useState<"radio" | "checkbox">("radio");
    const [form] = Form.useForm();

    const list = useMemo(() => {
        return (category.modificationPresets ?? []).filter((p) => showDeleted || !p.isDeleted);
    }, [category.modificationPresets, showDeleted]);

    const addMut = useMutation({
        mutationFn: async (payload: any) => addPreset(category.id, payload),
        onSuccess: (updated) => {
            queryClient.setQueryData(["category", category.id, { includeDeleted: true }], updated);
            message.success("Preset added");
            setAddOpen(false);
            form.resetFields();
        },
        onError: (err: any) => message.error(err?.message || "Failed to add preset"),
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
        } else {
            const payload = {
                kind: "checkbox" as const,
                name: values.name,
                minSelected: values.minSelected ?? undefined,
                maxSelected: values.maxSelected ?? undefined,
                options: (values.options || []).map((l: string) => ({ label: l })),
            };
            addMut.mutate(payload);
        }
    };

    return (
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Alert
                type={readOnly ? "info" : "success"}
                showIcon
                message={readOnly ? "Read-only view" : "Edit presets in-place"}
                description={
                    readOnly
                        ? "Managers and deleted categories are read-only."
                        : "Use the buttons below to add/edit/delete preset groups, options, and defaults."
                }
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space>
                    <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={(e) => setShowDeleted(e.target.checked)}
                    />
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
                        Add preset
                    </Button>
                )}
            </div>

            {list.length === 0 ? (
                <Card>
                    <em>No presets</em>
                </Card>
            ) : (
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                    {list.map((p: ModificationGroup) => (
                        <PresetCard
                            key={p.id}
                            categoryId={category.id}
                            preset={p}
                            readOnly={readOnly}
                            showDeleted={showDeleted}
                        />
                    ))}
                </Space>
            )}

            <Modal
                title="Add preset"
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
                        ]}
                        optionType="button"
                        buttonStyle="solid"
                    />

                    <Form form={form} layout="vertical">
                        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                            <Input placeholder="Preset name" />
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
                                    <input type="checkbox" />
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
                    </Form>
                </Space>
            </Modal>
        </Space>
    );
}
