import type { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";

/** A destination in the app's primary navigation. */
export interface NavDestination {
  href: Href;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Single source of truth for the app's destinations. Rendered by the NavMenu
 * FAB (native) and the TopNavbar menu button (web).
 */
export const NAV_ITEMS: NavDestination[] = [
  { href: "/", label: "Today", icon: "sunny-outline" },
  { href: "/upcoming", label: "Upcoming", icon: "calendar-outline" },
  { href: "/projects", label: "Projects", icon: "folder-outline" },
  { href: "/tags", label: "Tags", icon: "pricetag-outline" },
  { href: "/search", label: "Search", icon: "search-outline" },
];
