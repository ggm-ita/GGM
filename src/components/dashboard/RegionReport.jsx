import React from "react";
import { eur, groupStats, int } from "@/lib/retailers";

export default function RegionReport({ retailers }) {
  const rows = groupStats(retailers, "region");

  if (!rows.length) {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-heading text-lg text-primary">Region report</h2>
        <p className="mt-3 text-sm text-muted-foreground">No retailers match these filters.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="font-heading text-lg text-primary">Region report</h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Territories · activation · balance
        </span>
      </header>

      <div className="ggm-scroll max-h-[460px] overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 text-left font-normal">Region</th>
              <th className="px-3 py-2 text-right font-normal">Retailers</th>
              <th className="px-3 py-2 text-right font-normal">Active</th>
              <th className="w-[190px] px-3 py-2 text-left font-normal">Activation</th>
              <th className="px-3 py-2 text-right font-normal">Cities</th>
              <th className="px-4 py-2 text-right font-normal">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{int(r.total)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-success">
                  {int(r.active)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-destructive/25">
                      <i className="block h-full bg-success" style={{ width: `${r.rate}%` }} />
                    </span>
                    <span className="w-12 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {r.rate.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                  {int(r.cities)}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-primary">
                  {eur(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}