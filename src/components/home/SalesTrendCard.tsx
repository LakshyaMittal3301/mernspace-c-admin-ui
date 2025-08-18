import { Card, Segmented, Typography, Button, Skeleton, theme, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Period = "D" | "M" | "Y";
type Tone = "info" | "success" | "warning" | "error" | "primary";

type Props = {
    title?: string;
    minHeight?: number;
    icon?: ReactNode; // pass a TwoTone icon with twoToneColor={[primary, "transparent"]}
    tone?: Tone; // controls icon chip color only
    defaultPeriod?: Period; // default "M"
    tooltip?: ReactNode; // optional tooltip on title
};

export default function SalesTrendCard({
    title = "Sales",
    minHeight = 300,
    icon,
    tone = "info",
    defaultPeriod = "M",
    tooltip,
}: Props) {
    const { token } = theme.useToken();

    const toneColors = useMemo(
        () => ({
            info: { fg: token.colorInfo, bg: token.colorInfoBg },
            success: { fg: token.colorSuccess, bg: token.colorSuccessBg },
            warning: { fg: token.colorWarning, bg: token.colorWarningBg },
            error: { fg: token.colorError, bg: token.colorErrorBg },
            primary: { fg: token.colorPrimary, bg: token.colorPrimaryBg },
        }),
        [token]
    );
    const { fg, bg } = toneColors[tone];

    const [period, setPeriod] = useState<Period>(defaultPeriod);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // simulate loading when period changes
    useEffect(() => {
        setIsLoading(true);
        const t = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(t);
    }, [period]);

    const handleRefresh = () => {
        setIsLoading(true);
        const t = setTimeout(() => setIsLoading(false), 600);
        return () => clearTimeout(t);
    };

    return (
        <Card
            style={{ width: "100%", height: "100%", borderTop: `4px solid ${fg}` }}
            styles={{
                header: { padding: "16px 20px" }, // match StatCard header
                body: { padding: 16 }, // keep your current graph padding
            }}
            title={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {icon && (
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
                            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                        </span>
                    )}

                    <Tooltip title={tooltip}>
                        <Typography.Text strong style={{ fontSize: 18, lineHeight: 1.2 }}>
                            {title}
                        </Typography.Text>
                    </Tooltip>
                </div>
            }
            extra={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Segmented
                        options={["D", "M", "Y"]}
                        size="small"
                        value={period}
                        onChange={(v) => setPeriod(v as Period)}
                    />
                    <Button
                        type="text"
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={handleRefresh}
                        loading={isLoading}
                    ></Button>
                </div>
            }
        >
            {/* Mock chart area (theme-friendly) */}
            {isLoading ? (
                <Skeleton
                    active
                    title={false}
                    paragraph={{ rows: 6 }}
                    style={{ height: minHeight }}
                />
            ) : (
                <div
                    style={{
                        height: minHeight,
                        border: `1px dashed ${token.colorBorderSecondary}`,
                        borderRadius: 8,
                        background: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 12px,
              ${token.colorFillSecondary} 12px,
              ${token.colorFillSecondary} 13px
            )`,
                    }}
                />
            )}
        </Card>
    );
}
