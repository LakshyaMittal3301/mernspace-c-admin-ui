// src/components/categories/CategoryDrawer.tsx
import { useEffect, useMemo, useState } from "react";
import { Drawer, Tabs, Space, Button, Tag, App, Alert, Input } from "antd"; // 👈 import Input
import type { TabsProps } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth";
import type { Role } from "../../types";
import {
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    type Category,
} from "../../http/services/catalogApi";
import BasicsTab from "./tabs/BasicsTab";
import AttributesTab from "./tabs/AttributesTab";
import PresetsTab from "./tabs/PresetsTab";

export type CategoryDrawerProps = {
    mode: "create" | "edit";
    open: boolean;
    categoryId?: string;
    onClose: () => void;
    onCreated?: (category: Category) => void;
    onUpdated?: (category: Category) => void;
    onDeleted?: () => void;
    isAdmin?: boolean; // pass from page to avoid recomputing
};

export default function CategoryDrawer(props: CategoryDrawerProps) {
    const {
        mode,
        open,
        categoryId,
        onClose,
        onCreated,
        onUpdated,
        onDeleted,
        isAdmin: isAdminProp,
    } = props;
    const { message } = App.useApp();
    const queryClient = useQueryClient();

    const user = useAuthStore((s) => s.user);
    const role: Role | undefined = user?.role;
    const isAdmin = isAdminProp ?? role === "admin";

    // CREATE MODE ----------------------------------------------------------------
    const [creatingName, setCreatingName] = useState("");
    const createMut = useMutation({
        mutationFn: (name: string) => createCategory({ name }),
        onSuccess: (cat) => {
            onCreated?.(cat);
            message.success("Category created");
        },
        onError: (err: any) => message.error(err?.message || "Failed to create category"),
    });

    useEffect(() => {
        if (open && mode === "create") setCreatingName("");
    }, [open, mode]);

    // EDIT MODE ------------------------------------------------------------------
    const wantsIncludeDeleted = isAdmin; // always fetch with includeDeleted for Admin detail
    const { data: category, isFetching } = useQuery({
        enabled: open && mode === "edit" && !!categoryId,
        queryKey: ["category", categoryId, { includeDeleted: wantsIncludeDeleted }],
        queryFn: () => getCategory(categoryId!, { includeDeleted: wantsIncludeDeleted }),
    });

    const isDeleted = !!category?.isDeleted;
    const canMutate = isAdmin && !isDeleted; // Admin + active only

    const renameMut = useMutation({
        mutationFn: (nextName: string) => updateCategory(category!.id, { name: nextName }),
        onSuccess: (updated) => {
            queryClient.setQueryData(
                ["category", updated.id, { includeDeleted: wantsIncludeDeleted }],
                updated
            );
            onUpdated?.(updated);
            message.success("Saved");
        },
        onError: (err: any) => message.error(err?.message || "Failed to save"),
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteCategory(category!.id),
        onSuccess: async () => {
            message.success("Category deleted");
            onDeleted?.();
            await queryClient.invalidateQueries({ queryKey: ["categories"] });
        },
        onError: (err: any) => message.error(err?.message || "Failed to delete"),
    });

    const items: TabsProps["items"] = useMemo(() => {
        if (mode === "create") return [];
        return [
            {
                key: "basics",
                label: "Basics",
                children: category ? (
                    <BasicsTab
                        category={category}
                        loading={isFetching}
                        canEdit={canMutate}
                        onRename={(name) => renameMut.mutateAsync(name)}
                        onDelete={canMutate ? () => deleteMut.mutateAsync() : undefined}
                    />
                ) : null,
            },
            {
                key: "attributes",
                label: "Attributes",
                children: category ? (
                    <AttributesTab category={category} readOnly={!canMutate} />
                ) : null,
            },
            {
                key: "presets",
                label: "Presets",
                children: category ? (
                    <PresetsTab category={category} readOnly={!canMutate} />
                ) : null,
            },
        ];
    }, [mode, category, isFetching, canMutate]);

    // RENDER ---------------------------------------------------------------------
    const title = mode === "create" ? "Create Category" : category?.name ?? "Category";

    return (
        <Drawer
            open={open}
            width={840}
            onClose={onClose}
            destroyOnClose
            title={
                <Space>
                    <span>{title}</span>
                    {mode === "edit" && isDeleted && <Tag color="red">Deleted</Tag>}
                </Space>
            }
            extra={
                mode === "edit" && canMutate ? (
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteMut.mutate()}
                        loading={deleteMut.isPending}
                    >
                        Delete
                    </Button>
                ) : undefined
            }
            styles={{ body: { paddingTop: 12 } }}
        >
            {mode === "create" ? (
                <div style={{ display: "grid", gap: 16 }}>
                    <Alert
                        type="info"
                        message="Create a category by giving it a unique name."
                        showIcon
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                        <Input
                            aria-label="Category name"
                            placeholder="Category name"
                            value={creatingName}
                            onChange={(e) => setCreatingName(e.target.value)}
                        />
                        <Button
                            type="primary"
                            onClick={() =>
                                creatingName.trim() && createMut.mutate(creatingName.trim())
                            }
                            loading={createMut.isPending}
                        >
                            Create
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {isDeleted && (
                        <Alert
                            type="error"
                            showIcon
                            message="This category is deleted"
                            description="Deleted categories are read-only."
                            style={{ marginBottom: 12 }}
                        />
                    )}
                    <Tabs items={items} />
                </>
            )}
        </Drawer>
    );
}
