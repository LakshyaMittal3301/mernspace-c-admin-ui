import { Modal } from "antd";

type Props = {
    open: boolean;
    title?: string;
    description?: React.ReactNode;
    okText?: string;
    cancelText?: string;
    confirming?: boolean;
    danger?: boolean;
    onCancel: () => void;
    onConfirm: () => Promise<void> | void;
};

export default function ConfirmModal({
    open,
    title = "Are you sure?",
    description,
    okText = "Confirm",
    cancelText = "Cancel",
    confirming,
    danger = false,
    onCancel,
    onConfirm,
}: Props) {
    return (
        <Modal
            open={open}
            title={title}
            onCancel={onCancel}
            okText={okText}
            cancelText={cancelText}
            okButtonProps={{ loading: confirming, danger }}
            onOk={onConfirm}
        >
            {description}
        </Modal>
    );
}
