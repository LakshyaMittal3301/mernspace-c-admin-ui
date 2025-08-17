import { Spin } from "antd";

export const PageLoader = () => (
    <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
        <Spin />
    </div>
);
