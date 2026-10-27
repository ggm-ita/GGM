import React, { useMemo, useState } from "react";
import moment from "moment";
import { CalendarDays } from "lucide-react";
import MonthPicker from "@/components/reports/MonthPicker";
import MonthGrid from "@/components/visits/MonthGrid";
import DayDetail from "@/components/visits/DayDetail";
import PendingList from "@/components/visits/PendingList";
import { monthPlan, todayKey } from "@/lib/activity";
import { int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function VisitMonth({ visits, retailers, lastContacts, onPlanDay }) {
  const [month, setMonth] = useState(moment());
  const [selectedKey, setSelectedKey] = useState(todayKey());

  const plan = useMemo(
    () => monthPlan({ month, visits, retailers, lastContacts }),
    [month, visits, retailers, lastContacts]
  );
  const retailersById = useMemo(() => new Map(retailers.map((r) => [r.id, r])), [retailers]);
  const selected = useMemo(
    () => plan.days.find((day) => day.key === selectedKey) || null,
    [plan, selectedKey]
  );

  const changeMonth = (next) => {
    setMonth(next);
    setSelectedKey(
      next.isSame(moment(), "month") ? todayKey() : next.clone().startOf("month").format("YYYY-MM-DD")
    );
  };

  const cards = [
    { label: "Planned", value: plan.overview.planned, tone: "text-primary" },
    { label: "Completed", value: plan.overview.completed, tone: "text-success" },
    { label: "Follow-ups due", value: plan.overview.followUpsDue, tone: "text-foreground" },
    { label: "Overdue now", value: plan.pendingNow.length, tone: "text-destructive" },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <h2 className="font-heading text-lg text-primary">Month plan</h2>
        </div>
        <MonthPicker month={month} onChange={changeMonth} className="lg:ml-auto" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {card.label}
            </div>
            <div className={cn("mt-1 font-mono text-xl tabular-nums", card.tone)}>
              {int(card.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <MonthGrid
          days={plan.days}
          selectedKey={selectedKey}
          today={todayKey()}
          onSelect={setSelectedKey}
        />
        <DayDetail day={selected} retailersById={retailersById} onPlanDay={onPlanDay} />
      </div>

      <PendingList items={plan.pendingNow} />
    </div>
  );
}