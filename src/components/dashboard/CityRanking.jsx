import React from "react";
import { cn } from "@/lib/utils";

export default function CityRanking({
  cities,
  activeCity,
  onCity,
  className = "",
  plain = false,
}) {
  const top = cities.slice(0, 8);
  if (!top.length) return null;

  return (
    <div
      className={cn("p-3 lg:p-4", !plain && "border-b border-border", className)}
    >
      <h2 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Top cities · active share
      </h2>
      <div className="grid gap-1.5">
        {top.map((c) => (
          <button
            key={c.city}
            type="button"
            onClick={() => onCity(activeCity === c.city ? "" : c.city)}
            title={`${c.active} active of ${c.total}`}
            className="grid grid-cols-[88px_1fr_34px] items-center gap-2 text-left"
          >
            <span
              className={cn(
                "truncate text-xs",
                activeCity === c.city ? "text-primary font-semibold" : "text-foreground"
              )}
            >
              {c.city}
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-destructive">
              <i
                className="block h-full bg-success"
                style={{ width: `${(c.active / c.total) * 100}%` }}
              />
            </span>
            <span className="text-right font-mono text-[11px] text-muted-foreground">
              {c.total}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}