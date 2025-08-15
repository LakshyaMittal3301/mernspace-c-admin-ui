import { Flex, Checkbox, Input, Layout, Card, Space, Form, Button } from "antd";
import { Content } from "antd/es/layout/layout";
import { LockFilled, UserOutlined, LockOutlined } from "@ant-design/icons";
import Logo from "../../components/icons/Logo";

const LoginPage = () => {
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
                            <Form name="login-form" initialValues={{ remember: true }}>
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
                                    <Button block type="primary" htmlType="submit">
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
