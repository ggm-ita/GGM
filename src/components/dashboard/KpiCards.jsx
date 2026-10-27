import React from "react";
import {
  Store,
  TrendingUp,
  AlertTriangle,
  Percent,
  Coins,
  Gauge,
  Map as MapIcon,
  Building2,
} from "lucide-react";
import { eur, int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const TONE = {
  default: { value: "text-foreground", chip: "bg-secondary text-foreground" },
  gold: { value: "text-primary", chip: "bg-primary/12 text-primary" },
  success: { value: "text-success", chip: "bg-success/12 text-success" },
  danger: { value: "text-destructive", chip: "bg-destructive/12 text-destructive" },
};

export default function KpiCards({ stats, regions = 0, cities = 0 }) {
  const inactiveRate = stats.total ? (stats.inactive / stats.total) * 100 : 0;

  const cards = [
    {
      label: "Retailers",
      value: int(stats.total),
      sub: `${int(stats.active)} active · ${int(stats.inactive)} inactive`,
      icon: Store,
      tone: "default",
    },
    {
      label: "Active",
      value: int(stats.active),
      sub: `${stats.rate.toFixed(1)}% of retailers`,
      icon: TrendingUp,
      tone: "success",
    },
    {
      label: "Inactive",
      value: int(stats.inactive),
      sub: `${inactiveRate.toFixed(1)}% of retailers`,
      icon: AlertTriangle,
      tone: "danger",
    },
    {
      label: "Activation rate",
      value: `${stats.rate.toFixed(1)}%`,
      sub: "active share of territory",
      icon: Percent,
      tone: "gold",
    },
    {
      label: "Total balance",
      value: eur(stats.balance),
      sub: "outstanding in selection",
      icon: Coins,
      tone: "gold",
    },
    {
      label: "Average balance",
      value: eur(stats.total ? stats.balance / stats.total : 0),
      sub: "per retailer",
      icon: Gauge,
      tone: "default",
    },
    {
      label: "Regions",
      value: int(regions),
      sub: "in selection",
      icon: MapIcon,
      tone: "default",
    },
    {
      label: "Cities",
      value: int(cities),
      sub: "towns covered",
      icon: Building2,
      tone: "default",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => {
        const tone = TONE[c.tone];
        return (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {c.label}
              </span>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", tone.chip)}>
                <c.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <div
              className={cn(
                "mt-2 truncate font-mono text-xl tabular-nums lg:text-2xl",
                tone.value
              )}
            >
              {c.value}
            </div>
            <div className="mt-1 truncate text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}