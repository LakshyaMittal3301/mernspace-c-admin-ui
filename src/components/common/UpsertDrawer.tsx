import { Drawer, Button, Space } from "antd";

type Props = {
    open: boolean;
    mode: "create" | "edit";
    titleCreate?: string;
    titleEdit?: string;
    onClose: () => void;
    onSubmit: () => Promise<void> | void;
    submitting?: boolean;
    width?: number;
    children: React.ReactNode; // put your form here
    // optional: extra buttons on the right side of header
    headerExtra?: React.ReactNode;
};

export default function UpsertDrawer({
    open,
    mode,
    titleCreate = "Create",
    titleEdit = "Edit",
    onClose,
    onSubmit,
    submitting,
    width = 420,
    children,
    headerExtra,
}: Props) {
    const title = mode === "create" ? titleCreate : titleEdit;

    return (
        <Drawer
            open={open}
            width={width}
            onClose={onClose}
            destroyOnClose
            title={title}
            styles={{ body: { paddingTop: 12 } }}
            extra={
                <Space>
                    {headerExtra}
                    <Button onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button type="primary" loading={submitting} onClick={onSubmit}>
                        {mode === "create" ? "Create" : "Update"}
                    </Button>
                </Space>
            }
        >
            {children}
        </Drawer>
    );
}
