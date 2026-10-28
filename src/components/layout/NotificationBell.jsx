import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { fromNow } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const DOT = {
  visit_request: "bg-accent-foreground",
  visit_approved: "bg-success",
  visit_declined: "bg-destructive",
};

export default function NotificationBell({
  items = [],
  unread = 0,
  loading,
  error,
  reload,
  markRead,
  markAllRead,
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const openItem = async (item) => {
    if (!item.is_read) await markRead(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reload?.();
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative rounded-md p-2 text-muted-foreground hover:text-primary"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex h-full w-[92vw] max-w-sm flex-col gap-0 border-l border-border bg-card p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-4 pr-10">
          <SheetTitle className="font-heading text-lg text-primary">Notifications</SheetTitle>
          <SheetDescription>Visit requests, approvals and decisions.</SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <span className="text-[11px] text-muted-foreground">
            {unread ? `${unread} unread` : "You are all caught up"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => reload?.()}>
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </Button>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => markAllRead?.()}>
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="ggm-scroll flex-1 overflow-y-auto">
          {error ? (
            <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
          ) : items.length ? (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left hover:bg-secondary/60",
                      !item.is_read && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        item.is_read ? "bg-border" : DOT[item.kind] || "bg-primary"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold">{item.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {fromNow(item.created_date)}
                        </span>
                      </span>
                      {item.body && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.body}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
