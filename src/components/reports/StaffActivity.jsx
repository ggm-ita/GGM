import React, { useMemo, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { staffRows } from "@/lib/activity";
import { fmtDay, int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const EXPORT_COLUMNS = [
  { key: "name", label: "Staff" },
  { key: "email", label: "Email" },
  { key: "planned", label: "Visits planned" },
  { key: "completed", label: "Visits completed" },
  { key: "overdue", label: "Visits overdue" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "call", label: "Calls" },
  { key: "email_count", label: "Emails" },
  { key: "note", label: "Notes" },
  { key: "touches", label: "Retailers touched" },
  { key: "lastActivity", label: "Last activity" },
];

export default function StaffActivity({ month, users, visits, interactions, loading }) {
  const [openKey, setOpenKey] = useState(null);

  const rows = useMemo(
    () => staffRows({ users, visits, interactions }),
    [users, visits, interactions]
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          planned: acc.planned + row.planned,
          completed: acc.completed + row.completed,
          overdue: acc.overdue + row.overdue,
          interactions: acc.interactions + row.interactions,
          touches: acc.touches + row.touches,
          active: acc.active + (row.activity > 0 ? 1 : 0),
        }),
        { planned: 0, completed: 0, overdue: 0, interactions: 0, touches: 0, active: 0 }
      ),
    [rows]
  );

  const withActivity = rows.some((row) => row.activity > 0);
  const cards = [
    { label: "Visits planned", value: totals.planned, tone: "text-primary" },
    { label: "Completed", value: totals.completed, tone: "text-success" },
    { label: "Overdue", value: totals.overdue, tone: "text-destructive" },
    { label: "Interactions", value: totals.interactions, tone: "text-foreground" },
    { label: "Retailers touched", value: totals.touches, tone: "text-foreground" },
    { label: "Staff active", value: totals.active, tone: "text-foreground" },
  ];

  const exportCsv = () => {
    const data = rows.map((row) => ({
      ...row,
      whatsapp: row.types.whatsapp,
      call: row.types.call,
      email_count: row.types.email,
      note: row.types.note,
      lastActivity: row.lastActivity ? fmtDay(row.lastActivity) : "",
    }));
    downloadCsv(`ggm-staff-activity-${month.format("YYYY-MM")}.csv`, toCsv(EXPORT_COLUMNS, data));
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
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
            Staff field activity · {month.format("MMMM YYYY")}
          </h2>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </header>

        {!withActivity && loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="ggm-scroll overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-normal">Staff</th>
                  <th className="px-2 py-2 text-right font-normal">Planned</th>
                  <th className="px-2 py-2 text-right font-normal">Done</th>
                  <th className="px-2 py-2 text-right font-normal">Overdue</th>
                  <th className="px-2 py-2 text-right font-normal">WhatsApp</th>
                  <th className="px-2 py-2 text-right font-normal">Calls</th>
                  <th className="px-2 py-2 text-right font-normal">Emails</th>
                  <th className="px-2 py-2 text-right font-normal">Notes</th>
                  <th className="px-2 py-2 text-right font-normal">Retailers</th>
                  <th className="px-4 py-2 text-right font-normal">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const open = openKey === row.key;
                  return (
                    <React.Fragment key={row.key}>
                      <tr
                        onClick={() => setOpenKey(open ? null : row.key)}
                        className={cn(
                          "cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/60",
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
                              <span className="block truncate">{row.name}</span>
                              <span className="block truncate text-[10px] text-muted-foreground">
                                {row.email || "not assigned"}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">{int(row.planned)}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-success">
                          {int(row.completed)}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2 text-right font-mono tabular-nums",
                            row.overdue > 0 && "text-destructive"
                          )}
                        >
                          {int(row.overdue)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(row.types.whatsapp)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(row.types.call)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(row.types.email)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">
                          {int(row.types.note)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums">{int(row.touches)}</td>
                        <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                          {row.lastActivity ? fmtDay(row.lastActivity) : "—"}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-border/60 bg-secondary/30">
                          <td colSpan={10} className="px-4 py-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div>
                                <h3 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                  Visits this month
                                </h3>
                                {row.visitList.length ? (
                                  <ul className="ggm-scroll mt-1.5 max-h-56 space-y-1 overflow-y-auto pr-1">
                                    {row.visitList
                                      .slice()
                                      .sort((a, b) => String(a.scheduled_date).localeCompare(String(b.scheduled_date)))
                                      .map((visit) => (
                                        <li key={visit.id} className="flex items-center gap-2 text-xs">
                                          <span className="w-24 shrink-0 font-mono text-muted-foreground">
                                            {visit.scheduled_date}
                                          </span>
                                          <span className="min-w-0 flex-1 truncate">
                                            {visit.retailer_name}
                                            <span className="text-muted-foreground"> · {visit.city}</span>
                                          </span>
                                          <span
                                            className={cn(
                                              "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase",
                                              visit.status === "completed"
                                                ? "bg-success/15 text-success"
                                                : visit.status === "cancelled"
                                                  ? "bg-secondary text-muted-foreground"
                                                  : "bg-primary/15 text-primary"
                                            )}
                                          >
                                            {visit.status}
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
                                  Interactions logged
                                </h3>
                                {row.interactionList.length ? (
                                  <ul className="ggm-scroll mt-1.5 max-h-56 space-y-1 overflow-y-auto pr-1">
                                    {row.interactionList.slice(0, 40).map((interaction) => (
                                      <li key={interaction.id} className="flex items-start gap-2 text-xs">
                                        <span className="w-24 shrink-0 font-mono text-muted-foreground">
                                          {interaction.occurred_at?.slice(0, 10) || "—"}
                                        </span>
                                        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary">
                                          {interaction.type}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                          {interaction.retailer_name}
                                          <span className="text-muted-foreground">
                                            {" "}
                                            · {interaction.summary}
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
                {!rows.length && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No staff members to report on yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}