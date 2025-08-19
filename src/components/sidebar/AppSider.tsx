import { Layout, Menu, theme } from "antd";
import type { MenuProps } from "antd";
import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";
import { ALL_MENU_LINKS } from "./menuConfig";
import { rolesFor } from "../../routes/access";
import Logo from "../../components/icons/Logo";

const { Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

const toMenuItem = (label: string, route: string, icon: React.ReactNode): MenuItem => ({
    key: route,
    icon,
    label: <NavLink to={route}>{label}</NavLink>,
});

export default function AppSider({
    collapsed,
    onCollapse,
}: {
    collapsed: boolean;
    onCollapse: (c: boolean) => void;
}) {
    const { token } = theme.useToken();
    const location = useLocation();
    const user = useAuthStore((s) => s.user);

    const visibleLinks = ALL_MENU_LINKS.filter((l) => {
        const roles = rolesFor(l.path);
        if (roles === "any") return true;
        return !!user && roles?.includes(user.role);
    });

    const items: MenuItem[] = visibleLinks.map((l) => toMenuItem(l.label, l.path, l.icon));

    const firstSeg = "/" + (location.pathname.split("/")[1] ?? "");
    const selected =
        visibleLinks.find((l) => l.path === firstSeg)?.path ??
        (visibleLinks.some((l) => l.path === location.pathname) ? location.pathname : firstSeg);

    return (
        <Sider
            theme="light"
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            style={{ background: token.colorBgContainer }}
        >
            <div className="logo">
                <Logo />
            </div>
            <Menu theme="light" mode="inline" selectedKeys={[selected]} items={items} />
        </Sider>
    );
}
