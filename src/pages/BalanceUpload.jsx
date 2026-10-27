import { db } from "@/api/supabaseClient";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { eur, fetchAllRetailers, int } from "@/lib/retailers";
import { guessColumns, parseAmount, parseCsv } from "@/lib/csv";

export default function BalanceUpload() {
  const fileRef = useRef(null);
  const [retailers, setRetailers] = useState([]);
  const [table, setTable] = useState(null);
  const [fileName, setFileName] = useState("");
  const [idCol, setIdCol] = useState(0);
  const [amountCol, setAmountCol] = useState(1);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchAllRetailers().then(setRetailers);
  }, []);

  const preview = useMemo(() => {
    if (!table || !retailers.length) return null;
    const byId = new Map(retailers.map((r) => [Number(r.customer_id), r]));
    const changes = [];
    const unmatched = [];
    let unchanged = 0;

    table.body.forEach((cells) => {
      const id = Number(String(cells[idCol] ?? "").replace(/[^0-9-]/g, ""));
      const value = parseAmount(cells[amountCol]);
      if (!Number.isFinite(id) || !Number.isFinite(value)) {
        unmatched.push(cells.join(" ").trim());
        return;
      }
      const retailer = byId.get(id);
      if (!retailer) {
        unmatched.push(String(cells[idCol] ?? "").trim());
        return;
      }
      const before = Number(retailer.balance) || 0;
      if (Math.abs(before - value) < 0.005) {
        unchanged += 1;
        return;
      }
      changes.push({ retailer, before, after: value });
    });

    return {
      changes,
      unmatched,
      unchanged,
      rows: table.body.length,
      before: changes.reduce((s, c) => s + c.before, 0),
      after: changes.reduce((s, c) => s + c.after, 0),
    };
  }, [table, retailers, idCol, amountCol]);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.body.length) {
      setError("That file has no rows. Export the balances as CSV and try again.");
      setTable(null);
      return;
    }
    const guess = guessColumns(parsed.headers);
    setIdCol(guess.idCol);
    setAmountCol(guess.amountCol);
    setFileName(file.name);
    setTable(parsed);
  };

  const apply = async () => {
    if (!preview?.changes.length) return;
    setApplying(true);
    setError("");
    try {
      const stamp = new Date().toISOString();
      const payload = preview.changes.map((change) => ({
        id: change.retailer.id,
        balance: change.after,
        is_active: change.after > 0,
        balance_updated_at: stamp,
      }));
      for (let i = 0; i < payload.length; i += 400) {
        await db.entities.Retailer.bulkUpdate(payload.slice(i, i + 400));
      }
      setResult({
        count: payload.length,
        before: preview.before,
        after: preview.after,
        unmatched: preview.unmatched.length,
      });
      setTable(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      setRetailers(await fetchAllRetailers());
    } catch (err) {
      setError(err.message || "The balances could not be updated.");
    } finally {
      setApplying(false);
    }
  };

  const headers = table?.headers || [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-10">
      <h1 className="font-heading text-3xl text-primary">Balance update</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload the balance export from your system as a CSV file with the customer ID and the new
        balance. Nothing is written until you confirm the preview.
      </p>

      <div className="mt-4 grid gap-4">
        <div className="rounded-xl border border-dashed border-border bg-card p-4">
          <Label className="mb-2 block">Balance file (CSV)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={onFile}
            className="block w-full cursor-pointer rounded-lg border border-border bg-secondary px-3 py-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />
          {fileName && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="mr-1.5 inline w-4 h-4" />
            {int(result.count)} balances updated ({eur(result.before)} → {eur(result.after)})
            {result.unmatched ? ` · ${int(result.unmatched)} rows ignored` : ""}.
          </div>
        )}

        {table && (
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-xl text-primary">Preview</h2>
              <span className="font-mono text-xs text-muted-foreground">
                {int(table.body.length)} rows · {int(retailers.length)} retailers loaded
              </span>
            </div>

            {headers.length > 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="id-col">Customer ID column</Label>
                  <select
                    id="id-col"
                    value={idCol}
                    onChange={(e) => setIdCol(Number(e.target.value))}
                    className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
                  >
                    {headers.map((h, i) => (
                      <option key={`${h}-${i}`} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount-col">Balance column</Label>
                  <select
                    id="amount-col"
                    value={amountCol}
                    onChange={(e) => setAmountCol(Number(e.target.value))}
                    className="h-10 rounded-lg border border-border bg-secondary px-2 text-sm"
                  >
                    {headers.map((h, i) => (
                      <option key={`${h}-${i}`} value={i}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "To update", value: int(preview.changes.length) },
                    { label: "Already current", value: int(preview.unchanged) },
                    { label: "Not matched", value: int(preview.unmatched.length) },
                    { label: "New total", value: eur(preview.after) },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-lg border border-border p-3">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {cell.label}
                      </div>
                      <div className="font-mono text-sm tabular-nums">{cell.value}</div>
                    </div>
                  ))}
                </div>

                {preview.changes.length > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-border ggm-scroll">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Retailer</th>
                          <th className="px-3 py-2 text-right">Current</th>
                          <th className="px-3 py-2 text-right">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.changes.slice(0, 40).map((change) => (
                          <tr key={change.retailer.id} className="border-t border-border/60">
                            <td className="px-3 py-2">
                              <span className="block truncate">{change.retailer.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                #{change.retailer.customer_id} · {change.retailer.city}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {eur(change.before)}
                            </td>
                            <td
                              className={`px-3 py-2 text-right font-mono ${change.after > 0 ? "text-success" : "text-destructive"}`}
                            >
                              {eur(change.after)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {preview.unmatched.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ignored rows: {preview.unmatched.slice(0, 8).join(", ")}
                    {preview.unmatched.length > 8 ? "…" : ""}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTable(null);
                      setFileName("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Discard file
                  </Button>
                  <Button onClick={apply} disabled={applying || !preview.changes.length}>
                    {applying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Update {int(preview.changes.length)} balances
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}