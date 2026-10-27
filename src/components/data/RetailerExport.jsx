import React from "react";
import { Database, Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { eur, int, isActive } from "@/lib/retailers";
import { RETAILER_COLUMNS, retailerRows } from "@/lib/retailerCsv";

export default function RetailerExport({ retailers = [], onReload }) {
  const active = retailers.filter(isActive).length;
  const balance = retailers.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);

  const download = () =>
    downloadCsv(
      `ggm-retailers-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(RETAILER_COLUMNS, retailerRows(retailers))
    );

  const template = () => downloadCsv("ggm-retailers-template.csv", toCsv(RETAILER_COLUMNS, []));

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-lg text-primary">Download database</h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        The complete retailer list as a CSV, ready for Excel. Upload the same file back to update it.
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: "Retailers", value: int(retailers.length) },
          { label: "Active", value: int(active) },
        ].map((cell) => (
          <div key={cell.label} className="rounded-lg border border-border p-3">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {cell.label}
            </dt>
            <dd className="font-mono text-sm tabular-nums">{cell.value}</dd>
          </div>
        ))}
        <div className="col-span-2 rounded-lg border border-border p-3">
          <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Total balance
          </dt>
          <dd className="font-mono text-sm tabular-nums text-primary">{eur(balance)}</dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-2">
        <Button onClick={download} disabled={!retailers.length}>
          <Download className="w-4 h-4 mr-2" /> Download {int(retailers.length)} retailers
        </Button>
        <Button variant="outline" onClick={template}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Empty template
        </Button>
        <Button variant="ghost" size="sm" className="gap-2" onClick={onReload}>
          <RefreshCw className="w-3.5 h-3.5" /> Reload from database
        </Button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Columns: customer_id, name, shop_name, address, postcode, city, province, province_code,
        region, mobile, balance, is_active, lat, lng, location_basis, balance_updated_at.
      </p>
    </section>
  );
}