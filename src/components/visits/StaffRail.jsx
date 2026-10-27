import React from "react";
import { cn } from "@/lib/utils";

export default function StaffRail({ rows, counts = {}, activeKey, onSelect }) {
  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-card xl:self-start">
      <header className="border-b border-border px-3 py-2">
        <h2 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Staff · {rows.length}
        </h2>
      </header>

      {rows.length ? (
        <ul className="ggm-scroll max-h-56 overflow-y-auto xl:max-h-[calc(100svh-11rem)]">
          {rows.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onSelect(row.key)}
                aria-pressed={row.key === activeKey}
                className={cn(
                  "flex w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left text-sm last:border-0",
                  row.key === activeKey
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums opacity-70">
                  {counts[row.key] || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-4 text-xs text-muted-foreground">No staff accounts yet.</p>
      )}
    </aside>
  );
}