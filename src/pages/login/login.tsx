import { Flex, Checkbox, Input, Layout, Card, Space, Form, Button, Alert } from "antd";
import { Content } from "antd/es/layout/layout";
import { LockFilled, UserOutlined, LockOutlined } from "@ant-design/icons";
import Logo from "../../components/icons/Logo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/auth";
import { usePermission } from "../../hooks/usePermission";
import { useLocation, useNavigate } from "react-router-dom";
import { login, logout, self } from "../../http/services/authApi";
import type { Credentials, User } from "../../types";

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAllowed } = usePermission();
    const setUser = useAuthStore((s) => s.setUser);
    const logoutFromStore = useAuthStore((s) => s.logout);
    const queryClient = useQueryClient();

    const {
        mutateAsync: loginMutateAsync,
        isPending: isLoggingIn,
        isError: isLoginError,
        error: loginError,
    } = useMutation({
        mutationKey: ["login"],
        mutationFn: login,
    });

    const { mutateAsync: logoutMutateAsync } = useMutation({
        mutationKey: ["logout"],
        mutationFn: logout,
        onSuccess: () => logoutFromStore(),
    });

    const onFinish = async (values: { email: string; password: string }) => {
        const creds: Credentials = { email: values.email, password: values.password };

        try {
            await loginMutateAsync(creds);

            await queryClient.invalidateQueries({ queryKey: ["self"] });
            const user = await queryClient.fetchQuery<User>({
                queryKey: ["self"],
                queryFn: self,
            });

            if (!isAllowed(user)) {
                await logoutMutateAsync();
                return;
            }

            setUser(user);
            const from = (location.state as any)?.from?.pathname ?? "/";
            navigate(from, { replace: true });
        } catch {}
    };

    return (
        <>
            <Layout style={{ minHeight: "100vh" }}>
                <Content
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    <Space direction="vertical" align="center" size="large">
                        <Logo></Logo>
                        <Card
                            title={
                                <Space>
                                    <LockFilled />
                                    Sign in
                                </Space>
                            }
                            variant="borderless"
                            style={{ width: 300 }}
                            styles={{ title: { textAlign: "center" } }}
                        >
                            <Form
                                name="login-form"
                                initialValues={{ remember: true }}
                                onFinish={onFinish}
                            >
                                {isLoginError && (
                                    <Alert type="error" message={(loginError as Error).message} />
                                )}
                                <Form.Item
                                    name="email"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please enter your email",
                                        },
                                        {
                                            type: "email",
                                            message: "Email is not valid",
                                        },
                                    ]}
                                >
                                    <Input
                                        prefix={<UserOutlined />}
                                        type="text"
                                        placeholder="Email"
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="password"
                                    rules={[
                                        {
                                            required: true,
                                            message: "Please enter your password",
                                        },
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder="Password"
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Flex justify="space-between" align="center">
                                        <Form.Item name="remember" noStyle valuePropName="checked">
                                            <Checkbox>Remember me</Checkbox>
                                        </Form.Item>
                                        <a href="">Forgot password</a>
                                    </Flex>
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        block
                                        type="primary"
                                        htmlType="submit"
                                        loading={isLoggingIn}
                                    >
                                        Log in
                                    </Button>
                                </Form.Item>
                            </Form>
                        </Card>
                    </Space>
                </Content>
            </Layout>
        </>
    );
};

export default LoginPage;
