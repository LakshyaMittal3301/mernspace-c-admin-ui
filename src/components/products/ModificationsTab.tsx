import {
    App,
    Button,
    Card,
    Divider,
    Form,
    Input,
    InputNumber,
    Modal,
    Space,
    Table,
    Tag,
    Typography,
    Checkbox,
} from "antd";
import {
    addModification,
    addModificationOptions,
    deleteModification,
    deleteModificationOption,
    setBaseRadio,
    setDefaultRadioOption,
    updateModification,
    updateModificationOption,
    type Product,
    type ModificationGroup,
    type ModificationOption,
} from "../../http/services/catalogApi";
import { PlusOutlined, EditOutlined, DeleteOutlined, StarOutlined } from "@ant-design/icons";

type Props = {
    product: Product;
    onProductChange: () => Promise<void>;
};

export default function ModificationsTab({ product, onProductChange }: Props) {
    const { message } = App.useApp();
    const mods = product.modifications ?? [];

    return (
        <Space direction="vertical" style={{ width: "100%" }} size={12}>
            <Card
                title="Modifications"
                bordered={false}
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openCreateModModal(product, onProductChange, message)}
                    >
                        Add Modification
                    </Button>
                }
            >
                {mods.length === 0 ? (
                    <Typography.Text type="secondary">No modifications yet.</Typography.Text>
                ) : (
                    mods
                        .filter((m) => !m.isDeleted)
                        .map((m) => (
                            <Card
                                key={m.id}
                                size="small"
                                title={
                                    <Space>
                                        <Typography.Text strong>{m.name}</Typography.Text>
                                        {m.kind === "radio" && (m as any).isBase && (
                                            <Tag color="gold">Base</Tag>
                                        )}
                                        <Tag>{m.kind.toUpperCase()}</Tag>
                                    </Space>
                                }
                                extra={
                                    <Space>
                                        <Button
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() =>
                                                openEditModModal(
                                                    product,
                                                    m,
                                                    onProductChange,
                                                    message
                                                )
                                            }
                                        >
                                            Edit
                                        </Button>
                                        {m.kind === "radio" && (
                                            <Button
                                                size="small"
                                                icon={<StarOutlined />}
                                                onClick={async () => {
                                                    try {
                                                        await setBaseRadio(product.id, m.id);
                                                        message.success(`"${m.name}" set as base`);
                                                        await onProductChange();
                                                    } catch (err: any) {
                                                        message.error(
                                                            err?.message || "Failed to set base"
                                                        );
                                                    }
                                                }}
                                            >
                                                Make Base
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() =>
                                                Modal.confirm({
                                                    title: "Delete modification?",
                                                    content:
                                                        "This will remove the whole group (soft delete).",
                                                    okButtonProps: { danger: true },
                                                    onOk: async () => {
                                                        try {
                                                            await deleteModification(
                                                                product.id,
                                                                m.id
                                                            );
                                                            message.success("Modification deleted");
                                                            await onProductChange();
                                                        } catch (err: any) {
                                                            message.error(
                                                                err?.message || "Failed to delete"
                                                            );
                                                        }
                                                    },
                                                })
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </Space>
                                }
                                style={{ marginBottom: 12 }}
                            >
                                <OptionsTable
                                    productId={product.id}
                                    mod={m}
                                    onProductChange={onProductChange}
                                />
                            </Card>
                        ))
                )}
            </Card>
        </Space>
    );
}

