import { db } from "@/api/supabaseClient";

import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { parseCsv } from "@/lib/csv";
import { RETAILER_COLUMNS, diffImport, mapColumns } from "@/lib/retailerCsv";
import { eur, int } from "@/lib/retailers";

const PREVIEW_ROWS = 25;

const changeLabel = (update) =>
  Object.keys(update.patch)
    .filter((key) => key !== "balance_updated_at")
    .map((key) =>
      key === "balance"
        ? `balance ${eur(update.retailer.balance)} → ${eur(update.patch.balance)}`
        : key
    )
    .join(", ");

export default function RetailerImport({ retailers = [], onDone }) {
  const fileRef = useRef(null);
  const [table, setTable] = useState(null);
  const [fileName, setFileName] = useState("");
  const [columnMap, setColumnMap] = useState({});
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    const parsed = parseCsv(await file.text());
    if (!parsed.body.length) {
      setTable(null);
      setError("That file has no rows. Download the database first and fill it in.");
      return;
    }
    setFileName(file.name);
    setTable(parsed);
    setColumnMap(mapColumns(parsed.headers));
  };

  const diff = useMemo(
    () => (table ? diffImport({ body: table.body, map: columnMap, retailers }) : null),
    [table, columnMap, retailers]
  );

  const missing = useMemo(
    () =>
      table
        ? RETAILER_COLUMNS.filter((column) => column.required && columnMap[column.key] == null).map(
            (column) => column.label
          )
        : [],
    [table, columnMap]
  );

  const preview = useMemo(() => {
    if (!diff) return [];
    return [
      ...diff.updates.map((update) => ({
        key: `update-${update.retailer.id}`,
        kind: "update",
        customer_id: update.retailer.customer_id,
        name: update.retailer.name,
        detail: changeLabel(update),
      })),
      ...diff.creates.map((create, index) => ({
        key: `new-${create.customer_id}-${index}`,
        kind: "new",
        customer_id: create.customer_id,
        name: create.name,
        detail: [create.shop_name, create.city, create.region].filter(Boolean).join(" · ") || "new retailer",
      })),
    ].slice(0, PREVIEW_ROWS);
  }, [diff]);

  const reset = () => {
    setTable(null);
    setFileName("");
    setColumnMap({});
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const apply = async () => {
    if (!diff || missing.length) return;
    setApplying(true);
    setError("");
    try {
      const creates = diff.creates;
      const updates = diff.updates.map(({ retailer, patch }) => ({ id: retailer.id, ...patch }));
      for (let i = 0; i < creates.length; i += 400) {
        await db.entities.Retailer.bulkCreate(creates.slice(i, i + 400));
      }
      for (let i = 0; i < updates.length; i += 400) {
        await db.entities.Retailer.bulkUpdate(updates.slice(i, i + 400));
      }
      setResult({
        created: creates.length,
        updated: updates.length,
        unchanged: diff.unchanged,
        skipped: diff.invalid.length,
      });
      reset();
      onDone?.();
    } catch (err) {
      setError(err.message || "The file could not be imported.");
    } finally {
      setApplying(false);
    }
  };

  const headers = table?.headers || [];
  const total = (diff?.creates.length || 0) + (diff?.updates.length || 0);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-lg text-primary">Upload database</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload the CSV back to create new retailers and update the existing ones. Nothing is written
        until you confirm the preview.
      </p>

      <div className="mt-3 rounded-lg border border-dashed border-border bg-secondary/40 p-3">
        <Label className="mb-2 block">Retailer file (CSV)</Label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv"
          onChange={onFile}
          className="block w-full cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
        />
        {fileName && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {int(result.created)} retailers created · {int(result.updated)} updated ·{" "}
            {int(result.unchanged)} already up to date
            {result.skipped ? ` · ${int(result.skipped)} rows skipped` : ""}.
          </span>
        </div>
      )}

      {table && diff && (
        <div className="mt-3 grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-heading text-lg text-primary">Preview</h3>
            <span className="font-mono text-xs text-muted-foreground">
              {int(diff.rows)} rows · {diff.fields.length} columns recognised
            </span>
            <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={reset}>
              <X className="w-3.5 h-3.5" /> Discard file
            </Button>
          </div>

          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                The file has no column for: {missing.join(", ")}. Export the database to get the right
                headers, then upload it again.
              </span>
            </div>
          )}

          {headers.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {RETAILER_COLUMNS.filter((column) => column.required).map((column) => (
                <div key={column.key} className="grid gap-2">
                  <Label htmlFor={`map-${column.key}`}>{column.label} column</Label>
                  <select
                    id={`map-${column.key}`}
                    value={columnMap[column.key] ?? ""}
                    onChange={(e) =>
                      setColumnMap((prev) => ({
                        ...prev,
                        [column.key]: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
                  >
                    <option value="">— not in this file —</option>
                    {headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "New retailers", value: int(diff.creates.length) },
              { label: "To update", value: int(diff.updates.length) },
              { label: "Already current", value: int(diff.unchanged) },
              { label: "Skipped rows", value: int(diff.invalid.length) },
            ].map((cell) => (
              <div key={cell.label} className="rounded-lg border border-border p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {cell.label}
                </div>
                <div className="font-mono text-sm tabular-nums">{cell.value}</div>
              </div>
            ))}
          </div>

          {preview.length > 0 && (
            <div className="ggm-scroll max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] text-xs">
                <thead className="bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-normal">Retailer</th>
                    <th className="px-3 py-2 text-left font-normal">Action</th>
                    <th className="px-3 py-2 text-left font-normal">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.key} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        <span className="block truncate">{row.name}</span>
                        <span className="text-[10px] text-muted-foreground">#{row.customer_id}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.kind === "new"
                              ? "rounded bg-success/15 px-1.5 py-0.5 text-[10px] uppercase text-success"
                              : "rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary"
                          }
                        >
                          {row.kind === "new" ? "New" : "Update"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.length < total && (
            <p className="text-[11px] text-muted-foreground">
              Showing the first {int(preview.length)} of {int(total)} changes.
            </p>
          )}

          {diff.invalid.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Skipped: {diff.invalid.slice(0, 6).map((row) => `line ${row.line} (${row.reason})`).join(", ")}
              {diff.invalid.length > 6 ? "…" : ""}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button onClick={apply} disabled={applying || !total || missing.length > 0}>
              {applying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import {int(total)} retailers
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}