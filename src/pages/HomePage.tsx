// src/pages/HomePage.tsx (structure only)
import { Col, Row, theme, Typography } from "antd";
import { FundTwoTone } from "@ant-design/icons";
import { SalesTrendCard, RecentOrdersCard } from "../components/home";
import StatOrdersCard from "../components/home/StatOrdersCard";
import StatSalesCard from "../components/home/StatSalesCard";

export default function HomePage() {
    const { token } = theme.useToken();
    return (
        <>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
                Good Morning 👋
            </Typography.Title>

            <Row gutter={[24, 24]} align="stretch">
                <Col span={12}>
                    <Row gutter={[24, 24]}>
                        <Col span={10}>
                            <StatOrdersCard />
                        </Col>
                        <Col span={14}>
                            <StatSalesCard />
                        </Col>
                        <Col span={24}>
                            <SalesTrendCard
                                title="Sales"
                                icon={
                                    <FundTwoTone
                                        twoToneColor={[token.colorWarning, "transparent"]}
                                    />
                                }
                                tone="warning"
                                defaultPeriod="M"
                                tooltip="View sales trend by day, month, or year"
                                minHeight={300}
                            />
                        </Col>
                    </Row>
                </Col>

                <Col span={12} style={{ display: "flex" }}>
                    <RecentOrdersCard />
                </Col>
            </Row>
        </>
    );
}
