import { useState } from "react";
import { App, Alert, Button, Card, Image, Upload } from "antd";
import type { UploadProps } from "antd";
import { presignUpload, updateProduct, type Product } from "../../http/services/catalogApi";

type Props = {
    product: Product;
    onUpdated: () => Promise<void>;
};

export default function ImageTab({ product, onUpdated }: Props) {
    const { message } = App.useApp();
    const [uploading, setUploading] = useState(false);

    const beforeUpload: UploadProps["beforeUpload"] = (file) => {
        const okType = file.type === "image/jpeg" || file.type === "image/png";
        if (!okType) {
            message.error("Only JPEG/PNG allowed");
            return Upload.LIST_IGNORE;
        }
        if (file.size > 5 * 1024 * 1024) {
            message.error("Max size is 5MB");
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const customRequest: UploadProps["customRequest"] = async (options) => {
        const { file, onError, onSuccess } = options as any;
        try {
            setUploading(true);

            // 1) Presign
            const presign = await presignUpload({
                purpose: "productImage",
                filename: (file as File).name,
                contentType: (file as File).type as "image/jpeg" | "image/png",
                // tenantId not needed here for Manager; Admin side is validated by server using product.tenantId on PATCH
                productId: product.id,
            });

            // 2) Upload to S3
            const form = new FormData();
            Object.entries(presign.upload.fields).forEach(([k, v]) => form.append(k, v as string));
            form.append("file", file as File);
            await fetch(presign.upload.url, { method: "POST", body: form });

            // 3) PATCH product with image.key
            await updateProduct(product.id, { image: { key: presign.asset.key } });
            message.success("Image uploaded");
            await onUpdated();
            onSuccess?.({});
        } catch (err: any) {
            message.error(err?.message || "Upload failed");
            onError?.(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card title="Image" bordered={false}>
            {product.image?.url ? (
                <Image src={product.image.url} width={200} />
            ) : (
                <Alert
                    type="info"
                    message="No image uploaded yet. Upload one below."
                    showIcon
                    style={{ marginBottom: 12 }}
                />
            )}

            <Upload
                accept="image/jpeg,image/png"
                showUploadList={false}
                beforeUpload={beforeUpload}
                customRequest={customRequest}
            >
                <Button type="primary" loading={uploading}>
                    Upload Image
                </Button>
            </Upload>
        </Card>
    );
}
