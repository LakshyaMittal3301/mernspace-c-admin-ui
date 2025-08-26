import { useMemo, useState } from "react";
import { App, Alert, Tabs } from "antd";
import type { TabsProps } from "antd";
import { useQuery } from "@tanstack/react-query";

import {
    getProduct,
    getCategory,
    listCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    type Category,
    type Product,
    type Id,
} from "../../http/services/catalogApi";

import BasicTab from "./BasicTab";
import AttributesTab from "./AttributesTab";
import ModificationsTab from "./ModificationsTab";
import ImageTab from "./ImageTab";

type Props = {
    open: boolean;
    mode: "create" | "edit";
    productId?: Id;
    isAdmin: boolean;
    onClose: () => void;
    onCreated: (product: Product) => void;
    onUpdated: (product: Product) => void;
    onDeleted: () => void;
};

export default function ProductDrawer({
    open,
    mode,
    productId,
    isAdmin,
    onClose,
    onCreated,
    onUpdated,
    onDeleted,
}: Props) {
    const { message } = App.useApp();

    // Base queries
    const { data: categories } = useQuery({
        queryKey: ["categories", { includeDeleted: false }],
        queryFn: () => listCategories({ includeDeleted: false }),
        staleTime: 5 * 60 * 1000,
    });

    const {
        data: product,
        isFetching: productFetching,
        refetch: refetchProduct,
    } = useQuery<Product>({
        queryKey: ["product", productId, { includeDeleted: false }],
        queryFn: () => getProduct(productId!, { includeDeleted: false }),
        enabled: mode === "edit" && !!productId,
        staleTime: 60_000,
    });

    const { data: category } = useQuery<Category>({
        queryKey: ["category", product?.categoryId, { includeDeleted: false }],
        queryFn: () => getCategory(product!.categoryId, { includeDeleted: false }),
        enabled: !!product?.categoryId,
        staleTime: 60_000,
    });

    const [activeKey, setActiveKey] = useState<string>("basic");

    // Tabs
    const items: TabsProps["items"] = useMemo(() => {
        const arr: TabsProps["items"] = [
            {
                key: "basic",
                label: "Basic",
                children: (
                    <BasicTab
                        mode={mode}
                        isAdmin={isAdmin}
                        product={product}
                        categories={categories ?? []}
                        onCreate={async (payload) => {
                            // Build minimal create payload + base radio group (see plan)
                            try {
                                const created = await createProduct(payload);
                                onCreated(created);
                                setActiveKey("attributes");
                            } catch (err: any) {
                                message.error(err?.message || "Failed to create product");
                            }
                        }}
                        onPatch={async (patch) => {
                            if (!product) return;
                            try {
                                const updated = await updateProduct(product.id, patch);
                                onUpdated(updated);
                                await refetchProduct();
                            } catch (err: any) {
                                message.error(err?.message || "Failed to update product");
                            }
                        }}
                        onChangeCategory={async (newCategoryId) => {
                            if (!product) return;
                            try {
                                const updated = await updateProduct(product.id, {
                                    categoryId: newCategoryId,
                                });
                                onUpdated(updated);
                                await refetchProduct(); // attributeValues cleared on server
                            } catch (err: any) {
                                message.error(err?.message || "Failed to change category");
                            }
                        }}
                        onDelete={async () => {
                            if (!product) return;
                            await deleteProduct(product.id);
                            onDeleted();
                        }}
                    />
                ),
            },
        ];

        // The rest tabs only make sense in edit mode
        if (mode === "edit" && product) {
            arr.push(
                {
                    key: "attributes",
                    label: "Attributes",
                    children: (
                        <AttributesTab
                            product={product}
                            category={category}
                            onSave={async (vals) => {
                                const updated = await updateProduct(product.id, {
                                    attributeValues: vals,
                                });
                                onUpdated(updated);
                                await refetchProduct();
                            }}
                        />
                    ),
                },
                {
                    key: "modifications",
                    label: "Modifications",
                    children: (
                        <ModificationsTab
                            product={product}
                            onProductChange={async () => {
                                const ref = await refetchProduct();
                                if (ref.data) onUpdated(ref.data);
                            }}
                        />
                    ),
                },
                {
                    key: "image",
                    label: "Image",
                    children: (
                        <ImageTab
                            product={product}
                            onUpdated={async () => {
                                const ref = await refetchProduct();
                                if (ref.data) onUpdated(ref.data);
                            }}
                        />
                    ),
                }
            );
        }

        return arr;
    }, [
        mode,
        isAdmin,
        product,
        categories,
        category,
        onCreated,
        onUpdated,
        onDeleted,
        refetchProduct,
        message,
    ]);

    return (
        <div
            style={{
                width: open ? 920 : 0, // “wide” drawer feel, embedded container (we’re reusing AntD Tabs inside a fixed panel)
                display: open ? "block" : "none",
            }}
        >
            {/* Optional warning if archived or deleted */}
            {product?.status === "archived" && (
                <Alert
                    type="warning"
                    message="This product is archived. You can still edit it."
                    style={{ marginBottom: 12 }}
                />
            )}
            {product?.isDeleted && (
                <Alert
                    type="error"
                    message="This product is deleted (read-only view)."
                    style={{ marginBottom: 12 }}
                />
            )}

            <Tabs items={items} activeKey={activeKey} onChange={setActiveKey} />
            {/* Simple close control (parent page controls open/close) */}
            <div style={{ height: 8 }} />
            <div>
                <a onClick={onClose}>Close</a>
            </div>
        </div>
    );
}
