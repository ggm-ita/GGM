import React from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { AlertTriangle, MessageCircle, PhoneCall } from "lucide-react";
import { telLink, waLink } from "@/lib/retailers";
import { cn } from "@/lib/utils";

/* Overdue visits and late follow-ups, oldest first. */
export default function PendingList({ items = [], limit = 6 }) {
  if (!items.length) return null;
  const shown = items.slice(0, limit);

  return (
    <section className="rounded-xl border border-destructive/40 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <h2 className="font-heading text-lg text-destructive">Needs attention now</h2>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {items.length} pending
        </span>
      </div>

      <ul className="mt-2 grid gap-1.5">
        {shown.map((entry, index) => {
          const retailer = entry.kind === "followup" ? entry.item.retailer : null;
          const visit = entry.kind === "visit" ? entry.item : null;
          const late = moment().startOf("day").diff(moment(entry.key), "days");
          return (
            <li
              key={`${entry.kind}-${entry.key}-${index}`}
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-secondary/50 px-3 py-2"
            >
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                  entry.kind === "visit" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                )}
              >
                {entry.kind === "visit" ? "Visit" : "Follow-up"}
              </span>
              <Link
                to={`/retailers/${retailer?.id || visit?.retailer_id}`}
                className="min-w-0 flex-1 truncate text-sm hover:text-primary"
              >
                {retailer?.name || visit?.retailer_name}
                <span className="text-muted-foreground"> · {retailer?.city || visit?.city || "—"}</span>
              </Link>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {late > 0 ? `${late}d late` : "today"}
              </span>
              {retailer?.mobile && (
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
              )}
            </li>
          );
        })}
      </ul>

      {items.length > shown.length && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          +{items.length - shown.length} more pending — they are highlighted in red on their planned
          day.
        </p>
      )}
    </section>
  );
}