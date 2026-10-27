import { db } from "@/api/supabaseClient";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function MarkVisitedDialog({ open, onOpenChange, retailer, visit, onSaved }) {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    if (!outcome.trim()) {
      setError("Add a short report of the visit.");
      return;
    }
    setSaving(true);
    setError("");
    const stamp = new Date().toISOString();
    try {
      if (visit?.id) {
        await db.entities.Visit.update(visit.id, {
          status: "completed",
          outcome: outcome.trim(),
          completed_at: stamp,
        });
      } else if (retailer?.id) {
        await db.entities.Visit.create({
          retailer_id: retailer.id,
          retailer_name: retailer.name,
          customer_id: retailer.customer_id,
          city: retailer.city,
          region: retailer.region,
          scheduled_date: stamp.slice(0, 10),
          scheduled_time: stamp.slice(11, 16),
          status: "completed",
          assigned_to: user?.email || "",
          assigned_to_name: user?.full_name || user?.email || "",
          outcome: outcome.trim(),
          completed_at: stamp,
        });
      }

      await db.entities.Interaction.create({
        retailer_id: retailer?.id || visit?.retailer_id,
        retailer_name: retailer?.name || visit?.retailer_name,
        customer_id: retailer?.customer_id || visit?.customer_id,
        city: retailer?.city || visit?.city,
        region: retailer?.region || visit?.region,
        type: "visit",
        summary: outcome.trim(),
        occurred_at: stamp,
        staff_name: user?.full_name || user?.email || "",
        staff_email: user?.email || "",
      });

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The visit could not be marked as done.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Mark as visited</DialogTitle>
          <DialogDescription>
            {retailer?.name || visit?.retailer_name} — the report is added to the retailer timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="visit-outcome">Visit report</Label>
            <Textarea
              id="visit-outcome"
              rows={4}
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Visited the shop, balance checked, agreed on a new order…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save visit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}