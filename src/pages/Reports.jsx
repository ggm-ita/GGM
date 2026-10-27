import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { ClipboardList } from "lucide-react";
import MonthPicker from "@/components/reports/MonthPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StaffActivity from "@/components/reports/StaffActivity";
import DailyReport from "@/components/reports/DailyReport";
import GapReport from "@/components/reports/GapReport";
import { fetchAllRetailers, fetchLastContacts } from "@/lib/retailers";
import { fetchLastVisits, fetchMonthActivity, fetchStaff } from "@/lib/activity";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "activity", label: "Field activity & visits" },
  { key: "gaps", label: "Follow-up gaps" },
];

const GROUPS = [
  { key: "staff", label: "By staff" },
  { key: "day", label: "By day" },
];

export default function Reports() {
  const [tab, setTab] = useState("activity");
  const [group, setGroup] = useState("staff");
  const [month, setMonth] = useState(moment());
  const [staff, setStaff] = useState("all");
  const [users, setUsers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [retailers, setRetailers] = useState([]);
  const [lastContacts, setLastContacts] = useState({});
  const [lastVisits, setLastVisits] = useState({});
  const [gapsLoading, setGapsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchStaff(),
      fetchAllRetailers().catch(() => []),
      fetchLastContacts(),
      fetchLastVisits(),
    ])
      .then(([staff, shops, contacts, visitMap]) => {
        if (!alive) return;
        setUsers(staff);
        setRetailers(shops);
        setLastContacts(contacts);
        setLastVisits(visitMap);
        setGapsLoading(false);
      })
      .catch(() => alive && setGapsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setActivityLoading(true);
    fetchMonthActivity(month)
      .then((result) => {
        if (!alive) return;
        setVisits(result.visits);
        setInteractions(result.interactions);
      })
      .catch(() => {
        if (!alive) return;
        setVisits([]);
        setInteractions([]);
      })
      .finally(() => alive && setActivityLoading(false));
    return () => {
      alive = false;
    };
  }, [month]);

  /* Who can be picked: every staff account, plus anyone who appears in the data. */
  const staffOptions = useMemo(() => {
    const map = new Map();
    users.forEach((user) => {
      if (user.email) map.set(user.email.toLowerCase(), user.full_name || user.email);
    });
    [...visits, ...interactions].forEach((item) => {
      const email = (item.assigned_to || item.staff_email || "").toLowerCase();
      if (email && !map.has(email)) {
        map.set(email, item.assigned_to_name || item.staff_name || item.assigned_to || item.staff_email);
      }
    });
    return [...map.entries()]
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, visits, interactions]);

  const scopedVisits = useMemo(
    () =>
      staff === "all"
        ? visits
        : visits.filter((visit) => (visit.assigned_to || "").toLowerCase() === staff),
    [visits, staff]
  );

  const scopedInteractions = useMemo(
    () =>
      staff === "all"
        ? interactions
        : interactions.filter((item) => (item.staff_email || "").toLowerCase() === staff),
    [interactions, staff]
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-10">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="font-heading text-3xl text-primary">Reports</h1>
        <p className="text-sm text-muted-foreground">
          How the field team is working, and which retailers still need attention.
        </p>
      </header>

      <div className="my-4 flex overflow-hidden rounded-lg border border-border">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "flex-1 border-r border-border py-2.5 text-[11px] font-medium last:border-r-0",
              tab === item.key
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-card text-muted-foreground"
            )}
          >
            <ClipboardList className="mr-1.5 inline w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "activity" ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Month of activity · visits planned and interactions logged
            </span>
            <div className="flex overflow-hidden rounded-lg border border-border lg:ml-auto">
              {GROUPS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGroup(item.key)}
                  className={cn(
                    "border-r border-border px-3 py-1.5 text-[11px] font-medium last:border-r-0",
                    group === item.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-card text-muted-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Select value={staff} onValueChange={setStaff}>
              <SelectTrigger className="h-8 w-[190px] text-xs" aria-label="Staff member">
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staffOptions.map((option) => (
                  <SelectItem key={option.email} value={option.email}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MonthPicker month={month} onChange={setMonth} />
          </div>
          {group === "day" ? (
            <DailyReport
              month={month}
              visits={scopedVisits}
              interactions={scopedInteractions}
              loading={activityLoading}
            />
          ) : (
            <StaffActivity
              month={month}
              users={users}
              visits={scopedVisits}
              interactions={scopedInteractions}
              loading={activityLoading}
            />
          )}
        </>
      ) : (
        <GapReport
          retailers={retailers}
          lastContacts={lastContacts}
          lastVisits={lastVisits}
          loading={gapsLoading}
        />
      )}
    </div>
  );
}