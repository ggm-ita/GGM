import React, { useMemo, useState } from "react";
import moment from "moment";
import MonthPicker from "@/components/reports/MonthPicker";
import MonthGrid from "@/components/visits/MonthGrid";
import StaffRail from "@/components/visits/StaffRail";
import StaffDaySchedule from "@/components/visits/StaffDaySchedule";
import { monthPlan, todayKey } from "@/lib/activity";
import { int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function StaffCalendar({ users = [], visits = [] }) {
  const [month, setMonth] = useState(moment());
  const [pickedKey, setPickedKey] = useState("");
  const [dayKey, setDayKey] = useState(todayKey());

  const rows = useMemo(() => {
    const byEmail = new Map();
    users.forEach((user) => {
      const key = String(user.email || "").toLowerCase();
      if (!key) return;
      byEmail.set(key, { key, name: user.full_name || user.email });
    });
    visits.forEach((visit) => {
      const key = String(visit.assigned_to || "").toLowerCase();
      if (!key) return;
      if (!byEmail.has(key)) {
        byEmail.set(key, { key, name: visit.assigned_to_name || visit.assigned_to });
      }
    });
    return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, visits]);

  const activeKey = pickedKey || rows[0]?.key || "";
  const staff = rows.find((row) => row.key === activeKey) || null;

  const mine = useMemo(
    () => visits.filter((visit) => String(visit.assigned_to || "").toLowerCase() === activeKey),
    [visits, activeKey]
  );

  const plan = useMemo(
    () => monthPlan({ month, visits: mine, retailers: [], lastContacts: {} }),
    [month, mine]
  );

  /* Visits per staff member in the month on screen, shown beside each name. */
  const counts = useMemo(() => {
    const prefix = month.format("YYYY-MM");
    const map = {};
    visits.forEach((visit) => {
      if (!String(visit.scheduled_date || "").startsWith(prefix)) return;
      const key = String(visit.assigned_to || "").toLowerCase();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [visits, month]);

  const overdue = useMemo(
    () =>
      mine.filter(
        (visit) =>
          visit.status === "scheduled" &&
          visit.scheduled_date < todayKey() &&
          String(visit.scheduled_date).startsWith(month.format("YYYY-MM"))
      ).length,
    [mine, month]
  );

  const selected = plan.days.find((day) => day.key === dayKey) || null;

  const changeMonth = (next) => {
    setMonth(next);
    setDayKey(
      next.isSame(moment(), "month") ? todayKey() : next.clone().startOf("month").format("YYYY-MM-DD")
    );
  };

  const cards = [
    { label: "Planned", value: plan.overview.planned, tone: "text-primary" },
    { label: "Completed", value: plan.overview.completed, tone: "text-success" },
    { label: "Overdue", value: overdue, tone: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <StaffRail rows={rows} counts={counts} activeKey={activeKey} onSelect={setPickedKey} />

      <div className="grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <span className="min-w-0 truncate text-sm">
            {staff ? staff.name : "Pick a staff member"}
            <span className="text-muted-foreground"> · {month.format("MMMM YYYY")} plan</span>
          </span>
          <MonthPicker month={month} onChange={changeMonth} className="ml-auto" />
        </div>

        <div className="grid grid-cols-3 gap-3">
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

        <MonthGrid
          days={plan.days}
          selectedKey={dayKey}
          today={todayKey()}
          onSelect={setDayKey}
        />

        <StaffDaySchedule day={selected} />
      </div>
    </div>
  );
}