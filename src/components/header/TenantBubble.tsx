import { Tag, theme, Tooltip } from "antd";
import { CrownOutlined, EnvironmentOutlined } from "@ant-design/icons";

import { useAuthStore } from "../../stores/auth";

const TenantBubble = () => {
    const { token } = theme.useToken();
    const user = useAuthStore((s) => s.user);

    if (!user) return null;

    if (user.role === "admin") {
        return (
            <Tag
                icon={<CrownOutlined />}
                color={token.colorWarningTextActive}
                style={{ borderRadius: 999, fontWeight: 500 }}
            >
                Admin
            </Tag>
        );
    }

    if (user.role === "manager" && user.tenant && user.tenant.address) {
        const shortAddr = user.tenant.address.split(",")[0]; // just first line/city
        const fullAddr = user.tenant.address;

        const tag = (
            <Tag
                icon={<EnvironmentOutlined />}
                color={token.colorInfo}
                style={{
                    borderRadius: 999,
                    fontWeight: 500,
                    maxWidth: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                <span style={{ whiteSpace: "nowrap" }}>{shortAddr}</span>
            </Tag>
        );

        return <Tooltip title={fullAddr}>{tag}</Tooltip>;
    }
    return null;
};

export default TenantBubble;
