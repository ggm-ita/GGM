import React from "react";
import { eur, int, isActive } from "@/lib/retailers";

export default function FollowUpAnalysis({ retailers, lastContacts = {} }) {
  const contacted = retailers.filter((r) => lastContacts[r.id]).length;
  const never = retailers.length - contacted;
  const untouched = retailers.filter((r) => isActive(r) && !lastContacts[r.id]);

  const figures = [
    { label: "Contacted", value: int(contacted), tone: "text-success" },
    { label: "Never contacted", value: int(never), tone: "text-foreground" },
    { label: "Active, untouched", value: int(untouched.length), tone: "text-primary" },
  ];

  const top = untouched
    .slice()
    .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg text-primary">Follow-up activity</h2>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-secondary px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {f.label}
            </div>
            <div className={`font-mono text-base tabular-nums ${f.tone}`}>{f.value}</div>
          </div>
        ))}
      </div>

      {top.length ? (
        <>
          <h3 className="mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Active retailers with no contact yet
          </h3>
          <ul className="mt-1 divide-y divide-border">
            {top.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {r.name}
                  <span className="text-muted-foreground"> · {r.city}</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-primary">
                  {eur(r.balance)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Every active retailer in this selection has been contacted.
        </p>
      )}
    </section>
  );
}