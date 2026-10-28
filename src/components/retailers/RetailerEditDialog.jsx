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
import { cn } from "@/lib/utils";

const FIELDS = [
  { key: "name", label: "Name", placeholder: "Mario Rossi", wide: true },
  { key: "shop_name", label: "Shop name", placeholder: "Alimentari Rossi", wide: true },
  { key: "mobile", label: "Mobile", placeholder: "+39 333 1234567" },
  { key: "address", label: "Address", placeholder: "Via Roma 1", wide: true },
  { key: "postcode", label: "Postcode", placeholder: "00100" },
  { key: "city", label: "City", placeholder: "Roma" },
  { key: "province", label: "Province", placeholder: "Roma" },
  { key: "province_code", label: "Province code", placeholder: "RM" },
  { key: "region", label: "Region", placeholder: "Lazio" },
];

const emptyValues = () => Object.fromEntries(FIELDS.map((field) => [field.key, ""]));

export default function RetailerEditDialog({ open, onOpenChange, retailer, onSaved }) {
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(
      Object.fromEntries(
        FIELDS.map((field) => [
          field.key,
          retailer?.[field.key] != null ? String(retailer[field.key]) : "",
        ])
      )
    );
    setError("");
  }, [open, retailer]);

  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!values.name.trim()) {
      setError("Enter the retailer's name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const patch = Object.fromEntries(
        FIELDS.map((field) => [field.key, values[field.key].trim() || null])
      );
      patch.name = values.name.trim();
      await db.entities.Retailer.update(retailer.id, patch);
      onSaved?.("Retailer details updated.");
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The details could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto ggm-scroll">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Edit retailer details</DialogTitle>
          <DialogDescription>
            {retailer ? `#${retailer.customer_id} · ${retailer.name}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={cn("grid gap-2", field.wide && "sm:col-span-2")}>
              <Label htmlFor={`retailer-${field.key}`}>{field.label}</Label>
              <Input
                id={`retailer-${field.key}`}
                value={values[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
