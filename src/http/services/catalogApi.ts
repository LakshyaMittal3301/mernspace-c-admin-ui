import { api, PATHS } from "../baseClient";

/** ---------- Shared types ---------- */
export type Id = string;

export type AttributeKind = "radio" | "checkbox" | "switch";
export type ProductStatus = "draft" | "active" | "archived";

export type Timestamp = string; // ISO UTC
export type ImageRef = { key: string; url: string };

/** Small helper to accept wrapped or raw payloads */
function unwrap<T>(data: any, key: string): T {
    return data && Object.prototype.hasOwnProperty.call(data, key) ? (data[key] as T) : (data as T);
}

/** ---------- Category types ---------- */
export type AttributeOption = {
    id: Id;
    label: string;
    isDeleted?: boolean;
    deletedAt?: Timestamp | null;
};

export type AttributeDef =
    | {
          id: Id;
          kind: "radio";
          name: string;
          isRequired?: boolean;
          options: AttributeOption[];
          defaultOptionId?: Id | null;
          isDeleted?: boolean;
          deletedAt?: Timestamp | null;
      }
    | {
          id: Id;
          kind: "checkbox";
          name: string;
          minSelected?: number;
          maxSelected?: number;
          options: AttributeOption[];
          isDeleted?: boolean;
          deletedAt?: Timestamp | null;
      }
    | {
          id: Id;
          kind: "switch";
          name: string;
          options: [AttributeOption, AttributeOption]; // always exactly 2 active options
          defaultOptionId?: Id | null;
          isDeleted?: boolean;
          deletedAt?: Timestamp | null;
      };

export type CategoryListItem = {
    id: Id;
    name: string;
    isDeleted: boolean;
    deletedAt?: Timestamp | null; // omitted when not deleted
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export type Category = CategoryListItem & {
    attributes: AttributeDef[];
    modificationPresets: ModificationGroup[];
};

/** ---------- Product types ---------- */
export type AttributeValue =
    | { defId: Id; kind: "radio"; selectedOptionId: Id | null }
    | { defId: Id; kind: "switch"; selectedOptionId: Id }
    | { defId: Id; kind: "checkbox"; selectedOptionIds: Id[] };

export type ModificationKind = "radio" | "checkbox";

export type ModificationOption = {
    id: Id;
    label: string;
    price: number; // rupees, integer
    isDeleted?: boolean;
    deletedAt?: Timestamp | null;
};

export type ModificationGroup =
    | {
          id: Id;
          kind: "radio";
          name: string;
          isBase?: boolean;
          isRequired?: boolean;
          options: ModificationOption[];
          defaultOptionId?: Id | null;
          isDeleted?: boolean;
          deletedAt?: Timestamp | null;
      }
    | {
          id: Id;
          kind: "checkbox";
          name: string;
          minSelected?: number;
          maxSelected?: number;
          options: ModificationOption[];
          isDeleted?: boolean;
          deletedAt?: Timestamp | null;
      };

export type ProductListItem = {
    id: Id;
    tenantId: string;
    name: string;
    description?: string;
    image?: ImageRef;
    categoryId: Id;
    status: ProductStatus;
    isDeleted: boolean;
    deletedAt: Timestamp | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    basePrice: number; // rupees
};

export type Product = Omit<ProductListItem, "basePrice"> & {
    attributeValues: AttributeValue[];
    modifications: ModificationGroup[];
};

export type PageInfo = { page: number; limit: number; total: number; hasNextPage: boolean };

const CATALOG = PATHS.CATALOG;

/** =========================
 *        CATEGORIES
 * ========================= */
export async function listCategories(params?: {
    includeDeleted?: boolean;
}): Promise<CategoryListItem[]> {
    const qs = new URLSearchParams();
    if (params?.includeDeleted) qs.set("includeDeleted", "true");
    const url = qs.toString() ? `${CATALOG}/categories?${qs.toString()}` : `${CATALOG}/categories`;
    // Backend returns: { categories: [...] }
    const { data } = await api.get<{ categories: CategoryListItem[] }>(url);
    return Array.isArray(data?.categories) ? data.categories : [];
}

export async function getCategory(id: Id, opts?: { includeDeleted?: boolean }): Promise<Category> {
    const qs = new URLSearchParams();
    if (opts?.includeDeleted) qs.set("includeDeleted", "true");
    const url = qs.toString()
        ? `${CATALOG}/categories/${id}?${qs.toString()}`
        : `${CATALOG}/categories/${id}`;
    // Backend returns: { category: {...} }
    const { data } = await api.get<{ category: Category } | Category>(url);
    return unwrap<Category>(data, "category");
}

export type CreateCategoryPayload = {
    name: string;
    attributes?: Array<
        | {
              kind: "radio";
              name: string;
              isRequired?: boolean;
              options: { label: string }[];
              defaultOptionIndex?: number;
          }
        | {
              kind: "checkbox";
              name: string;
              options: { label: string }[];
              minSelected?: number;
              maxSelected?: number;
          }
        | {
              kind: "switch";
              name: string;
              options: [{ label: string }, { label: string }];
              defaultOptionIndex?: 0 | 1;
          }
    >;
    modificationPresets?: Array<
        | {
              kind: "radio";
              name: string;
              isRequired?: boolean;
              options: { label: string }[];
              defaultOptionIndex?: number;
          }
        | {
              kind: "checkbox";
              name: string;
              options: { label: string }[];
              minSelected?: number;
              maxSelected?: number;
          }
    >;
};

export async function createCategory(payload: CreateCategoryPayload): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.post<{ category: Category }>(`${CATALOG}/categories`, payload);
    return unwrap<Category>(data, "category");
}

