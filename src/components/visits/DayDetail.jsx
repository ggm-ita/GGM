import React from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, MessageCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eur, isActive, telLink, waLink } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const STATUS = {
  scheduled: { label: "Scheduled", className: "bg-primary/15 text-primary" },
  completed: { label: "Completed", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

function QuickLinks({ retailer }) {
  if (!retailer?.mobile) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <a
        href={waLink(retailer.mobile, `Ciao ${retailer.name}`)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="rounded p-1 text-muted-foreground hover:text-success"
      >
        <MessageCircle className="w-3.5 h-3.5" />
      </a>
      <a
        href={telLink(retailer.mobile)}
        aria-label="Call"
        className="rounded p-1 text-muted-foreground hover:text-primary"
      >
        <PhoneCall className="w-3.5 h-3.5" />
      </a>
    </span>
  );
}

export default function DayDetail({ day, retailersById, onPlanDay }) {
  if (!day) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Pick a day in the calendar to see its visits and follow-ups.
      </section>
    );
  }

  const visits = day.items.visits;
  const followUps = day.items.followUps;

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg text-primary">{day.date.format("dddd D MMMM")}</h2>
          <p className="text-[11px] text-muted-foreground">
            {visits.length} visit{visits.length === 1 ? "" : "s"} · {followUps.length} follow-up
            {followUps.length === 1 ? "" : "s"} due
          </p>
        </div>
        {onPlanDay && (
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={() => onPlanDay(day.key)}>
            <CalendarPlus className="w-3.5 h-3.5" /> Plan
          </Button>
        )}
      </header>

      <div className="grid gap-4 p-4">
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Visits</h3>
          {visits.length ? (
            <ul className="mt-1.5 grid gap-1.5">
              {visits.map((visit) => {
                const retailer = retailersById?.get(visit.retailer_id);
                const status = STATUS[visit.status] || STATUS.scheduled;
                return (
                  <li
                    key={visit.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2",
                      visit.overdue ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary/40"
                    )}
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
                    <QuickLinks retailer={retailer} />
                    <span className="w-full truncate text-[10px] text-muted-foreground">
                      {visit.assigned_to_name || visit.assigned_to || "Unassigned"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">No visits planned for this day.</p>
          )}
        </div>

        <div>
          <h3 className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Follow-ups due
          </h3>
          {followUps.length ? (
            <ul className="mt-1.5 grid gap-1.5">
              {followUps.map(({ retailer, info }) => (
                <li
                  key={retailer.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"
                >
                  <span className={cn("dot shrink-0", isActive(retailer) ? "g" : "r")} />
                  <Link
                    to={`/retailers/${retailer.id}`}
                    className="min-w-0 flex-1 truncate text-sm hover:text-primary"
                  >
                    {retailer.name}
                    <span className="text-muted-foreground"> · {retailer.city}</span>
                  </Link>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">
                    {eur(retailer.balance)}
                  </span>
                  <QuickLinks retailer={retailer} />
                  <span className="w-full text-[10px] text-muted-foreground">
                    {info.last ? `Last contact ${info.last.fromNow()}` : "Never contacted"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">No follow-ups due.</p>
          )}
        </div>
      </div>
    </section>
  );
}