import { Switch, Tooltip } from "antd";
import { SunFilled, MoonFilled } from "@ant-design/icons";
import { useUiStore } from "../../stores/ui";

export default function ThemeToggle() {
    const mode = useUiStore((s) => s.themeMode);
    const setMode = useUiStore((s) => s.setThemeMode);
    const checked = mode === "dark";

    return (
        <Tooltip title={checked ? "Dark" : "Light"}>
            <Switch
                aria-label="Toggle dark mode"
                checked={checked}
                onChange={(val) => setMode(val ? "dark" : "light")}
                checkedChildren={<MoonFilled />}
                unCheckedChildren={<SunFilled />}
            />
        </Tooltip>
    );
}
