import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "../stores/auth";
import { Suspense, useState } from "react";
import { PageLoader } from "../ui/PageLoader";
import { Layout, theme, Space } from "antd";

const { Content, Footer, Header } = Layout;

import { ThemeToggle, UserMenu, TenantBubble } from "../components/header";
import AppBreadcrumbs from "../components/breadcrumbs/AppBreadcrumbs";
import AppSider from "../components/sidebar/AppSider";

const Dashboard = () => {
    const user = useAuthStore((s) => s.user);
    const hydrated = useAuthStore((s) => s.hydrated);
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const { token } = theme.useToken();

    if (!hydrated) return <PageLoader />;

    if (!user) return <Navigate to="/auth/login" replace state={{ from: location }} />;

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <AppSider collapsed={collapsed} onCollapse={setCollapsed} />

            <Layout>
                <Header
                    style={{
                        padding: "0 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: token.colorBgContainer,
                    }}
                >
                    <TenantBubble />
                    <Space size="middle" align="center">
                        <ThemeToggle />
                        <UserMenu />
                    </Space>
                </Header>
                <Content style={{ padding: "0 16px" }}>
                    <AppBreadcrumbs />
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </Content>
                <Footer style={{ textAlign: "center" }}>Made with ♥️ by Lakshya</Footer>
            </Layout>
        </Layout>
    );
};

export default Dashboard;