function OptionsTable({
    productId,
    mod,
    onProductChange,
}: {
    productId: string;
    mod: ModificationGroup;
    onProductChange: () => Promise<void>;
}) {
    const { message } = App.useApp();
    const columns = [
        {
            title: "Label",
            dataIndex: "label",
            key: "label",
            render: (v: string) => <Typography.Text>{v}</Typography.Text>,
        },
        {
            title: "Price (₹)",
            dataIndex: "price",
            key: "price",
            render: (v: number) => (Number.isFinite(v) ? v : "—"),
        },
        ...(mod.kind === "radio"
            ? [
                  {
                      title: "Default",
                      key: "isDefault",
                      render: (_: any, r: ModificationOption) =>
                          (mod as any).defaultOptionId === r.id ? (
                              <Tag color="green">Default</Tag>
                          ) : null,
                  },
              ]
            : []),
        {
            title: "Actions",
            key: "actions",
            render: (_: any, r: ModificationOption) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() =>
                            openEditOptionModal(productId, mod, r, onProductChange, message)
                        }
                    >
                        Edit
                    </Button>
                    {mod.kind === "radio" && (
                        <Button
                            size="small"
                            onClick={async () => {
                                try {
                                    await setDefaultRadioOption(productId, mod.id, r.id);
                                    message.success(`"${r.label}" is default`);
                                    await onProductChange();
                                } catch (err: any) {
                                    message.error(err?.message || "Failed to set default");
                                }
                            }}
                        >
                            Set Default
                        </Button>
                    )}
                    <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() =>
                            Modal.confirm({
                                title: "Delete option?",
                                okButtonProps: { danger: true },
                                onOk: async () => {
                                    try {
                                        await deleteModificationOption(productId, mod.id, r.id);
                                        message.success("Option deleted");
                                        await onProductChange();
                                    } catch (err: any) {
                                        message.error(err?.message || "Failed to delete option");
                                    }
                                },
                            })
                        }
                    >
                        Delete
                    </Button>
                </Space>
            ),
        },
    ];

    const data = (mod.options ?? []).filter((o) => !o.isDeleted);
    return (
        <>
            <Table<ModificationOption>
                rowKey="id"
                dataSource={data}
                columns={columns as any}
                pagination={false}
                size="small"
            />
            <Divider style={{ margin: "12px 0" }} />
            <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => openAddOptionModal(productId, mod, onProductChange, message)}
            >
                Add Option
            </Button>
        </>
    );
}

/* ---------- Small helper modals ---------- */

function openCreateModModal(product: Product, onProductChange: () => Promise<void>, message: any) {
    const [form] = Form.useForm<{
        kind: "radio" | "checkbox";
        name: string;
        isRequired?: boolean;
        minSelected?: number;
        maxSelected?: number;
    }>();
    Modal.confirm({
        title: "Add Modification",
        icon: null,
        okText: "Create",
        content: (
            <Form form={form} layout="vertical">
                <Form.Item name="kind" label="Kind" rules={[{ required: true }]}>
                    <SelectKind />
                </Form.Item>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g., Cheese" />
                </Form.Item>
                {/* Radio-only */}
                <Form.Item noStyle shouldUpdate={(p, c) => p.kind !== c.kind}>
                    {({ getFieldValue }) =>
                        getFieldValue("kind") === "radio" ? (
                            <Form.Item name="isRequired" label="Required" valuePropName="checked">
                                <Checkbox />
                            </Form.Item>
                        ) : null
                    }
                </Form.Item>
                {/* Checkbox-only */}
                <Form.Item noStyle shouldUpdate={(p, c) => p.kind !== c.kind}>
                    {({ getFieldValue }) =>
                        getFieldValue("kind") === "checkbox" ? (
                            <Space>
                                <Form.Item name="minSelected" label="Min">
                                    <InputNumber min={0} />
                                </Form.Item>
                                <Form.Item name="maxSelected" label="Max">
                                    <InputNumber min={0} />
                                </Form.Item>
                            </Space>
                        ) : null
                    }
                </Form.Item>
            </Form>
        ),
        onOk: async () => {
            const vals = await form.validateFields();
            await addModification(product.id, {
                kind: vals.kind,
                name: vals.name,
                ...(vals.kind === "radio" ? { isRequired: !!vals.isRequired } : {}),
                ...(vals.kind === "checkbox"
                    ? { minSelected: vals.minSelected, maxSelected: vals.maxSelected }
                    : {}),
            } as any);
            message.success("Modification added");
            await onProductChange();
        },
    });
}

