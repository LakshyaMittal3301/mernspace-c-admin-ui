import Icon from "@ant-design/icons";
import Home from "../icons/Home";
import UserIcon from "../icons/UserIcon";
import FoodIcon from "../icons/FoodIcon";
import BasketIcon from "../icons/BasketIcon";
import GiftIcon from "../icons/GiftIcon";

export type MenuLink = { label: string; path: string; icon: React.ReactNode };

export const ALL_MENU_LINKS: MenuLink[] = [
    { label: "Home", path: "/", icon: <Icon component={Home} /> },
    { label: "Users", path: "/users", icon: <Icon component={UserIcon} /> },
    { label: "Restaurants", path: "/restaurants", icon: <Icon component={FoodIcon} /> },
    { label: "Products", path: "/products", icon: <Icon component={BasketIcon} /> },
    { label: "Promos", path: "/promos", icon: <Icon component={GiftIcon} /> },
];
