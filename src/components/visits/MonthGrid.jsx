import React from "react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MonthGrid({ days, selectedKey, today, onSelect }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 gap-px bg-border">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="bg-secondary px-1 py-1.5 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((day) => {
          const visits = day.items.visits;
          const pending = visits.filter((visit) => visit.overdue).length;
          const followUps = day.items.followUps.length;
          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.key)}
              className={cn(
                "min-h-[72px] p-1.5 text-left lg:min-h-[96px]",
                day.inMonth ? "bg-card" : "bg-secondary/50",
                selectedKey === day.key && "relative z-10 ring-1 ring-inset ring-primary"
              )}
            >
              {day.key === today ? (
                <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground">
                  {day.date.date()}
                </span>
              ) : (
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    day.inMonth ? "text-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {day.date.date()}
                </span>
              )}

              {visits.length > 0 && (
                <span className="mt-1.5 flex flex-wrap items-center gap-1">
                  {visits.slice(0, 4).map((visit) => (
                    <span
                      key={visit.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        visit.status === "completed"
                          ? "bg-success"
                          : visit.status === "cancelled"
                            ? "bg-muted-foreground"
                            : visit.overdue
                              ? "bg-destructive"
                              : "bg-primary"
                      )}
                    />
                  ))}
                  {visits.length > 4 && (
                    <span className="font-mono text-[9px] text-muted-foreground">
                      +{visits.length - 4}
                    </span>
                  )}
                </span>
              )}

              {followUps > 0 && (
                <span className="mt-1 block truncate text-[9px] text-muted-foreground">
                  {pending > 0 ? <span className="text-destructive">{pending} late · </span> : null}
                  {followUps} follow-up{followUps === 1 ? "" : "s"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}