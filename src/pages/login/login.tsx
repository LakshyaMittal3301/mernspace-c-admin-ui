import { Flex, Checkbox, Input, Layout, Card, Space, Form, Button, Alert } from "antd";
import { Content } from "antd/es/layout/layout";
import { LockFilled, UserOutlined, LockOutlined } from "@ant-design/icons";
import Logo from "../../components/icons/Logo";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Credentials } from "../../types";
import { login, self } from "../../http/api";

const loginUser = async (credentials: Credentials) => {
    // Server call logic
    const { data } = await login(credentials);
    return data;
};

const getSelf = async () => {
    const data = await self();
    return data;
};

const LoginPage = () => {
    const { data: selfData, refetch } = useQuery({
        queryKey: ["self"],
        queryFn: getSelf,
        enabled: false,
    });

    const { mutate, isPending, isError, error } = useMutation({
        mutationKey: ["login"],
        mutationFn: loginUser,
        onSuccess: async () => {
            // getself
            await refetch();
            console.log("User Data", selfData);
            // store in the state
            console.log("Login Successful");
        },
    });

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
                                onFinish={(values) => {
                                    mutate({ email: values.email, password: values.password });
                                }}
                            >
                                {isError && <Alert type="error" message={error.message} />}
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
                                        loading={isPending}
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
