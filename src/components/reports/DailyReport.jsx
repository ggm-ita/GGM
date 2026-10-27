import React, { useMemo, useState } from "react";
import moment from "moment";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "weekday", label: "Day" },
  { key: "planned", label: "Visits planned" },
  { key: "completed", label: "Completed" },
  { key: "missed", label: "Open / overdue" },
  { key: "cancelled", label: "Cancelled" },
  { key: "interactions", label: "Interactions" },
  { key: "staff_count", label: "Staff involved" },
  { key: "staff", label: "Staff names" },
];

const staffOf = (visit) => visit.assigned_to_name || visit.assigned_to || "Unassigned";
const staffOfLog = (log) => log.staff_name || log.staff_email || "Unassigned";

export default function DailyReport({ month, visits = [], interactions = [], loading }) {
  const [openKey, setOpenKey] = useState(null);
  const today = moment().format("YYYY-MM-DD");

  const days = useMemo(() => {
    const start = month.clone().startOf("month");
    const byDay = new Map();
    for (let i = 1; i <= month.daysInMonth(); i += 1) {
      const date = start.clone().date(i);
      byDay.set(date.format("YYYY-MM-DD"), {
        key: date.format("YYYY-MM-DD"),
        date,
        planned: 0,
        completed: 0,
        cancelled: 0,
        missed: 0,
        interactions: 0,
        staff: new Set(),
        visits: [],
        logs: [],
      });
    }

    visits.forEach((visit) => {
      const day = byDay.get(visit.scheduled_date);
      if (!day) return;
      day.planned += 1;
      if (visit.status === "completed") day.completed += 1;
      else if (visit.status === "cancelled") day.cancelled += 1;
      else if (visit.scheduled_date < today) day.missed += 1;
      day.staff.add(staffOf(visit));
      day.visits.push(visit);
    });

    interactions.forEach((log) => {
      const day = byDay.get(String(log.occurred_at || "").slice(0, 10));
      if (!day) return;
      day.interactions += 1;
      day.staff.add(staffOfLog(log));
      day.logs.push(log);
    });

    return [...byDay.values()]
      .filter((day) => day.planned || day.interactions)
      .map((day) => ({ ...day, staffCount: day.staff.size, staffNames: [...day.staff] }));
  }, [month, visits, interactions, today]);

  const totals = useMemo(
    () =>
      days.reduce(
        (acc, day) => ({
          planned: acc.planned + day.planned,
          completed: acc.completed + day.completed,
          missed: acc.missed + day.missed,
          cancelled: acc.cancelled + day.cancelled,
          interactions: acc.interactions + day.interactions,
        }),
        { planned: 0, completed: 0, missed: 0, cancelled: 0, interactions: 0 }
      ),
    [days]
  );

  const exportCsv = () => {
    const rows = days.map((day) => ({
      date: day.key,
      weekday: day.date.format("dddd"),
      planned: day.planned,
      completed: day.completed,
      missed: day.missed,
      cancelled: day.cancelled,
      interactions: day.interactions,
      staff_count: day.staffCount,
      staff: day.staffNames.join(" | "),
    }));
    downloadCsv(`ggm-daily-${month.format("YYYY-MM")}.csv`, toCsv(COLUMNS, rows));
  };

  const cards = [
    { label: "Days with activity", value: days.length, tone: "text-foreground" },
    { label: "Visits planned", value: totals.planned, tone: "text-primary" },
    { label: "Completed", value: totals.completed, tone: "text-success" },
    { label: "Overdue", value: totals.missed, tone: "text-destructive" },
    { label: "Interactions", value: totals.interactions, tone: "text-foreground" },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {card.label}
            </div>
            <div className={cn("mt-1 font-mono text-lg tabular-nums", card.tone)}>
              {int(card.value)}
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="font-heading text-lg text-primary">
            Day by day · {month.format("MMMM YYYY")}
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={exportCsv}
            disabled={!days.length}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </header>

        {!days.length ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {loading
              ? "Loading the month…"
              : `No visits or interactions recorded in ${month.format("MMMM YYYY")}.`}
          </p>
        ) : (
          <div className="ggm-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-normal">Day</th>
                  <th className="px-2 py-2 text-right font-normal">Planned</th>
                  <th className="px-2 py-2 text-right font-normal">Done</th>
                  <th className="px-2 py-2 text-right font-normal">Overdue</th>
                  <th className="px-2 py-2 text-right font-normal">Cancelled</th>
                  <th className="px-2 py-2 text-right font-normal">Interactions</th>
                  <th className="px-4 py-2 text-right font-normal">Staff</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => {
                  const open = openKey === day.key;
                  return (
                    <React.Fragment key={day.key}>
                      <tr
                        onClick={() => setOpenKey(open ? null : day.key)}
                        className={cn(
                          "cursor-pointer border-b border-border/60 hover:bg-secondary/60",
                          open && "bg-secondary/60"
                        )}
                      >
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-1.5">
                            <ChevronDown
                              className={cn(
                                "w-3.5 h-3.5 shrink-0 text-muted-foreground transition-transform",
                                open && "rotate-180"
                              )}
                            />
                            <span className="min-w-0">
                              <span
                                className={cn(
                                  "block truncate",
                                  day.key === today && "font-semibold text-primary"
                                )}
                              >
                                {day.date.format("ddd D MMM")}
                              </span>
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {day.staffNames.slice(0, 2).join(", ") || "No visits"}
                                {day.staffNames.length > 2 ? ` +${day.staffNames.length - 2}` : ""}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(day.planned)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-success">
                          {int(day.completed)}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-mono tabular-nums",
                            day.missed > 0 && "text-destructive"
                          )}
                        >
                          {int(day.missed)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
                          {int(day.cancelled)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(day.interactions)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {int(day.staffCount)}
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-border/60 bg-secondary/30">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div>
                                <h3 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Visits
                                </h3>
                                {day.visits.length ? (
                                  <ul className="ggm-scroll mt-1.5 max-h-56 space-y-1 overflow-y-auto pr-1">
                                    {day.visits
                                      .slice()
                                      .sort((a, b) =>
                                        String(a.scheduled_time || "").localeCompare(
                                          String(b.scheduled_time || "")
                                        )
                                      )
                                      .map((visit) => (
                                        <li key={visit.id} className="flex items-center gap-2 text-xs">
                                          <span className="w-10 shrink-0 font-mono text-muted-foreground">
                                            {visit.scheduled_time || "—"}
                                          </span>
                                          <span className="min-w-0 flex-1 truncate">
                                            {visit.retailer_name}
                                            <span className="text-muted-foreground">
                                              {" "}
                                              · {staffOf(visit)}
                                            </span>
                                          </span>
                                          <span
                                            className={cn(
                                              "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase",
                                              visit.status === "completed"
                                                ? "bg-success/15 text-success"
                                                : visit.status === "cancelled"
                                                  ? "bg-secondary text-muted-foreground"
                                                  : visit.scheduled_date < today
                                                    ? "bg-destructive/15 text-destructive"
                                                    : "bg-primary/15 text-primary"
                                            )}
                                          >
                                            {visit.status === "scheduled" && visit.scheduled_date < today
                                              ? "overdue"
                                              : visit.status}
                                          </span>
                                        </li>
                                      ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1.5 text-xs text-muted-foreground">No visits.</p>
                                )}
                              </div>

                              <div>
                                <h3 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Interactions
                                </h3>
                                {day.logs.length ? (
                                  <ul className="ggm-scroll mt-1.5 max-h-56 space-y-1 overflow-y-auto pr-1">
                                    {day.logs.slice(0, 40).map((log) => (
                                      <li key={log.id} className="flex items-start gap-2 text-xs">
                                        <span className="w-24 shrink-0 truncate text-muted-foreground">
                                          {staffOfLog(log)}
                                        </span>
                                        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary">
                                          {log.type}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                          {log.retailer_name}
                                          <span className="text-muted-foreground">
                                            {" "}
                                            · {log.summary}
                                          </span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-1.5 text-xs text-muted-foreground">
                                    No interactions.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}