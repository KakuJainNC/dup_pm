/**
 * Single source of truth for app navigation items.
 *
 * Add or remove an entry here and it will automatically appear in:
 *  - The side navigation bar
 *  - The per-role visibility config in the Roles permissions modal
 */
export const NAV_ITEMS = [
  { key: "home",          label: "Home",          href: "/"             },
  { key: "properties",   label: "Properties",    href: "/properties"   },
  { key: "team",         label: "Team",          href: "/team-members" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
  { key: "roles",        label: "Roles",         href: "/roles"        },
] as const;

export type NavItemKey = typeof NAV_ITEMS[number]["key"];
