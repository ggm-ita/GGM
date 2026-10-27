import { db } from "@/api/supabaseClient";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import VisitRow from "@/components/visits/VisitRow";
import VisitFormDialog from "@/components/visits/VisitFormDialog";
import MarkVisitedDialog from "@/components/visits/MarkVisitedDialog";
import MultiVisitDialog from "@/components/visits/MultiVisitDialog";
import VisitMonth from "@/components/visits/VisitMonth";
import StaffCalendar from "@/components/visits/StaffCalendar";
import ScheduleUploadDialog from "@/components/visits/ScheduleUploadDialog";
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  List,
  ListChecks,
  Loader2,
  Upload,
} from "lucide-react";
import { fetchAllRetailers, fetchLastContacts } from "@/lib/retailers";
import { fetchStaff, fetchVisits } from "@/lib/activity";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const VIEWS = [
  { key: "list", label: "List", icon: List },
  { key: "month", label: "Month plan", icon: CalendarDays },
  { key: "calendar", label: "Staff calendar", icon: CalendarRange, admin: true },
];

export default function Visits() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [visits, setVisits] = useState([]);
  const [timeline, setTimeline] = useState(null);
  const [retailers, setRetailers] = useState([]);
  const [lastContacts, setLastContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [multiOpen, setMultiOpen] = useState(false);
  const [planDate, setPlanDate] = useState(null);
  const [markVisit, setMarkVisit] = useState(null);
  const [notice, setNotice] = useState("");
  const [staff, setStaff] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    const page = await db.entities.Visit.filter({}, { sort: "scheduled_date", limit: 500 });
    setVisits(page.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([fetchAllRetailers().catch(() => []), fetchLastContacts().catch(() => ({}))]).then(
      ([list, contacts]) => {
        setRetailers(list);
        setLastContacts(contacts);
      }
    );
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStaff().then(setStaff);
  }, [isAdmin]);

  /* The month plan needs every visit, so it is read once, paged, when first opened. */
  const loadTimeline = useCallback(() => {
    fetchVisits({}, { sort: "scheduled_date" })
      .then(setTimeline)
      .catch(() => setTimeline([]));
  }, []);

  useEffect(() => {
    if (view !== "list" && timeline === null) loadTimeline();
  }, [view, timeline, loadTimeline]);

  const refresh = useCallback(() => {
    load();
    if (timeline !== null) loadTimeline();
  }, [load, loadTimeline, timeline]);

  const groups = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      upcoming: visits
        .filter((v) => v.status === "scheduled" && v.scheduled_date >= today)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
      overdue: visits
        .filter((v) => v.status === "scheduled" && v.scheduled_date < today)
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
      completed: visits
        .filter((v) => v.status === "completed")
        .sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || "")),
      cancelled: visits.filter((v) => v.status === "cancelled"),
    };
  }, [visits]);

  const cancelVisit = async (visit) => {
    await db.entities.Visit.update(visit.id, { status: "cancelled" });
    setNotice("Visit cancelled.");
    refresh();
  };

  const openPlanner = (dateKey = null) => {
    setPlanDate(dateKey);
    setMultiOpen(true);
  };

  const current = groups[tab] || [];
  const views = VIEWS.filter((item) => !item.admin || isAdmin);

  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-5 pb-10",
        view === "list" ? "max-w-3xl" : "max-w-6xl"
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-primary">Visits</h1>
          <p className="text-sm text-muted-foreground">
            Plan the rounds, then mark each retailer as visited.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border">
            {views.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setView(item.key)}
                aria-pressed={view === item.key}
                className={cn(
                  "flex items-center gap-1.5 border-r border-border px-3 py-2 text-[11px] font-medium last:border-r-0",
                  view === item.key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-card text-muted-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" /> Upload schedule
              </Button>
              <Button variant="outline" onClick={() => openPlanner()}>
                <ListChecks className="w-4 h-4 mr-2" /> Plan multiple
              </Button>
            </>
          )}
          <Button onClick={() => setFormOpen(true)}>
            <CalendarPlus className="w-4 h-4 mr-2" /> Schedule visit
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
          {notice}
        </div>
      )}

      {view !== "list" ? (
        timeline === null ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : view === "calendar" ? (
          <StaffCalendar users={staff} visits={timeline} />
        ) : (
          <VisitMonth
            visits={timeline}
            retailers={retailers}
            lastContacts={lastContacts}
            onPlanDay={isAdmin ? openPlanner : null}
          />
        )
      ) : (
        <>
          <div className="mb-4 flex overflow-hidden rounded-lg border border-border">
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
                {item.label}
                <span className="ml-1 font-mono opacity-80">{groups[item.key].length}</span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {loading ? (
              <div className="grid place-items-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : current.length ? (
              current.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  overdue={tab === "overdue"}
                  onMarkVisited={setMarkVisit}
                  onCancel={cancelVisit}
                />
              ))
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing here yet. Schedule a visit to start the round.
              </p>
            )}
          </div>
        </>
      )}

      <VisitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => {
          setNotice("Visit scheduled.");
          setView("list");
          setTab("upcoming");
          refresh();
        }}
      />
      <MultiVisitDialog
        open={multiOpen}
        onOpenChange={setMultiOpen}
        initialDate={planDate}
        onSaved={(count) => {
          setNotice(`${count} visits planned.`);
          refresh();
        }}
      />
      <ScheduleUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        staff={staff}
        retailers={retailers}
        visits={visits}
        onSaved={(count) => {
          setNotice(`${count} visits scheduled from the uploaded file.`);
          refresh();
        }}
      />
      <MarkVisitedDialog
        open={Boolean(markVisit)}
        onOpenChange={(open) => !open && setMarkVisit(null)}
        retailer={
          markVisit
            ? {
                id: markVisit.retailer_id,
                name: markVisit.retailer_name,
                customer_id: markVisit.customer_id,
                city: markVisit.city,
                region: markVisit.region,
              }
            : null
        }
        visit={markVisit}
        onSaved={() => {
          setNotice("Visit completed and added to the retailer timeline.");
          setMarkVisit(null);
          refresh();
        }}
      />
    </div>
  );
}