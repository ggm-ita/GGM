import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import RetailerExport from "@/components/data/RetailerExport";
import RetailerImport from "@/components/data/RetailerImport";
import BalanceImport from "@/components/data/BalanceImport";
import { fetchAllRetailers } from "@/lib/retailers";

export default function RetailerData() {
  const [retailers, setRetailers] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchAllRetailers()
      .then((list) => {
        setRetailers(list);
        setError("");
      })
      .catch(() => setError("The retailer database could not be loaded."));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-10">
      <header>
        <h1 className="font-heading text-3xl text-primary">Data Management</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Download the whole retailer database as a CSV, work on it in Excel, then upload it back.
          New shops are created and the existing ones — balances, contacts, addresses and locations —
          are updated from the file. You can also upload a balance-only file to refresh balances.
        </p>
      </header>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!retailers ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
          <RetailerExport retailers={retailers} onReload={load} />
          <div className="grid gap-4">
            <RetailerImport retailers={retailers} onDone={load} />
            <BalanceImport retailers={retailers} onReload={load} />
          </div>
        </div>
      )}
    </div>
  );
}
