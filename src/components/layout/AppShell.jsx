import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  Store,
  CalendarCheck,
  ClipboardList,
  Database,
  Users,
  LogOut,
  Menu,
  PanelLeft,
  AlertTriangle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import NotificationBell from "@/components/layout/NotificationBell";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/notifications";
import { GGM_LOGO } from "@/lib/brand";
import { scopeLabel } from "@/lib/italy";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/retailers", label: "Retailers", icon: Store },
  { to: "/visits", label: "Visits", icon: CalendarCheck },
  { to: "/reports", label: "Reports", icon: ClipboardList, admin: true },
  { to: "/retailer-data", label: "Data Management", icon: Database, admin: true },
  { to: "/staff", label: "Staff", icon: Users, admin: true },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("ggm.sidebar") === "collapsed"
  );
  const notifications = useNotifications(user);
  const isAdmin = user?.role === "admin";
  const items = NAV.filter((item) => !item.admin || isAdmin);
  const name = user?.full_name || user?.email || "Staff";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  const needsScope = user && !isAdmin && !user.scope_type;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem("ggm.sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary/15 text-primary font-semibold"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  const bell = <NotificationBell {...notifications} />;

  const brandMark = (compact) => (
    <div className="flex items-center gap-3 border-b border-border px-4 py-4">
      <img src={GGM_LOGO} alt="GGM" className="h-9 w-auto shrink-0" />
      {!compact && (
        <div className="leading-tight min-w-0">
          <div className="font-heading text-lg text-primary">Retailer Hub</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Follow-up dashboard
          </div>
        </div>
      )}
    </div>
  );

  const accountMark = (compact) => (
    <div className="border-t border-border p-3">
      <div className={cn("flex items-center gap-2.5", compact && "justify-center")}>
        <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold shrink-0">
          {initials || "GG"}
        </span>
        {!compact && (
          <div className="min-w-0">
            <div className="text-sm truncate">{name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{scopeLabel(user)}</div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => logout()}
        title="Sign out"
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <LogOut className="w-3.5 h-3.5" />
        {!compact && "Sign out"}
      </button>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-background">
      {/* Desktop sidebar — collapses to an icon rail. */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 border-r border-border bg-card transition-[width] duration-200",
          collapsed ? "lg:w-16" : "lg:w-60"
        )}
      >
        {brandMark(collapsed)}
        <nav className="ggm-scroll flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={(state) => cn(linkClass(state), collapsed && "justify-center gap-0")}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>
        {accountMark(collapsed)}
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-2 border-b border-border bg-card">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-md text-muted-foreground hover:text-primary"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src={GGM_LOGO} alt="GGM" className="h-7 w-auto" />
        <span className="font-heading text-base text-primary">Retailer Hub</span>
        <div className="ml-auto shrink-0">{bell}</div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-[82vw] max-w-[300px] flex-col gap-0 border-r border-border bg-card p-0"
        >
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          {brandMark(false)}
          <nav className="ggm-scroll flex-1 space-y-1 overflow-y-auto p-3">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={linkClass}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          {accountMark(false)}
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Desktop top bar: sidebar toggle on the left, notifications on the right. */}
        <header className="hidden lg:flex sticky top-0 z-20 h-14 items-center gap-2 border-b border-border bg-card px-3">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-2 text-muted-foreground hover:text-primary"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="ml-auto shrink-0">{bell}</div>
        </header>

        {needsScope && (
          <div className="flex items-start gap-2 bg-primary/10 px-4 py-2.5 text-xs text-primary border-b border-primary/30">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              No territory assigned to your account yet, so no retailers are visible. Ask an
              administrator to assign your regions or provinces.
            </span>
          </div>
        )}

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}