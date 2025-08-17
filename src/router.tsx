import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./layouts/Dashboard";
import Auth from "./layouts/Auth";
import Root from "./layouts/Root";

import { dashboardChildren } from "./routes/dashboard.routes";
import { authChildren } from "./routes/auth.routes";

const NotFound = () => <div>404 - Not Found</div>;
const ErrorBoundary = () => <div>Something went wrong</div>;

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        errorElement: <ErrorBoundary />,
        children: [
            {
                element: <Dashboard />,
                children: dashboardChildren,
            },
            {
                path: "auth",
                element: <Auth />,
                children: authChildren,
            },
            {
                path: "*",
                element: <NotFound />,
            },
        ],
    },
]);
