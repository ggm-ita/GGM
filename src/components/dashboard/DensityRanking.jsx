import React, { useState } from "react";
import { groupStats, int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: "province", label: "Provinces" },
  { key: "city", label: "Cities" },
];

export default function DensityRanking({ retailers }) {
  const [view, setView] = useState("province");

  const rows = groupStats(retailers, view).slice(0, 10);
  const top = rows.length ? rows[0].total : 0;
  const cities = new Set(retailers.map((r) => r.city).filter(Boolean)).size;
  const provinces = new Set(
    retailers.map((r) => r.province_code || r.province).filter(Boolean)
  ).size;
  const perCity = cities ? retailers.length / cities : 0;

  const figures = [
    { label: "Retailers", value: int(retailers.length) },
    { label: "Cities", value: int(cities) },
    { label: "Avg per city", value: perCity.toFixed(1) },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-lg text-primary">Retailer density</h2>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-border">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              aria-pressed={view === v.key}
              className={cn(
                "px-3 py-1.5 text-xs border-r border-border last:border-r-0 transition-colors",
                view === v.key
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-secondary px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {f.label}
            </div>
            <div className="font-mono text-base tabular-nums text-primary">{f.value}</div>
          </div>
        ))}
      </div>

      {rows.length ? (
        <div className="mt-3 grid gap-1.5">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-2">
              <span className="truncate text-xs" title={r.label}>
                {r.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-secondary">
                <i
                  className="block h-full bg-primary/85"
                  style={{ width: `${top ? (r.total / top) * 100 : 0}%` }}
                />
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {int(r.total)}
                <span className="ml-1 text-muted-foreground">{r.rate.toFixed(0)}% act.</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No retailers match these filters.</p>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        {int(retailers.length)} retailers across {int(provinces)} provinces and {int(cities)} cities ·
        average {perCity.toFixed(1)} per city
      </p>
    </section>
  );
}