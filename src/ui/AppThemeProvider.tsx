import { useEffect, useMemo, type PropsWithChildren } from "react";
import { useUiStore } from "../stores/ui";
import { ConfigProvider, theme as antdTheme } from "antd";
import { appTheme } from "./theme";

const AppThemeProvider = ({ children }: PropsWithChildren) => {
    const themeMode = useUiStore((s) => s.themeMode);

    const isDark = themeMode === "dark";

    const algorithms = useMemo(
        () => (isDark ? [antdTheme.darkAlgorithm] : [antdTheme.defaultAlgorithm]),
        [isDark]
    );

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    }, [isDark]);

    return (
        <ConfigProvider theme={{ ...appTheme, algorithm: algorithms }}>{children}</ConfigProvider>
    );
};

export default AppThemeProvider;
