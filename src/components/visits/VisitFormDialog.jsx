import { db } from "@/api/supabaseClient";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import RetailerPicker from "@/components/retailers/RetailerPicker";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const today = () => new Date().toISOString().slice(0, 10);

export default function VisitFormDialog({ open, onOpenChange, retailer, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [picked, setPicked] = useState(retailer || null);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:00");
  const [assignedTo, setAssignedTo] = useState(user?.email || "");
  const [notes, setNotes] = useState("");
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(retailer || null);
    setDate(today());
    setTime("10:00");
    setAssignedTo(user?.email || "");
    setNotes("");
    setError("");
  }, [open, retailer, user?.email]);

  useEffect(() => {
    if (!open || !isAdmin) return;
    let alive = true;
    db.entities.User.list().then((list) => {
      if (alive) setStaff(list || []);
    });
    return () => {
      alive = false;
    };
  }, [open, isAdmin]);

  const save = async () => {
    if (!picked) {
      setError("Choose the retailer to visit.");
      return;
    }
    if (!date) {
      setError("Pick a date for the visit.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const assignee = staff.find((s) => s.email === assignedTo);
      await db.entities.Visit.create({
        retailer_id: picked.id,
        retailer_name: picked.name,
        customer_id: picked.customer_id,
        city: picked.city,
        region: picked.region,
        scheduled_date: date,
        scheduled_time: time,
        /* Staff requests wait for an administrator's approval; an administrator
           schedules directly. */
        status: isAdmin ? "scheduled" : "pending",
        assigned_to: assignedTo,
        assigned_to_name: assignee?.full_name || user?.full_name || assignee?.email || assignedTo,
        notes: notes.trim(),
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The visit could not be scheduled.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Schedule a visit</DialogTitle>
          <DialogDescription>
            {retailer ? retailer.name : "Pick the retailer and the day for the visit."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {!retailer && (
            <div className="grid gap-2">
              <Label>Retailer</Label>
              <RetailerPicker value={picked} onChange={setPicked} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="visit-date">Date</Label>
              <Input
                id="visit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visit-time">Time</Label>
              <Input
                id="visit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {isAdmin && staff.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="visit-staff">Assign to</Label>
              <select
                id="visit-staff"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.full_name || s.email}
                    {s.role === "admin" ? " (admin)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="visit-notes">What to do on this visit</Label>
            <Textarea
              id="visit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Check stock, present the new catalogue…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {!isAdmin && (
            <p className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
              Your request is sent to an administrator, who approves it before the visit appears in
              the plan.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isAdmin ? "Schedule visit" : "Request visit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}