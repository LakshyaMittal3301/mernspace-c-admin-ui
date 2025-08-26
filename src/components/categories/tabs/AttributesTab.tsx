import { useEffect, useMemo, useState } from "react";
import {
    App,
    Alert,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Radio,
    Slider,
    Space,
    Switch as AntSwitch,
} from "antd";
import type { Category } from "../../../http/services/catalogApi";
import { addAttribute, type AttributeDef } from "../../../http/services/catalogApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import AttributeCard from "../AttributeCard";

type OptionItem = { label: string };

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

    // Always watch these (don’t call hooks conditionally)
    const optionsWatch = Form.useWatch("options", form) as OptionItem[] | undefined;
    const optionALabel = Form.useWatch("optionA", form) as string | undefined;
    const optionBLabel = Form.useWatch("optionB", form) as string | undefined;

    const optionCount = (optionsWatch ?? []).filter((o) => o && o.label?.trim()).length;

    const optionRadioChoices =
        (optionsWatch ?? []).map((o, idx) => ({
            label: o?.label?.trim() ? o.label : `Option ${idx + 1}`,
            value: idx,
        })) || [];

    // Slider marks 0..optionCount
    const marks = useMemo(() => {
        const m: Record<number, React.ReactNode> = {};
        for (let i = 0; i <= optionCount; i++) m[i] = String(i);
        return m;
    }, [optionCount]);

    // Keep checkbox range in sync with optionCount; default to [0, optionCount]
    useEffect(() => {
        const current = form.getFieldValue("range") as [number, number] | undefined;
        const max = optionCount;
        const safe: [number, number] = [
            Math.min(current?.[0] ?? 0, max),
            Math.min(current?.[1] ?? max, max),
        ];
        if (!current || current[0] !== safe[0] || current[1] !== safe[1]) {
            form.setFieldsValue({ range: safe });
        }
    }, [optionCount, form]);

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
                options: (values.options || []).map((o: OptionItem) => ({ label: o.label })),
                ...(typeof values.defaultIndex === "number"
                    ? { defaultOptionIndex: values.defaultIndex }
                    : {}),
            };
            addMut.mutate(payload);
        } else if (kind === "checkbox") {
            const [min, max] = (values.range ?? [undefined, undefined]) as [number?, number?];
            const payload = {
                kind: "checkbox" as const,
                name: values.name,
                minSelected: typeof min === "number" ? min : undefined,
                maxSelected: typeof max === "number" ? max : undefined,
                options: (values.options || []).map((o: OptionItem) => ({ label: o.label })),
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
                ...(typeof values.defaultSwitch === "number"
                    ? { defaultOptionIndex: values.defaultSwitch }
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
                                    <Form.List
                                        name="options"
                                        initialValue={[{ label: "" }, { label: "" }]}
                                    >
                                        {(fields, { add, remove }) => (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {fields.map((f) => (
                                                    <Space key={f.key} align="baseline">
                                                        <Form.Item
                                                            name={[f.name, "label"]}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: "Label required",
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="Label" />
                                                        </Form.Item>
                                                        {fields.length > 1 && (
                                                            <Button onClick={() => remove(f.name)}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </Space>
                                                ))}
                                                <Button onClick={() => add({ label: "" })}>
                                                    Add option
                                                </Button>
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

                                <Form.Item name="defaultIndex" label="Default option (optional)">
                                    <Radio.Group options={optionRadioChoices} />
                                </Form.Item>
                            </>
                        )}

                        {kind === "checkbox" && (
                            <>
                                <Form.Item label="Options" required>
                                    <Form.List
                                        name="options"
                                        initialValue={[{ label: "" }, { label: "" }]}
                                    >
                                        {(fields, { add, remove }) => (
                                            <Space direction="vertical" style={{ width: "100%" }}>
                                                {fields.map((f) => (
                                                    <Space key={f.key} align="baseline">
                                                        <Form.Item
                                                            name={[f.name, "label"]}
                                                            rules={[
                                                                {
                                                                    required: true,
                                                                    message: "Label required",
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="Label" />
                                                        </Form.Item>
                                                        {fields.length > 1 && (
                                                            <Button onClick={() => remove(f.name)}>
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </Space>
                                                ))}
                                                <Button onClick={() => add({ label: "" })}>
                                                    Add option
                                                </Button>
                                            </Space>
                                        )}
                                    </Form.List>
                                </Form.Item>

                                <Form.Item name="range" label="Allowed selections (min — max)">
                                    <Slider
                                        range
                                        min={0}
                                        max={Math.max(0, optionCount)}
                                        step={1}
                                        marks={marks}
                                        tooltip={{ open: false }}
                                    />
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
                                <Form.Item name="defaultSwitch" label="Default">
                                    <Radio.Group
                                        options={[
                                            { label: optionALabel || "Option A", value: 0 },
                                            { label: optionBLabel || "Option B", value: 1 },
                                        ]}
                                    />
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </Space>
            </Modal>
        </Space>
    );
}
