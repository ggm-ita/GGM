import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { eur, fromNow, isActive } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function RetailerRow({ retailer, lastContact, selected, onFocus }) {
  const active = isActive(retailer);
  const contact = lastContact?.date;

  const body = (
    <>
      <span className={cn("dot", active ? "g" : "r")} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{retailer.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {retailer.shop_name ? `${retailer.shop_name} · ` : ""}
          {retailer.city}
          {contact ? ` · last contact ${fromNow(contact)}` : " · never contacted"}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className={cn(
            "block font-mono text-xs tabular-nums",
            active ? "text-success" : "text-muted-foreground"
          )}
        >
          {eur(retailer.balance)}
        </span>
        <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-primary">
          Profile <ChevronRight className="w-3 h-3" />
        </span>
      </span>
    </>
  );

  const shell = cn(
    "flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left transition-colors",
    selected ? "bg-primary/10" : "hover:bg-secondary/60"
  );

  if (!onFocus) {
    return (
      <Link to={`/retailers/${retailer.id}`} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onFocus(retailer)} className={shell}>
      {body}
    </button>
  );
}