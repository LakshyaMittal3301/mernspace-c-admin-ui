// src/components/categories/PresetCard.tsx
import { useMemo, useState, type JSX } from "react";
import { App, Badge, Button, Card, Form, Input, Modal, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import ConfirmModal from "../common/ConfirmModal";
import {
    type ModificationGroup,
    type ModificationOption,
    type Category,
    addPresetOptions,
    updatePreset,
    deletePreset,
    updatePresetOption,
    deletePresetOption,
    setPresetDefault,
} from "../../http/services/catalogApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function PresetCard({
    categoryId,
    preset,
    readOnly,
    showDeleted,
}: {
    categoryId: string;
    preset: ModificationGroup;
    readOnly: boolean;
    showDeleted?: boolean;
}) {
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const [addForm] = Form.useForm<{ labels: string[] }>();
    const [labelForm] = Form.useForm<{ label: string }>();

    const [editOpen, setEditOpen] = useState(false);
    const [addOptOpen, setAddOptOpen] = useState(false);
    const [editLabel, setEditLabel] = useState<{
        open: boolean;
        option?: ModificationOption;
    } | null>(null);
    const [deleteOpt, setDeleteOpt] = useState<ModificationOption | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const options = preset.options ?? [];
    const activeOptions = useMemo(() => options.filter((o) => !o.isDeleted), [options]);
    const defaultId = (preset as any).defaultOptionId as string | undefined | null;

    const canMutate = !readOnly;
    const isRadio = preset.kind === "radio";
    const isCheckbox = preset.kind === "checkbox";

    const updPreset = useMutation({
        mutationFn: (payload: any) => updatePreset(categoryId, preset.id, payload as any),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Saved");
            setEditOpen(false);
        },
        onError: (e: any) => message.error(e?.message || "Failed to update preset"),
    });

    const delPreset = useMutation({
        mutationFn: () => deletePreset(categoryId, preset.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
            message.success("Preset deleted");
            setDeleteOpen(false);
        },
        onError: (e: any) => message.error(e?.message || "Failed to delete preset"),
    });

    const addOpts = useMutation({
        mutationFn: (labels: string[]) =>
            addPresetOptions(
                categoryId,
                preset.id,
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
            updatePresetOption(categoryId, preset.id, optId, { label }),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Label updated");
            setEditLabel(null);
        },
        onError: (e: any) => message.error(e?.message || "Failed to update option"),
    });

    const delOpt = useMutation({
        mutationFn: (optId: string) => deletePresetOption(categoryId, preset.id, optId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["category", categoryId] });
            message.success("Option deleted");
            setDeleteOpt(null);
        },
        onError: (e: any) => message.error(e?.message || "Failed to delete option"),
    });

    const setDefault = useMutation({
        mutationFn: (optId: string | null) => setPresetDefault(categoryId, preset.id, optId),
        onSuccess: (updated: Category) => {
            queryClient.setQueryData(["category", categoryId, { includeDeleted: true }], updated);
            message.success("Default updated");
        },
        onError: (e: any) => message.error(e?.message || "Failed to set default"),
    });

    type Row = ModificationOption & { isDefault?: boolean };
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
                if (isRadio) {
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
                        disabled={disabled}
                        onClick={() => {
                            if (isCheckbox) {
                                const nextActive = activeOptions.length - 1;
                                const max = (preset as any).maxSelected ?? 0;
                                const min = (preset as any).minSelected ?? 0;
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

    return (
        <Card
            size="small"
            title={
                <Space>
                    <strong>{preset.name}</strong>
                    <Tag>{preset.kind}</Tag>
                    {preset.isDeleted && <Tag color="red">Deleted</Tag>}
                    {isCheckbox &&
                        (preset as any).minSelected != null &&
                        (preset as any).maxSelected != null && (
                            <Tooltip
                                title={`min ${String((preset as any).minSelected)}, max ${String(
                                    (preset as any).maxSelected
                                )}`}
                            >
                                <Tag color="geekblue">{`min ${(preset as any).minSelected} / max ${
                                    (preset as any).maxSelected
                                }`}</Tag>
                            </Tooltip>
                        )}
                </Space>
            }
            extra={
                !canMutate ? undefined : (
                    <Space>
                        <Button size="small" onClick={() => setEditOpen(true)}>
                            Edit
                        </Button>
                        <Button size="small" danger onClick={() => setDeleteOpen(true)}>
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

            {!readOnly && (
                <div style={{ marginTop: 8 }}>
                    <Button onClick={() => setAddOptOpen(true)}>Add options</Button>
                </div>
            )}

            {/* Edit preset modal */}
            <Modal
                open={editOpen}
                title={`Edit ${preset.kind}`}
                onCancel={() => setEditOpen(false)}
                footer={null}
                destroyOnClose
            >
                <EditPresetForm
                    preset={preset}
                    onSubmit={async (payload) => {
                        await updPreset.mutateAsync(payload);
                        setEditOpen(false);
                    }}
                    onCancel={() => setEditOpen(false)}
                    loading={updPreset.isPending}
                />
            </Modal>

            <Modal
                open={addOptOpen}
                title="Add options"
                onCancel={() => setAddOptOpen(false)}
                onOk={async () => {
                    const { labels } = await addForm.validateFields();
                    if (!labels || labels.length === 0 || labels.some((l) => !l || !l.trim())) {
                        message.error("Please add at least one label");
                        return;
                    }
                    await addOpts.mutateAsync(labels.map((l) => l.trim()));
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

            <Modal
                open={!!editLabel?.open}
                title="Edit option label"
                onCancel={() => setEditLabel(null)}
                onOk={async () => {
                    const { label } = await labelForm.validateFields();
                    if (!editLabel?.option?.id) return;
                    await updOpt.mutateAsync({ optId: editLabel.option.id, label: label.trim() });
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

            <ConfirmModal
                open={deleteOpen}
                title="Delete preset?"
                danger
                onCancel={() => setDeleteOpen(false)}
                onConfirm={async () => delPreset.mutateAsync()}
                confirming={delPreset.isPending}
                description={<>This preset will be soft deleted.</>}
            />
            <ConfirmModal
                open={!!deleteOpt}
                title="Delete option?"
                danger
                onCancel={() => setDeleteOpt(null)}
                onConfirm={async () => {
                    if (deleteOpt?.id) await delOpt.mutateAsync(deleteOpt.id);
                }}
                confirming={delOpt.isPending}
                description={
                    <>
                        This will soft delete <strong>{deleteOpt?.label}</strong>.
                    </>
                }
            />
        </Card>
    );
}

function EditPresetForm({
    preset,
    onSubmit,
    onCancel,
    loading,
}: {
    preset: ModificationGroup;
    onSubmit: (payload: any) => void | Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}) {
    const [form] = Form.useForm();
    const isRadio = preset.kind === "radio";
    const isCheckbox = preset.kind === "checkbox";

    return (
        <Form
            form={form}
            layout="vertical"
            initialValues={{
                name: preset.name,
                isRequired: (preset as any).isRequired,
                minSelected: (preset as any).minSelected,
                maxSelected: (preset as any).maxSelected,
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
                        <Input type="number" min={0} />
                    </Form.Item>
                    <Form.Item name="maxSelected" label="Max selected">
                        <Input type="number" min={0} />
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
