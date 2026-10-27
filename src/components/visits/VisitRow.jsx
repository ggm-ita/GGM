import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, MapPin, Hourglass } from "lucide-react";
import { fmtDay } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  pending: "border-accent-foreground/40 bg-accent text-accent-foreground",
  scheduled: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-success/40 bg-success/10 text-success",
  cancelled: "border-border bg-secondary text-muted-foreground",
};

const STATUS_LABEL = {
  pending: "pending approval",
  scheduled: "scheduled",
  completed: "completed",
  cancelled: "cancelled",
};

export default function VisitRow({
  visit,
  overdue,
  canApprove,
  onMarkVisited,
  onCancel,
  onApprove,
  onDecline,
}) {
  const isPending = visit.status === "pending";
  return (
    <div className="grid gap-3 border-b border-border p-4 last:border-b-0 sm:flex sm:items-start sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/retailers/${visit.retailer_id}`}
            className="font-semibold hover:text-primary hover:underline"
          >
            {visit.retailer_name}
          </Link>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              STATUS_STYLE[overdue && visit.status === "scheduled" ? "scheduled" : visit.status] ||
                STATUS_STYLE.cancelled,
              overdue && visit.status === "scheduled" && "border-destructive/50 bg-destructive/10 text-destructive"
            )}
          >
            {overdue && visit.status === "scheduled"
              ? "Overdue"
              : STATUS_LABEL[visit.status] || visit.status}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5" />
            {fmtDay(visit.scheduled_date)}
            {visit.scheduled_time ? ` · ${visit.scheduled_time}` : ""}
          </span>
          {visit.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {visit.city}
            </span>
          )}
          {visit.assigned_to_name && <span>· {visit.assigned_to_name}</span>}
        </div>

        {isPending && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-accent-foreground">
            <Hourglass className="w-3.5 h-3.5" />
            {canApprove
              ? "Waiting for your approval."
              : "Waiting for an administrator to approve this request."}
          </p>
        )}

        {visit.notes && <p className="mt-2 text-sm text-muted-foreground">{visit.notes}</p>}
        {visit.outcome && (
          <p className="mt-2 whitespace-pre-wrap text-sm">
            <span className="text-muted-foreground">Report: </span>
            {visit.outcome}
          </p>
        )}
      </div>

      {visit.status === "scheduled" && (
        <div className="flex gap-2 sm:flex-col">
          <Button size="sm" onClick={() => onMarkVisited(visit)}>
            <Check className="w-4 h-4 mr-1.5" /> Mark visited
          </Button>
          <Button size="sm" variant="outline" onClick={() => onCancel(visit)}>
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </Button>
        </div>
      )}

      {isPending && (
        <div className="flex gap-2 sm:flex-col">
          {canApprove ? (
            <>
              <Button size="sm" onClick={() => onApprove(visit)}>
                <Check className="w-4 h-4 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecline(visit)}>
                <X className="w-4 h-4 mr-1.5" /> Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onCancel(visit)}>
              <X className="w-4 h-4 mr-1.5" /> Withdraw
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
