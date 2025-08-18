import { Card, Statistic, Typography, Button, Skeleton, Tooltip, theme } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "warning" | "error" | "primary";

type Props = {
    title: string;
    icon: ReactNode; // pass an icon node; we place it inside a colored chip
    value: number | string;
    isLoading?: boolean;
    onRefresh?: () => void;
    tooltip?: ReactNode; // optional tooltip shown over the value
    minHeight?: number;
    tone?: Tone; // controls chip + top strip color
};

export default function StatCard({
    title,
    icon,
    value,
    isLoading = false,
    onRefresh,
    tooltip,
    minHeight = 160,
    tone = "info",
}: Props) {
    const { token } = theme.useToken();

    // map tone → semantic tokens (works in light & dark)
    const toneColors = {
        info: { fg: token.colorInfo, bg: token.colorInfoBg },
        success: { fg: token.colorSuccess, bg: token.colorSuccessBg },
        warning: { fg: token.colorWarning, bg: token.colorWarningBg },
        error: { fg: token.colorError, bg: token.colorErrorBg },
        primary: { fg: token.colorPrimary, bg: token.colorPrimaryBg },
    } as const;

    const { fg, bg } = toneColors[tone];

    return (
        <Card
            bordered
            // top colored strip for quick visual grouping
            style={{ borderTop: `4px solid ${fg}` }}
            // use new v5 API instead of deprecated bodyStyle/headStyle
            styles={{
                header: { padding: "16px 20px" },
                body: { padding: 20, minHeight },
            }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                        style={{
                            display: "inline-grid",
                            placeItems: "center",
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: bg,
                            color: fg,
                            flex: "0 0 36px",
                        }}
                    >
                        {/* make the icon large enough to match the title */}
                        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                    </span>

                    {/* title */}
                    <Typography.Text strong style={{ fontSize: 18, lineHeight: 1.2 }}>
                        {title}
                    </Typography.Text>
                </div>
            }
            extra={
                onRefresh ? (
                    <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={onRefresh}
                        loading={isLoading}
                    ></Button>
                ) : null
            }
        >
            {/* Value area (finance-style right aligned) */}
            <div style={{ textAlign: "right" }}>
                {isLoading ? (
                    <Skeleton
                        active
                        title={false}
                        paragraph={{ rows: 1, width: "40%" }}
                        style={{ marginLeft: "auto" }}
                    />
                ) : (
                    <Tooltip title={tooltip}>
                        <Statistic
                            value={value}
                            valueStyle={{
                                fontSize: 32, // bigger than before
                                fontWeight: 700,
                                color: token.colorTextHeading,
                            }}
                        />
                    </Tooltip>
                )}
            </div>
        </Card>
    );
}
