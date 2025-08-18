import { Avatar, Dropdown, theme, type MenuProps } from "antd";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useAuthStore } from "../stores/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "../http/api";

const initials = (name?: { firstName?: string; lastName?: string; email?: string }) => {
    const a = name?.firstName?.[0] ?? name?.email?.[0] ?? "U";
    const b = name?.lastName?.[0] ?? "";
    return (a + b).toUpperCase();
};

const UserMenu = () => {
    const user = useAuthStore((s) => s.user);
    const doLogoutLocal = useAuthStore((s) => s.logout);
    const queryClient = useQueryClient();
    const { token } = theme.useToken();

    const { mutateAsync: doLogout, isPending } = useMutation({
        mutationKey: ["logout"],
        mutationFn: logout,
        onSettled: () => {
            doLogoutLocal();
            queryClient.removeQueries({ queryKey: ["self"] });
        },
    });

    const items: MenuProps["items"] = [
        {
            key: "Header",
            label: user?.email || "User not found",
            disabled: true,
        },
        {
            type: "divider",
        },
        {
            key: "logout",
            label: "Logout",
            icon: <LogoutOutlined />,
            danger: true,
            disabled: isPending,
            onClick: async () => {
                try {
                    await doLogout();
                } catch {}
            },
        },
    ];

    const trigger = (
        <Avatar
            style={{
                cursor: "pointer",
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
            }}
            icon={!user ? <UserOutlined /> : undefined}
        >
            {user
                ? initials({
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                  })
                : null}
        </Avatar>
    );

    return (
        <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight" arrow>
            {trigger}
        </Dropdown>
    );
};

export default UserMenu;
