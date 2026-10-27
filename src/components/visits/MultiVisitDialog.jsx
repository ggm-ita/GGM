import { db } from "@/api/supabaseClient";

import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Check, ListChecks, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cityStats, eur, fetchAllRetailers, isActive, matchesQuery } from "@/lib/retailers";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const VISIBLE = 120;

export default function MultiVisitDialog({ open, onOpenChange, initialDate, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [retailers, setRetailers] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selected, setSelected] = useState([]);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [date, setDate] = useState(initialDate || moment().format("YYYY-MM-DD"));
  const [time, setTime] = useState("09:00");
  const [weeks, setWeeks] = useState(1);
  const [assignedTo, setAssignedTo] = useState(user?.email || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQ("");
    setCity("");
    setDate(initialDate || moment().format("YYYY-MM-DD"));
    setTime("09:00");
    setWeeks(1);
    setAssignedTo(user?.email || "");
    setNotes("");
    setError("");
  }, [open, initialDate, user?.email]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchAllRetailers()
      .then((list) => alive && setRetailers(list))
      .catch(() => alive && setRetailers([]));
    if (isAdmin) {
      db.entities.User.list()
        .then((list) => alive && setStaff(list || []))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [open, isAdmin]);

  const cities = useMemo(() => cityStats(retailers || []), [retailers]);
  const matches = useMemo(
    () => (retailers || []).filter((r) => (!city || r.city === city) && matchesQuery(r, q)),
    [retailers, city, q]
  );
  const shown = matches.slice(0, VISIBLE);
  const chosen = useMemo(
    () => (retailers || []).filter((r) => selected.includes(r.id)),
    [retailers, selected]
  );

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const save = async () => {
    if (!chosen.length) {
      setError("Select at least one retailer to visit.");
      return;
    }
    if (!date) {
      setError("Pick the date of the first round.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const assignee = staff.find((s) => s.email === assignedTo);
      const assigneeName = assignee?.full_name || assignee?.email || assignedTo;
      const payload = [];
      chosen.forEach((retailer) => {
        for (let week = 0; week < weeks; week += 1) {
          payload.push({
            retailer_id: retailer.id,
            retailer_name: retailer.name,
            customer_id: retailer.customer_id,
            city: retailer.city,
            region: retailer.region,
            scheduled_date: moment(date).add(week, "weeks").format("YYYY-MM-DD"),
            scheduled_time: time,
            status: "scheduled",
            assigned_to: assignedTo,
            assigned_to_name: assigneeName,
            notes: notes.trim(),
          });
        }
      });
      for (let i = 0; i < payload.length; i += 400) {
        await db.entities.Visit.bulkCreate(payload.slice(i, i + 400));
      }
      onSaved?.(payload.length);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The visits could not be planned.");
    } finally {
      setSaving(false);
    }
  };

  const total = chosen.length * weeks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ggm-scroll max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">
            Plan visits for several retailers
          </DialogTitle>
          <DialogDescription>
            Pick the shops for this round and plan them on the same day, repeating weekly if you need
            a full cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="round-date">Date</Label>
              <Input
                id="round-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="round-time">Time</Label>
              <Input
                id="round-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="round-weeks">Repeat</Label>
              <select
                id="round-weeks"
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
              >
                <option value={1}>One day only</option>
                <option value={2}>Every week × 2</option>
                <option value={3}>Every week × 3</option>
                <option value={4}>Every week × 4</option>
              </select>
            </div>
          </div>

          {isAdmin && staff.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="round-staff">Assign to</Label>
              <select
                id="round-staff"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
              >
                {staff.map((member) => (
                  <option key={member.id} value={member.email}>
                    {member.full_name || member.email}
                    {member.role === "admin" ? " (admin)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="round-notes">What to do on these visits</Label>
            <Textarea
              id="round-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Check stock, collect payment, present the new catalogue…"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="shrink-0">Retailers</Label>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[11px] text-primary">
                {selected.length} selected
              </span>
              <span className="ml-auto flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setSelected(matches.map((r) => r.id))}>
                  Select all matching
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!selected.length}
                  onClick={() => setSelected([])}
                >
                  Clear
                </Button>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, shop, city or ID"
                  className="pl-9"
                />
              </div>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 min-w-[140px] rounded-lg border border-border bg-secondary px-2 text-xs"
              >
                <option value="">All cities</option>
                {cities.map((option) => (
                  <option key={option.city} value={option.city}>
                    {option.city} ({option.total})
                  </option>
                ))}
              </select>
            </div>

            <div className="ggm-scroll max-h-[280px] overflow-y-auto rounded-lg border border-border">
              {!retailers ? (
                <div className="grid place-items-center py-8">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : shown.length ? (
                shown.map((retailer) => {
                  const picked = selected.includes(retailer.id);
                  return (
                    <button
                      key={retailer.id}
                      type="button"
                      onClick={() => toggle(retailer.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left last:border-b-0 hover:bg-secondary",
                        picked && "bg-primary/10"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border",
                          picked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                      >
                        {picked && <Check className="w-3 h-3" />}
                      </span>
                      <span className={cn("dot shrink-0", isActive(retailer) ? "g" : "r")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{retailer.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {retailer.shop_name ? `${retailer.shop_name} · ` : ""}
                          {retailer.city} · #{retailer.customer_id}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">
                        {eur(retailer.balance)}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-6 text-xs text-muted-foreground">
                  No retailer matches that search.
                </p>
              )}
            </div>

            {matches.length > shown.length && (
              <p className="text-[11px] text-muted-foreground">
                Showing the first {VISIBLE} of {matches.length} matching retailers — narrow the search
                to reach the rest.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto font-mono text-[11px] text-muted-foreground">
              {chosen.length} retailers × {weeks} week{weeks > 1 ? "s" : ""} = {total} visits
            </span>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !total}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ListChecks className="w-4 h-4 mr-2" />
              )}
              Plan {total || ""} visits
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}