function openEditModModal(
    product: Product,
    mod: ModificationGroup,
    onProductChange: () => Promise<void>,
    message: any
) {
    const [form] = Form.useForm<{
        name?: string;
        isRequired?: boolean;
        minSelected?: number;
        maxSelected?: number;
    }>();
    Modal.confirm({
        title: "Edit Modification",
        icon: null,
        okText: "Save",
        content: (
            <Form
                form={form}
                layout="vertical"
                initialValues={{
                    name: mod.name,
                    isRequired: (mod as any).isRequired,
                    minSelected: (mod as any).minSelected,
                    maxSelected: (mod as any).maxSelected,
                }}
            >
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                {mod.kind === "radio" && (
                    <Form.Item name="isRequired" label="Required" valuePropName="checked">
                        <Checkbox />
                    </Form.Item>
                )}
                {mod.kind === "checkbox" && (
                    <Space>
                        <Form.Item name="minSelected" label="Min">
                            <InputNumber min={0} />
                        </Form.Item>
                        <Form.Item name="maxSelected" label="Max">
                            <InputNumber min={0} />
                        </Form.Item>
                    </Space>
                )}
            </Form>
        ),
        onOk: async () => {
            const vals = await form.validateFields();
            await updateModification(product.id, mod.id, vals as any);
            message.success("Modification updated");
            await onProductChange();
        },
    });
}

function openAddOptionModal(
    productId: string,
    mod: ModificationGroup,
    onProductChange: () => Promise<void>,
    message: any
) {
    const [form] = Form.useForm<{ options: { label: string; price: number }[] }>();
    Modal.confirm({
        title: "Add Options",
        icon: null,
        okText: "Add",
        content: (
            <Form
                form={form}
                layout="vertical"
                initialValues={{ options: [{ label: "", price: 0 }] }}
            >
                <Form.List name="options">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map((f) => (
                                <Space key={f.key} align="baseline">
                                    <Form.Item
                                        name={[f.name, "label"]}
                                        rules={[{ required: true, message: "Label required" }]}
                                    >
                                        <Input placeholder="Label" />
                                    </Form.Item>
                                    <Form.Item
                                        name={[f.name, "price"]}
                                        rules={[{ required: true, message: "Price required" }]}
                                    >
                                        <InputNumber min={0} step={1} />
                                    </Form.Item>
                                    <Button danger onClick={() => remove(f.name)}>
                                        Remove
                                    </Button>
                                </Space>
                            ))}
                            <Button type="dashed" onClick={() => add({ label: "", price: 0 })}>
                                Add another
                            </Button>
                        </>
                    )}
                </Form.List>
            </Form>
        ),
        onOk: async () => {
            const vals = await form.validateFields();
            await addModificationOptions(productId, mod.id, vals.options);
            message.success("Options added");
            await onProductChange();
        },
    });
}

function openEditOptionModal(
    productId: string,
    mod: ModificationGroup,
    opt: ModificationOption,
    onProductChange: () => Promise<void>,
    message: any
) {
    const [form] = Form.useForm<{ label?: string; price?: number }>();
    Modal.confirm({
        title: "Edit Option",
        icon: null,
        okText: "Save",
        content: (
            <Form
                form={form}
                layout="vertical"
                initialValues={{ label: opt.label, price: opt.price }}
            >
                <Form.Item name="label" label="Label" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="price" label="Price (₹)" rules={[{ required: true }]}>
                    <InputNumber min={0} step={1} />
                </Form.Item>
            </Form>
        ),
        onOk: async () => {
            const vals = await form.validateFields();
            await updateModificationOption(productId, mod.id, opt.id, vals);
            message.success("Option updated");
            await onProductChange();
        },
    });
}

/* Tiny helper */
function SelectKind() {
    return (
        <select className="ant-input">
            <option value="radio">Radio</option>
            <option value="checkbox">Checkbox</option>
        </select>
    );
}
