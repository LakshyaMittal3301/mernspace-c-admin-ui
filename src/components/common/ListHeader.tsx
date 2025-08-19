import { Form, Input, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";

type Props = {
    q?: string;
    onChangeQ?: (v: string) => void;

    // Trigger for server-side filtering (you’ll wire later)
    onSearchClick?: () => void;

    // Right side actions
    onRefresh?: () => void;
    refreshLoading?: boolean;
    primaryText?: string;
    onPrimary?: () => void;

    // extra right-side content if needed
    rightExtra?: React.ReactNode;

    width?: number; // search width
};

export default function ListHeader({
    q,
    onChangeQ,
    onSearchClick,
    onRefresh,
    refreshLoading,
    primaryText = "Create",
    onPrimary,
    rightExtra,
    width = 280,
}: Props) {
    return (
        <div
            style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
            }}
        >
            {/* LEFT: search + search button */}
            <Form layout="inline" onSubmitCapture={(e) => e.preventDefault()}>
                <Form.Item>
                    <Input
                        allowClear
                        placeholder="Search…"
                        prefix={<SearchOutlined />}
                        value={q}
                        onChange={(e) => onChangeQ?.(e.target.value)}
                        style={{ width }}
                    />
                </Form.Item>

                <Form.Item>
                    <Button icon={<SearchOutlined />} onClick={onSearchClick}>
                        Search
                    </Button>
                </Form.Item>
            </Form>

            {/* RIGHT: refresh + create + optional extra */}
            <Space>
                {rightExtra}
                {onRefresh && (
                    <Button onClick={onRefresh} loading={refreshLoading} icon={<ReloadOutlined />}>
                        Refresh
                    </Button>
                )}
                {onPrimary && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={onPrimary}>
                        {primaryText}
                    </Button>
                )}
            </Space>
        </div>
    );
}
