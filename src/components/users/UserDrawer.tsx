// src/components/users/UserDrawer.tsx
import { useEffect } from "react";
import { Drawer, Form, Input, Select, Space, Button, Card, Divider, App, theme } from "antd";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    getTenants,
    type TenantsResponse,
    createAdmin,
    createManager,
    updateUser,
} from "../../http/services/authApi";
import type { Role, User } from "../../types";

type CreateMode = {
    mode: "create";
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
};

type EditMode = {
    mode: "edit";
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    user: User; // prefill
};

type Props = CreateMode | EditMode;

const ROLE_OPTIONS: Role[] = ["admin", "manager"];

function isEdit(p: Props): p is EditMode {
    return p.mode === "edit";
}

export default function UserDrawer(props: Props) {
    const [form] = Form.useForm<{
        firstName: string;
        lastName: string;
        email: string;
        password?: string;
        role?: Role;
        tenantId?: number;
    }>();

    const { message } = App.useApp();
    const { token } = theme.useToken();

    const isCreate = props.mode === "create";
    // ✅ safe user reference for edit mode
    const editUser = isEdit(props) ? props.user : undefined;

    // tenants for Select (create: manager only)
    const { data: tenantsData, isLoading: tenantsLoading } = useQuery<TenantsResponse>({
        queryKey: ["tenant-list"],
        queryFn: getTenants,
        staleTime: 5 * 60 * 1000,
    });
    const tenants = tenantsData?.tenants ?? [];

    // mutations
    const createAdminMut = useMutation({
        mutationFn: createAdmin,
        onSuccess: () => message.success("Admin created"),
    });
    const createManagerMut = useMutation({
        mutationFn: createManager,
        onSuccess: () => message.success("Manager created"),
    });
    const updateMut = useMutation({
        mutationFn: (p: {
            id: number;
            body: { firstName?: string; lastName?: string; email?: string; password?: string };
        }) => updateUser(p.id, p.body),
        onSuccess: () => message.success("User updated"),
    });

    const submitting =
        createAdminMut.isPending || createManagerMut.isPending || updateMut.isPending;

    // prefill / reset
    useEffect(() => {
        if (!props.open) return;

        if (isCreate) {
            form.resetFields();
            form.setFieldsValue({ role: "manager" });
        } else if (editUser) {
            form.setFieldsValue({
                firstName: editUser.firstName,
                lastName: editUser.lastName,
                email: editUser.email,
            });
        }
    }, [props.open, isCreate, editUser, form]);

    const roleWatch = Form.useWatch("role", form);
    const showRestaurant = isCreate && roleWatch === "manager";

    const onSubmit = async () => {
        const values = await form.validateFields();

        if (isCreate) {
            const role = values.role!;
            if (role === "admin") {
                // tenantId must NOT be sent for admins
                await createAdminMut.mutateAsync({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    password: values.password!, // required in create
                });
            } else {
                // managers MUST include tenantId
                await createManagerMut.mutateAsync({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    password: values.password!, // required
                    tenantId: values.tenantId!, // required when role=manager
                });
            }
        } else {
            // EDIT: cannot change role; tenant not editable here
            const body = {
                firstName: values.firstName,
                lastName: values.lastName,
                email: values.email,
                ...(values.password ? { password: values.password } : {}),
            };
            if (editUser) {
                await updateMut.mutateAsync({ id: editUser.id, body });
            }
        }

        form.resetFields();
        props.onSaved();
    };

    // card shell style
    const cardStyle: React.CSSProperties = {
        borderRadius: 8,
        border: `1px solid ${token.colorBorderSecondary}`,
        marginBottom: 12,
    };

    return (
        <Drawer
            key={isCreate ? "create" : `edit-${editUser?.id ?? "unknown"}`} // hard-remount per mode/id
            title={isCreate ? "Create User" : "Edit User"}
            width={520}
            open={props.open}
            onClose={() => {
                form.resetFields();
                props.onClose();
            }}
            destroyOnClose
            styles={{ body: { paddingTop: 12 } }}
            extra={
                <Space>
                    <Button onClick={props.onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="primary" loading={submitting} onClick={onSubmit}>
                        {isCreate ? "Create" : "Update"}
                    </Button>
                </Space>
            }
        >
            {/* Autofill paint fix for dark mode (fallback if you didn't add it globally) */}
            <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:hover {
          -webkit-text-fill-color: inherit;
          transition: background-color 9999s ease-in-out 0s;
          caret-color: inherit;
        }
      `}</style>

            <Form form={form} layout="vertical" requiredMark="optional">
                {/* Basic Info */}
                <Card title="Basic Info" size="small" style={cardStyle}>
                    <Form.Item
                        label="First Name"
                        name="firstName"
                        rules={[{ required: true, message: "First name is required" }]}
                    >
                        <Input placeholder="e.g., Jane" autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        label="Last Name"
                        name="lastName"
                        rules={[{ required: true, message: "Last name is required" }]}
                    >
                        <Input placeholder="e.g., Doe" autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Email is required" },
                            { type: "email", message: "Provide a valid email" },
                        ]}
                    >
                        <Input placeholder="jane@example.com" autoComplete="new-email" />
                    </Form.Item>
                </Card>

                {/* Security Info */}
                <Card title="Security Info" size="small" style={cardStyle}>
                    <Form.Item
                        label="Password"
                        name="password"
                        rules={
                            isCreate ? [{ required: true, message: "Password is required" }] : []
                        }
                        extra={!isCreate ? "Leave blank to keep the current password" : undefined}
                    >
                        <Input.Password
                            placeholder={isCreate ? "Set a password" : "••••••••"}
                            autoComplete="new-password"
                        />
                    </Form.Item>
                </Card>

                {/* Role & Restaurant */}
                <Card title="Role & Restaurant" size="small" style={cardStyle}>
                    <Space direction="vertical" style={{ width: "100%" }} size="middle">
                        {isCreate ? (
                            <Form.Item label="Role" name="role" rules={[{ required: true }]}>
                                <Select
                                    options={ROLE_OPTIONS.map((r) => ({
                                        value: r,
                                        label: r[0].toUpperCase() + r.slice(1),
                                    }))}
                                    onChange={(r) => {
                                        // clear tenant if switching away from manager
                                        if (r === "admin")
                                            form.setFieldValue("tenantId", undefined);
                                    }}
                                />
                            </Form.Item>
                        ) : (
                            <div style={{ fontSize: 13 }}>
                                Role:{" "}
                                <strong>
                                    {editUser
                                        ? editUser.role[0].toUpperCase() + editUser.role.slice(1)
                                        : "—"}
                                </strong>{" "}
                                (cannot change)
                            </div>
                        )}

                        {showRestaurant && (
                            <>
                                <Divider style={{ margin: "4px 0" }} />
                                <Form.Item
                                    label="Select Restaurant"
                                    name="tenantId"
                                    rules={[
                                        { required: true, message: "Please select a restaurant" },
                                    ]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Search restaurant"
                                        loading={tenantsLoading}
                                        optionFilterProp="label"
                                        filterSort={(a, b) =>
                                            (a?.label as string).localeCompare(b?.label as string)
                                        }
                                        options={tenants.map((t) => ({
                                            value: t.id,
                                            label: t.name,
                                        }))}
                                    />
                                </Form.Item>
                            </>
                        )}
                    </Space>
                </Card>
            </Form>
        </Drawer>
    );
}