export async function updateCategory(id: Id, payload: { name: string }): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.patch<{ category: Category }>(
        `${CATALOG}/categories/${id}`,
        payload
    );
    return unwrap<Category>(data, "category");
}

export async function deleteCategory(id: Id): Promise<void> {
    await api.delete(`${CATALOG}/categories/${id}`);
}

/** Category → Attributes */
export async function addAttribute(
    categoryId: Id,
    attribute:
        | {
              kind: "radio";
              name: string;
              isRequired?: boolean;
              options: { label: string }[];
              defaultOptionIndex?: number;
          }
        | {
              kind: "checkbox";
              name: string;
              options: { label: string }[];
              minSelected?: number;
              maxSelected?: number;
          }
        | {
              kind: "switch";
              name: string;
              options: [{ label: string }, { label: string }];
              defaultOptionIndex?: 0 | 1;
          }
): Promise<Category> {
    // Backend returns: { category } with 201
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/attributes`,
        attribute
    );
    return unwrap<Category>(data, "category");
}

export async function updateAttribute(
    categoryId: Id,
    attrId: Id,
    payload:
        | { name?: string; isRequired?: boolean } // radio
        | { name?: string; minSelected?: number; maxSelected?: number } // checkbox
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.patch<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/attributes/${attrId}`,
        payload
    );
    return unwrap<Category>(data, "category");
}

export async function deleteAttribute(categoryId: Id, attrId: Id): Promise<void> {
    await api.delete(`${CATALOG}/categories/${categoryId}/attributes/${attrId}`);
}

/** Category → Attribute Options */
export async function addAttributeOptions(
    categoryId: Id,
    attrId: Id,
    options: { label: string }[]
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/attributes/${attrId}/options`,
        { options }
    );
    return unwrap<Category>(data, "category");
}

export async function updateAttributeOption(
    categoryId: Id,
    attrId: Id,
    optId: Id,
    payload: { label: string }
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.patch<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/attributes/${attrId}/options/${optId}`,
        payload
    );
    return unwrap<Category>(data, "category");
}

export async function deleteAttributeOption(categoryId: Id, attrId: Id, optId: Id): Promise<void> {
    await api.delete(`${CATALOG}/categories/${categoryId}/attributes/${attrId}/options/${optId}`);
}

export async function setAttributeDefault(
    categoryId: Id,
    attrId: Id,
    optionId: Id | null
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/attributes/${attrId}/default`,
        { optionId }
    );
    return unwrap<Category>(data, "category");
}

/** Category → Presets */
export async function addPreset(
    categoryId: Id,
    preset:
        | {
              kind: "radio";
              name: string;
              isRequired?: boolean;
              options: { label: string }[];
              defaultOptionIndex?: number;
          }
        | {
              kind: "checkbox";
              name: string;
              options: { label: string }[];
              minSelected?: number;
              maxSelected?: number;
          }
): Promise<Category> {
    // Backend returns: { category } with 201
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/presets`,
        preset
    );
    return unwrap<Category>(data, "category");
}

export async function updatePreset(
    categoryId: Id,
    presetId: Id,
    payload:
        | { name?: string; isRequired?: boolean } // radio
        | { name?: string; minSelected?: number; maxSelected?: number } // checkbox
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.patch<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/presets/${presetId}`,
        payload
    );
    return unwrap<Category>(data, "category");
}

export async function deletePreset(categoryId: Id, presetId: Id): Promise<void> {
    await api.delete(`${CATALOG}/categories/${categoryId}/presets/${presetId}`);
}

export async function addPresetOptions(
    categoryId: Id,
    presetId: Id,
    options: { label: string }[]
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/presets/${presetId}/options`,
        { options }
    );
    return unwrap<Category>(data, "category");
}

