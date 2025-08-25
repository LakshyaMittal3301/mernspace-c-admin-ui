import { useMemo, useState, type JSX } from "react";
import { App, Badge, Button, Card, Form, Input, Modal, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import ConfirmModal from "../common/ConfirmModal";
import {
    type AttributeDef,
    type AttributeOption,
    type Category,
    addAttributeOptions,
    updateAttribute,
    deleteAttribute,
    updateAttributeOption,
    deleteAttributeOption,
    setAttributeDefault,
} from "../../http/services/catalogApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AttributeCard({
    categoryId,
    attribute,
    readOnly,
    showDeleted,
}: {
    categoryId: string;
    attribute: AttributeDef;
    readOnly: boolean;
    showDeleted?: boolean;
}) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const [addForm] = Form.useForm<{ labels: string[] }>();
    const [labelForm] = Form.useForm<{ label: string }>();

    const [editOpen, setEditOpen] = useState(false);
    const [addOptOpen, setAddOptOpen] = useState(false);
    const [editLabel, setEditLabel] = useState<{ open: boolean; option?: AttributeOption } | null>(
        null
    );
    const [deleteOpt, setDeleteOpt] = useState<AttributeOption | null>(null);
    const [deleteAttrOpen, setDeleteAttrOpen] = useState(false);

    const options = attribute.options ?? [];
    const activeOptions = useMemo(() => options.filter((o) => !o.isDeleted), [options]);
    const defaultId = (attribute as any).defaultOptionId as string | undefined | null;

    const canMutate = !readOnly;
    const isSwitch = attribute.kind === "switch";
    const isRadio = attribute.kind === "radio";
    const isCheckbox = attribute.kind === "checkbox";

    // Mutations
    const updAttr = useMutation({
        mutationFn: (payload: any) => updateAttribute(categoryId, attribute.id, payload as any),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Saved");
            setEditOpen(false);
        },
        onError: (e: any) => message.error(e?.message || "Failed to update attribute"),
    });

    const delAttr = useMutation({
        mutationFn: () => deleteAttribute(categoryId, attribute.id),
        onSuccess: (updated: any) => {
            // delete endpoint returns void per API, but server commonly returns 204; refetch list via invalidate
            queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
            message.success("Attribute deleted");
            setDeleteAttrOpen(false);
        },
        onError: (e: any) => message.error(e?.message || "Failed to delete attribute"),
    });

    const addOpts = useMutation({
        mutationFn: (labels: string[]) =>
            addAttributeOptions(
                categoryId,
                attribute.id,
                labels.map((l) => ({ label: l } as any))
            ),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Options added");
            setAddOptOpen(false);
        },
        onError: (e: any) => message.error(e?.message || "Failed to add options"),
    });

    const updOpt = useMutation({
        mutationFn: ({ optId, label }: { optId: string; label: string }) =>
            updateAttributeOption(categoryId, attribute.id, optId, { label }),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Label updated");
            setEditLabel(null);
        },
        onError: (e: any) => message.error(e?.message || "Failed to update option"),
    });

    const delOpt = useMutation({
        mutationFn: (optId: string) => deleteAttributeOption(categoryId, attribute.id, optId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
            message.success("Option deleted");
            setDeleteOpt(null);
        },
        onError: (e: any) => message.error(e?.message || "Failed to delete option"),
    });

    const setDefault = useMutation({
        mutationFn: (optId: string | null) => setAttributeDefault(categoryId, attribute.id, optId),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Default updated");
        },
        onError: (e: any) => message.error(e?.message || "Failed to set default"),
    });

    // Columns for options table
    type Row = AttributeOption & { isDefault?: boolean };
    const rows: Row[] = (showDeleted ? options : activeOptions).map((o) => ({
        ...o,
        isDefault: defaultId === o.id,
    }));

    const columns: ColumnsType<Row> = [
        {
            title: "Label",
            dataIndex: "label",
            key: "label",
            render: (v, r) => (
                <Space>
                    <span>{v}</span>
                    {r.isDeleted && <Tag color="red">Deleted</Tag>}
                    {r.isDefault && <Badge color="blue" text="Default" />}
                </Space>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: (_v, r) => {
                const actions: JSX.Element[] = [];
                const disabled = !canMutate || r.isDeleted;

                if (isRadio || isSwitch) {
                    actions.push(
                        <Button
                            key="def"
                            size="small"
                            disabled={disabled || r.isDefault}
                            onClick={() => setDefault.mutate(r.id!)}
                        >
                            Set default
                        </Button>
                    );
                }
                if (isRadio) {
                    actions.push(
                        <Button
                            key="clr"
                            size="small"
                            disabled={disabled || !r.isDefault}
                            onClick={() => setDefault.mutate(null)}
                        >
                            Clear default
                        </Button>
                    );
                }
                actions.push(
                    <Button
                        key="edit"
                        size="small"
                        disabled={disabled}
                        onClick={() => setEditLabel({ open: true, option: r })}
                    >
                        Edit label
                    </Button>
                );
                actions.push(
                    <Button
                        key="del"
                        size="small"
                        danger
                        disabled={disabled || isSwitch}
                        onClick={() => {
                            // guard for checkbox constraints: don't allow delete if it would violate bounds
                            if (isCheckbox) {
                                const nextActive = activeOptions.length - 1;
                                const max = (attribute as any).maxSelected ?? 0;
                                const min = (attribute as any).minSelected ?? 0;
                                if (nextActive < max) {
                                    message.error(
                                        `Cannot delete: would reduce active options below maxSelected (${max}).`
                                    );
                                    return;
                                }
                                if (nextActive < min) {
                                    message.error(
                                        `Cannot delete: would reduce active options below minSelected (${min}).`
                                    );
                                    return;
                                }
                            }
                            setDeleteOpt(r);
                        }}
                    >
                        Delete
                    </Button>
                );
                return <Space>{actions}</Space>;
            },
        },
    ];

    // Render
    return (
        <Card
            size="small"
            title={
                <Space>
                    <strong>{attribute.name}</strong>
                    <Tag>{attribute.kind}</Tag>
                    {attribute.isDeleted && <Tag color="red">Deleted</Tag>}
                    {isCheckbox &&
                        (attribute as any).minSelected != null &&
                        (attribute as any).maxSelected != null && (
                            <Tooltip
                                title={`min ${String((attribute as any).minSelected)}, max ${String(
                                    (attribute as any).maxSelected
                                )}`}
                            >
                                <Tag color="geekblue">{`min ${
                                    (attribute as any).minSelected
                                } / max ${(attribute as any).maxSelected}`}</Tag>
                            </Tooltip>
                        )}
                    {isRadio && (attribute as any).isRequired && <Tag color="purple">Required</Tag>}
                </Space>
            }
            extra={
                !canMutate ? undefined : (
                    <Space>
                        <Button size="small" onClick={() => setEditOpen(true)}>
                            Edit
                        </Button>
                        <Button size="small" danger onClick={() => setDeleteAttrOpen(true)}>
                            Delete
                        </Button>
                    </Space>
                )
            }
            style={{ width: "100%" }}
        >
            <Table<Row>
                size="small"
                rowKey={(r) => r.id as string}
                columns={columns}
                dataSource={rows}
                pagination={false}
            />

            {/* Add options */}
            {!readOnly && !isSwitch && (
                <div style={{ marginTop: 8 }}>
                    <Button onClick={() => setAddOptOpen(true)}>Add options</Button>
                </div>
            )}

            {/* Edit attribute modal */}
            <Modal
                open={editOpen}
                title={`Edit ${attribute.kind}`}
                onCancel={() => setEditOpen(false)}
                footer={null}
                destroyOnClose
            >
                <EditAttributeForm
                    attribute={attribute}
                    onSubmit={async (payload) => {
                        await updAttr.mutateAsync(payload);
                        setEditOpen(false);
                    }}
                    onCancel={() => setEditOpen(false)}
                    loading={updAttr.isPending}
                />
            </Modal>

            {/* Add options modal */}
            <Modal
                open={addOptOpen}
                title="Add options"
                onCancel={() => setAddOptOpen(false)}
                onOk={async () => {
                    const { labels } = await addForm.validateFields();
                    if (!labels?.length || labels.some((l: string) => !l?.trim())) {
                        message.error("Please add at least one label");
                        return;
                    }
                    await addOpts.mutateAsync(labels.map((l: string) => l.trim()));
                }}
                okButtonProps={{ loading: addOpts.isPending }}
                destroyOnClose
            >
                <Form form={addForm} layout="vertical" initialValues={{ labels: ["", ""] }}>
                    <Form.List name="labels">
                        {(fields, { add, remove }) => (
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {fields.map((f) => (
                                    <Space key={f.key} align="baseline">
                                        <Form.Item
                                            {...f}
                                            rules={[{ required: true, message: "Label required" }]}
                                        >
                                            <Input placeholder="Label" />
                                        </Form.Item>
                                        {fields.length > 1 && (
                                            <Button onClick={() => remove(f.name)}>Remove</Button>
                                        )}
                                    </Space>
                                ))}
                                <Button onClick={() => add("")}>Add another</Button>
                            </Space>
                        )}
                    </Form.List>
                </Form>
            </Modal>

            {/* Edit label modal */}
            <Modal
                open={!!editLabel?.open}
                title="Edit option label"
                onCancel={() => setEditLabel(null)}
                onOk={async () => {
                    const { label } = await labelForm.validateFields();
                    if (!editLabel?.option?.id) return;
                    await updOpt.mutateAsync({
                        optId: editLabel.option.id,
                        label: (label as string).trim(),
                    });
                }}
                okButtonProps={{ loading: updOpt.isPending }}
                destroyOnClose
            >
                <Form
                    form={labelForm}
                    layout="vertical"
                    initialValues={{ label: editLabel?.option?.label }}
                >
                    <Form.Item name="label" label="Label" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Delete option confirm */}
            <ConfirmModal
                open={!!deleteOpt}
                title="Delete option?"
                danger
                onCancel={() => setDeleteOpt(null)}
                onConfirm={async () => {
                    if (deleteOpt?.id) await delOpt.mutateAsync(deleteOpt.id);
                }}
                description={
                    <>
                        This will soft delete <strong>{deleteOpt?.label}</strong>.
                    </>
                }
                confirming={delOpt.isPending}
            />

            {/* Delete attribute confirm */}
            <ConfirmModal
                open={deleteAttrOpen}
                title="Delete attribute?"
                danger
                onCancel={() => setDeleteAttrOpen(false)}
                onConfirm={async () => delAttr.mutateAsync()}
                confirming={delAttr.isPending}
                description={<>This attribute will be soft deleted and hidden by default.</>}
            />
        </Card>
    );
}

function EditAttributeForm({
    attribute,
    onSubmit,
    onCancel,
    loading,
}: {
    attribute: AttributeDef;
    onSubmit: (payload: any) => void | Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}) {
    const [form] = Form.useForm();
    const isRadio = attribute.kind === "radio";
    const isCheckbox = attribute.kind === "checkbox";

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{
                name: attribute.name,
                isRequired: (attribute as any).isRequired,
                minSelected: (attribute as any).minSelected,
                maxSelected: (attribute as any).maxSelected,
            }}
            onFinish={(vals) => onSubmit(vals)}
        >
            <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
            </Form.Item>

            {isRadio && (
                <Form.Item name="isRequired" label="Required" valuePropName="checked">
                    <input type="checkbox" />
                </Form.Item>
            )}

            {isCheckbox && (
                <>
                    <Form.Item name="minSelected" label="Min selected">
                        {" "}
                        <Input type="number" min={0} />{" "}
                    </Form.Item>
                    <Form.Item name="maxSelected" label="Max selected">
                        {" "}
                        <Input type="number" min={0} />{" "}
                    </Form.Item>
                </>
            )}

            <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                <Button onClick={onCancel}>Cancel</Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                    Save
                </Button>
            </Space>
        </Form>
    );
}
