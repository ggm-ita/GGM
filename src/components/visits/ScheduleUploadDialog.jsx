import { db } from "@/api/supabaseClient";

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileUp, Loader2 } from "lucide-react";
import { downloadScheduleExample, readSchedule } from "@/lib/scheduleCsv";

export default function ScheduleUploadDialog({
  open,
  onOpenChange,
  staff = [],
  retailers = [],
  visits = [],
  onSaved,
}) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setFileName("");
      setPreview(null);
      setError("");
    }
  }, [open]);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    try {
      const text = await file.text();
      setPreview(readSchedule(text, { staff, retailers, visits }));
    } catch {
      setPreview(null);
      setError("That file could not be read.");
    }
  };

  const save = async () => {
    if (!preview?.rows.length) return;
    setSaving(true);
    setError("");
    try {
      await db.entities.Visit.bulkCreate(preview.rows);
      onSaved?.(preview.rows.length);
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "The schedule could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const rows = preview?.rows || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Upload staff schedule</DialogTitle>
          <DialogDescription>
            One row per visit: staff email, customer ID, date (YYYY-MM-DD), optional time and notes.
            Every row is assigned to that staff member.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => downloadScheduleExample({ staff, retailers })}
            >
              <Download className="w-3.5 h-3.5" /> Download example CSV
            </Button>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary">
              <FileUp className="w-3.5 h-3.5" />
              {fileName || "Choose CSV file"}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={pick} />
            </label>
          </div>

          {preview && (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-success/40 bg-success/10 px-2 py-1 text-success">
                  {rows.length} visit{rows.length === 1 ? "" : "s"} ready
                </span>
                {preview.duplicates > 0 && (
                  <span className="rounded-md border border-border bg-secondary px-2 py-1 text-muted-foreground">
                    {preview.duplicates} already scheduled
                  </span>
                )}
                {preview.errors.length > 0 && (
                  <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive">
                    {preview.errors.length} row{preview.errors.length === 1 ? "" : "s"} skipped
                  </span>
                )}
              </div>

              {rows.length > 0 && (
                <div className="ggm-scroll max-h-48 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <tbody>
                      {rows.slice(0, 50).map((row, index) => (
                        <tr key={index} className="border-b border-border/60 last:border-0">
                          <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                            {row.scheduled_date} {row.scheduled_time}
                          </td>
                          <td className="px-2 py-1.5 truncate">{row.assigned_to_name}</td>
                          <td className="px-2 py-1.5 truncate text-muted-foreground">
                            {row.customer_id} · {row.retailer_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.errors.length > 0 && (
                <ul className="ggm-scroll max-h-28 space-y-1 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                  {preview.errors.slice(0, 30).map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !rows.length}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {rows.length
                ? `Schedule ${rows.length} visit${rows.length === 1 ? "" : "s"}`
                : "Schedule visits"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}