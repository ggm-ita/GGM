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
import { MessageCircle, Phone, MapPin, Mail, StickyNote, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "call", label: "Call", icon: Phone },
  { key: "visit", label: "Visit", icon: MapPin },
  { key: "email", label: "Email", icon: Mail },
  { key: "note", label: "Note", icon: StickyNote },
];

export default function InteractionDialog({ open, onOpenChange, retailer, onSaved }) {
  const { user } = useAuth();
  const [type, setType] = useState("whatsapp");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("whatsapp");
      setSummary("");
      setError("");
    }
  }, [open]);

  const save = async () => {
    if (!summary.trim()) {
      setError("Add a short note about what was discussed.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await db.entities.Interaction.create({
        retailer_id: retailer.id,
        retailer_name: retailer.name,
        customer_id: retailer.customer_id,
        city: retailer.city,
        region: retailer.region,
        type,
        summary: summary.trim(),
        occurred_at: new Date().toISOString(),
        staff_name: user?.full_name || user?.email || "",
        staff_email: user?.email || "",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The interaction could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Log an interaction</DialogTitle>
          <DialogDescription>{retailer?.name}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type of contact</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TYPES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setType(item.key)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px]",
                    type === item.key
                      ? "border-primary bg-primary/15 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interaction-summary">What happened</Label>
            <Textarea
              id="interaction-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Agreed to place a new order next week…"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save interaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}