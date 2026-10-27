import { db } from "@/api/supabaseClient";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { eur } from "@/lib/retailers";

export default function BalanceDialog({ open, onOpenChange, retailer, onSaved }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(retailer?.balance != null ? String(retailer.balance) : "");
      setError("");
    }
  }, [open, retailer]);

  const save = async () => {
    const amount = Number(String(value).replace(",", "."));
    if (!String(value).trim() || Number.isNaN(amount)) {
      setError("Enter the new balance.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await db.entities.Retailer.update(retailer.id, {
        balance: amount,
        is_active: true,
        balance_updated_at: new Date().toISOString(),
      });
      onSaved?.(amount);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The balance could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Update balance</DialogTitle>
          <DialogDescription>
            {retailer?.name} — currently {eur(retailer?.balance)}. Saving the new balance sets the
            retailer to active.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="retailer-balance">New balance (€)</Label>
            <Input
              id="retailer-balance"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update balance
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}