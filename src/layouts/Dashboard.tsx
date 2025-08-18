import { Navigate, NavLink, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../stores/auth";
import { Suspense, useState } from "react";
import { PageLoader } from "../ui/PageLoader";
import { Layout, Menu, theme, type MenuProps } from "antd";
import Sider from "antd/es/layout/Sider";

const { Content, Footer, Header } = Layout;

import Icon from "@ant-design/icons";
import Home from "../components/icons/Home";
import UserIcon from "../components/icons/UserIcon";
import FoodIcon from "../components/icons/FoodIcon";
import BasketIcon from "../components/icons/BasketIcon";
import GiftIcon from "../components/icons/GiftIcon";
import Logo from "../components/icons/Logo";

type MenuItem = Required<MenuProps>["items"][number];

const getItem = (title: string, route: string, icon: React.ReactNode): MenuItem => {
    return {
        label: <NavLink to={route}>{title}</NavLink>,
        key: route,
        icon,
    };
};

const items: MenuItem[] = [
    getItem("Home", "/", <Icon component={Home} />),
    getItem("Users", "/users", <Icon component={UserIcon} />),
    getItem("Restaurants", "/restaurants", <Icon component={FoodIcon} />),
    getItem("Products", "/products", <Icon component={BasketIcon} />),
    getItem("Promos", "/promos", <Icon component={GiftIcon} />),
];

const Dashboard = () => {
    const user = useAuthStore((s) => s.user);
    const hydrated = useAuthStore((s) => s.hydrated);
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const {
        token: { colorBgContainer },
    } = theme.useToken();

    if (!hydrated) return <PageLoader />;

    if (!user) return <Navigate to="/auth/login" replace state={{ from: location }} />;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Sider
                theme="light"
                collapsible
                collapsed={collapsed}
                onCollapse={(value) => setCollapsed(value)}
            >
                <div className="logo">
                    <Logo />
                </div>
                <Menu
                    theme="light"
                    selectedKeys={[location.pathname]}
                    mode="inline"
                    items={items}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: 0, background: colorBgContainer }} />
                <Content style={{ margin: "0 16px" }}>
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>{" "}
                </Content>
                <Footer style={{ textAlign: "center" }}>Made with ♥️ by Lakshya</Footer>
            </Layout>
        </Layout>
    );
};

export default Dashboard;
