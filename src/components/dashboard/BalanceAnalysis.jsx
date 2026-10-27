import React from "react";
import { balanceBands, eur, int, isActive } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function BalanceAnalysis({ retailers = [], className }) {
  const total = retailers.length;
  const withBalance = retailers.filter(isActive);
  const outstanding = withBalance.reduce((s, r) => s + (Number(r.balance) || 0), 0);
  const bands = balanceBands(retailers);
  const peak = bands.reduce((m, b) => Math.max(m, b.count), 0);

  const figures = [
    { label: "Outstanding", value: eur(outstanding), tone: "text-primary" },
    { label: "With a balance", value: int(withBalance.length), tone: "text-success" },
    {
      label: "Average balance",
      value: eur(withBalance.length ? outstanding / withBalance.length : 0),
      tone: "text-foreground",
    },
  ];

  return (
    <section className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-heading text-lg text-primary">Balance analysis</h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Outstanding balance distribution
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-secondary px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {f.label}
            </div>
            <div className={cn("font-mono text-base tabular-nums", f.tone)}>{f.value}</div>
          </div>
        ))}
      </div>

      {total ? (
        <div className="mt-3 grid gap-2">
          {bands.map((b) => (
            <div key={b.label} className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2">
              <span className="truncate text-xs" title={b.label}>
                {b.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-secondary">
                <i
                  className="block h-full bg-primary/85"
                  style={{ width: `${peak ? (b.count / peak) * 100 : 0}%` }}
                />
              </span>
              <span className="font-mono text-[11px] tabular-nums">
                {int(b.count)}
                <span className="ml-1 text-muted-foreground">
                  {((b.count / total) * 100).toFixed(0)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No retailers match these filters.</p>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        {int(withBalance.length)} of {int(total)} retailers carry a balance · {eur(outstanding)}{" "}
        outstanding
      </p>
    </section>
  );
}