export async function updatePresetOption(
    categoryId: Id,
    presetId: Id,
    optId: Id,
    payload: { label: string }
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.patch<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/presets/${presetId}/options/${optId}`,
        payload
    );
    return unwrap<Category>(data, "category");
}

export async function deletePresetOption(categoryId: Id, presetId: Id, optId: Id): Promise<void> {
    await api.delete(`${CATALOG}/categories/${categoryId}/presets/${presetId}/options/${optId}`);
}

export async function setPresetDefault(
    categoryId: Id,
    presetId: Id,
    optionId: Id | null
): Promise<Category> {
    // Backend returns: { category }
    const { data } = await api.post<{ category: Category }>(
        `${CATALOG}/categories/${categoryId}/presets/${presetId}/default`,
        { optionId }
    );
    return unwrap<Category>(data, "category");
}

/** =========================
 *          PRODUCTS
 * ========================= */
export type CreateProductPayload = {
    // Admin must provide tenantId; Manager's is ignored even if sent
    tenantId?: string;
    name: string;
    description?: string;
    image?: { key: string };
    categoryId: Id;
    attributeValues?: AttributeValue[];
    modifications: Array<
        | {
              kind: "radio";
              name: string;
              isBase?: boolean;
              isRequired?: boolean;
              options: { label: string; price: number }[];
              defaultOptionIndex?: number;
          }
        | {
              kind: "checkbox";
              name: string;
              options: { label: string; price: number }[];
              minSelected?: number;
              maxSelected?: number;
          }
    >;
    status: ProductStatus;
};

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
    // Tolerate { product } or raw
    const { data } = await api.post<{ product: Product } | Product>(`${CATALOG}/products`, payload);
    return unwrap<Product>(data, "product");
}

export type UpdateProductPayload = Partial<{
    name: string;
    description: string;
    status: ProductStatus;
    image: { key: string };
    categoryId: Id; // if present → server clears attributeValues
    attributeValues: AttributeValue[]; // full replacement when provided
}>;

export async function updateProduct(id: Id, payload: UpdateProductPayload): Promise<Product> {
    // Tolerate { product } or raw
    const { data } = await api.patch<{ product: Product } | Product>(
        `${CATALOG}/products/${id}`,
        payload
    );
    return unwrap<Product>(data, "product");
}

export async function deleteProduct(id: Id): Promise<void> {
    await api.delete(`${CATALOG}/products/${id}`);
}

export type ListProductsParams = {
    tenantId?: string; // Admin only
    categoryId?: Id;
    status?: ProductStatus[]; // OR semantics; e.g., ["active","draft"]
    includeDeleted?: boolean; // Admin
    q?: string;
    page?: number; // default 1
    limit?: number; // default 20, max 100
    sortBy?: "name" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
};

export type ListProductsResponse = { items: ProductListItem[]; pageInfo: PageInfo };

export async function listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {
    const qs = new URLSearchParams();
    if (params.tenantId) qs.set("tenantId", params.tenantId);
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    params.status?.forEach((s) => qs.append("status", s));
    if (params.includeDeleted) qs.set("includeDeleted", "true");
    if (params.q?.trim()) qs.set("q", params.q.trim());
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.sortBy) qs.set("sortBy", params.sortBy);
    if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
    const url = qs.toString() ? `${CATALOG}/products?${qs.toString()}` : `${CATALOG}/products`;

    // Prefer the documented shape { items, pageInfo }, but tolerate a wrapper { products: { items, pageInfo } }
    const { data } = await api.get<ListProductsResponse | { products: ListProductsResponse }>(url);

    const maybeWrapped = data as { products?: ListProductsResponse };
    return maybeWrapped.products ?? (data as ListProductsResponse);
}

export async function getProduct(id: Id, opts?: { includeDeleted?: boolean }): Promise<Product> {
    const qs = new URLSearchParams();
    if (opts?.includeDeleted) qs.set("includeDeleted", "true");
    const url = qs.toString()
        ? `${CATALOG}/products/${id}?${qs.toString()}`
        : `${CATALOG}/products/${id}`;
    // Tolerate { product } or raw
    const { data } = await api.get<{ product: Product } | Product>(url);
    return unwrap<Product>(data, "product");
}

/** =========================
 *           MEDIA
 * ========================= */
export type PresignPayload = {
    purpose: "productImage";
    filename: string;
    contentType: "image/jpeg" | "image/png";
    tenantId?: string; // Admin must send; Manager ignored
    productId?: string;
};

export type PresignResponse = {
    upload: { url: string; fields: Record<string, string>; maxBytes: number };
    asset: { key: string; url: string };
};

export async function presignUpload(payload: PresignPayload): Promise<PresignResponse> {
    // Tolerate raw or { presign: {...} } (future-proof)
    const { data } = await api.post<PresignResponse | { presign: PresignResponse }>(
        `${CATALOG}/media/presign`,
        payload
    );
    const maybeWrapped = data as { presign?: PresignResponse };
    return maybeWrapped.presign ?? (data as PresignResponse);
}
