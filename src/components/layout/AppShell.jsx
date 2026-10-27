import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map as MapIcon,
  Store,
  CalendarCheck,
  ClipboardList,
  Database,
  Upload,
  Users,
  LogOut,
  Menu,
  AlertTriangle,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/AuthContext";
import { GGM_LOGO } from "@/lib/brand";
import { scopeLabel } from "@/lib/italy";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/retailers", label: "Retailers", icon: Store },
  { to: "/visits", label: "Visits", icon: CalendarCheck },
  { to: "/reports", label: "Reports", icon: ClipboardList, admin: true },
  { to: "/retailer-data", label: "Data", icon: Database, admin: true },
  { to: "/balance", label: "Balances", icon: Upload, admin: true },
  { to: "/staff", label: "Staff", icon: Users, admin: true },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary/15 text-primary font-semibold"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    );

  const brand = (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
      <img src={GGM_LOGO} alt="GGM" className="h-9 w-auto" />
      <div className="leading-tight min-w-0">
        <div className="font-heading text-lg text-primary">Retailer Hub</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Follow-up dashboard
        </div>
      </div>
    </div>
  );

  const account = (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold shrink-0">
          {initials || "GG"}
        </span>
        <div className="min-w-0">
          <div className="text-sm truncate">{name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{scopeLabel(user)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs text-muted-foreground hover:text-primary hover:border-primary/50"
      >
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-[100svh] bg-background">
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-60 border-r border-border bg-card z-30">
        {brand}
        <nav className="ggm-scroll flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {account}
      </aside>

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
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="flex h-full w-[82vw] max-w-[300px] flex-col gap-0 border-r border-border bg-card p-0"
        >
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          {brand}
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
          {account}
        </SheetContent>
      </Sheet>

      {needsScope && (
        <div className="flex items-start gap-2 bg-primary/10 px-4 py-2.5 text-xs text-primary border-b border-primary/30">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            No territory assigned to your account yet, so no retailers are visible. Ask an
            administrator to assign your regions or provinces.
          </span>
        </div>
      )}

      <main className="min-w-0 lg:pl-60">
        <Outlet />
      </main>
    </div>
  );
}