import { Space } from "antd";

type Props = {
    children: React.ReactNode;
    size?: number;
};
export default function TableActions({ children, size = 8 }: Props) {
    return <Space size={size}>{children}</Space>;
}
