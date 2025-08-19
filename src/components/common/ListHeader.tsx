import { Form, Input, Button, Space } from "antd";
import { SearchOutlined, ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { CSSProperties, ReactNode } from "react";

type SlotProps = {
    /** Fully custom left content (typically a Form with filters). */
    left?: ReactNode;
    /** Fully custom right content (typically action buttons). */
    right?: ReactNode;
    /** Layout options */
    justify?: CSSProperties["justifyContent"]; // default: space-between
    gap?: number; // default: 12
    wrap?: boolean; // default: false
    style?: CSSProperties;
};

/**
 * Back-compat props (OPTIONAL). If you pass these, ListHeader will render
 * a default search form on the left and a Refresh/Create block on the right.
 * You can ignore these and use the `left` & `right` slots instead.
 */
type LegacyProps = {
    q?: string;
    onChangeQ?: (v: string) => void;
    onSearchClick?: () => void;

    onRefresh?: () => void;
    refreshLoading?: boolean;

    primaryText?: string;
    onPrimary?: () => void;

    /** Width of the search input when using legacy API. */
    width?: number;

    /** Extra right-side content in legacy mode, rendered before Refresh/Create. */
    rightExtra?: ReactNode;
};

type Props = SlotProps & LegacyProps;

export default function ListHeader({
    // slot API
    left,
    right,
    justify = "space-between",
    gap = 12,
    wrap = false,
    style,

    // legacy API
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
    const isLegacy = left == null && right == null;

    return (
        <div
            style={{
                display: "flex",
                gap,
                alignItems: "center",
                justifyContent: justify,
                flexWrap: wrap ? "wrap" : "nowrap",
                width: "100%",
                ...style,
            }}
        >
            {isLegacy ? (
                <>
                    {/* LEFT (legacy): search + search button */}
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

                    {/* RIGHT (legacy): refresh + create + optional extra */}
                    <Space>
                        {rightExtra}
                        {onRefresh && (
                            <Button
                                onClick={onRefresh}
                                loading={refreshLoading}
                                icon={<ReloadOutlined />}
                            >
                                Refresh
                            </Button>
                        )}
                        {onPrimary && (
                            <Button type="primary" icon={<PlusOutlined />} onClick={onPrimary}>
                                {primaryText}
                            </Button>
                        )}
                    </Space>
                </>
            ) : (
                <>
                    {/* LEFT slot */}
                    <div style={{ display: "flex", alignItems: "center", gap }}>{left}</div>

                    {/* RIGHT slot */}
                    <div style={{ display: "flex", alignItems: "center", gap }}>{right}</div>
                </>
            )}
        </div>
    );
}
