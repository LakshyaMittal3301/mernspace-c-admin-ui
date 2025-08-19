import { Breadcrumb, Divider, theme } from "antd";
import { Link, useLocation } from "react-router-dom";
import type { ItemType } from "antd/es/breadcrumb/Breadcrumb";
import { BREADCRUMBS } from "./registry";
import { truncate } from "./helper";

/** normalize /a/ -> /a */
function normalize(path: string) {
    if (path === "/") return "/";
    return path.endsWith("/") ? path.slice(0, -1) : path;
}

export default function AppBreadcrumbs() {
    const { token } = theme.useToken();
    const { pathname } = useLocation();
    const key = normalize(pathname);

    if (key === "/" || !BREADCRUMBS[key]) return null;

    // styling
    const containerStyle: React.CSSProperties = {
        // medium padding, subtle background
        padding: "12px 16px 8px",
        background: token.colorBgContainer,
        borderRadius: 8,
        // give it some breathing room from the sider/content edges
        marginTop: "12px",
    };

    const linkStyle: React.CSSProperties = {
        color: token.colorTextSecondary,
        textDecoration: "none",
    };
    const linkHoverStyle: React.CSSProperties = {
        color: token.colorPrimary,
    };

    // softer, lighter separator (no custom SVG)
    const separator = (
        <span aria-hidden style={{ color: token.colorTextQuaternary, userSelect: "none" }}>
            ›
        </span>
    );

    // Convert registry items → AntD items with our styling rules
    const rawItems = BREADCRUMBS[key];
    const items: ItemType[] = rawItems.map((it, idx) => {
        const isLast = idx === rawItems.length - 1;

        // Pull title as string if it is, or let JSX pass through
        const titleText =
            typeof it.title === "string" ? truncate(it.title as string, 28) : it.title;

        // For non-last: wrap in <Link> for consistent styling
        if (!isLast) {
            const to =
                // prefer href mapping (your registry uses href)
                (it as any).href ??
                // if someone placed a raw Link inside, just use it as-is
                undefined;

            return {
                ...it,
                title: to ? (
                    <Link
                        to={to}
                        style={linkStyle}
                        onMouseEnter={(e) =>
                            Object.assign((e.target as HTMLElement).style, linkHoverStyle)
                        }
                        onMouseLeave={(e) =>
                            Object.assign((e.target as HTMLElement).style, linkStyle)
                        }
                    >
                        {titleText}
                    </Link>
                ) : (
                    <span style={{ color: token.colorTextSecondary }}>{titleText}</span>
                ),
                // ensure AntD doesn't also render its own anchor via href
                href: undefined,
            };
        }

        // Last item: bold + primary text (Title Case already from your registry)
        return {
            ...it,
            title: <span style={{ color: token.colorPrimary, fontWeight: 700 }}>{titleText}</span>,
            href: undefined,
        };
    });

    return (
        <div style={containerStyle}>
            <Breadcrumb items={items} separator={separator} style={{ margin: 0 }} />
            <Divider style={{ margin: "8px 0 0", background: token.colorSplit }} />
        </div>
    );
}
