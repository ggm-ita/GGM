import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const STATUS = {
  pending: { label: "Pending", className: "bg-accent text-accent-foreground" },
  scheduled: { label: "Scheduled", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

export default function StaffDaySchedule({ day }) {
  if (!day) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Pick a day in the calendar to see that staff member's visits.
      </section>
    );
  }

  const visits = day.items.visits;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <h2 className="font-heading text-base text-primary">{day.date.format("dddd D MMMM")}</h2>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {visits.length} visit{visits.length === 1 ? "" : "s"}
        </span>
      </header>

      {visits.length ? (
        <ul className="grid gap-1.5 p-3">
          {visits.map((visit) => {
            const status = STATUS[visit.status] || STATUS.scheduled;
            return (
              <li
                key={visit.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {visit.scheduled_time || "—"}
                </span>
                <Link
                  to={`/retailers/${visit.retailer_id}`}
                  className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                >
                  {visit.retailer_name}
                  <span className="text-muted-foreground"> · {visit.city}</span>
                </Link>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                    visit.overdue ? "bg-destructive/15 text-destructive" : status.className
                  )}
                >
                  {visit.overdue ? "Overdue" : status.label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          Nothing planned for this day.
        </p>
      )}
    </section>
  );
}