import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { gapRows } from "@/lib/activity";
import { eur, fmtDay, int, isActive } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "both", label: "Not visited & not followed up" },
  { key: "followup", label: "No follow-up" },
  { key: "visit", label: "Never visited" },
];

const EXPORT_COLUMNS = [
  { key: "customer_id", label: "Customer ID" },
  { key: "name", label: "Retailer" },
  { key: "shop_name", label: "Shop" },
  { key: "city", label: "City" },
  { key: "province_code", label: "Province" },
  { key: "region", label: "Region" },
  { key: "mobile", label: "Mobile" },
  { key: "balance", label: "Balance" },
  { key: "is_active", label: "Active" },
  { key: "last_contact", label: "Last contact" },
  { key: "last_visit", label: "Last completed visit" },
  { key: "reasons", label: "Reasons" },
];

const STEP = 50;

export default function GapReport({ retailers, lastContacts, lastVisits, loading }) {
  const [filter, setFilter] = useState("both");
  const [limit, setLimit] = useState(STEP);

  const all = useMemo(
    () => gapRows({ retailers, lastContacts, lastVisits, filter: "all" }),
    [retailers, lastContacts, lastVisits]
  );

  const counts = useMemo(
    () => ({
      both: all.filter((row) => row.noFollowUp && row.noVisit).length,
      followup: all.filter((row) => row.noFollowUp).length,
      visit: all.filter((row) => row.noVisit).length,
    }),
    [all]
  );

  const rows = useMemo(() => {
    if (filter === "both") return all.filter((row) => row.noFollowUp && row.noVisit);
    if (filter === "followup") return all.filter((row) => row.noFollowUp);
    return all.filter((row) => row.noVisit);
  }, [all, filter]);

  const shown = rows.slice(0, limit);

  const exportCsv = () => {
    const data = rows.map((row) => ({
      ...row.retailer,
      is_active: row.retailer.is_active ? "yes" : "no",
      last_contact: row.info.last ? row.info.last.format("YYYY-MM-DD") : "never",
      last_visit: row.lastVisit ? row.lastVisit.format("YYYY-MM-DD") : "never",
      reasons: row.reasons.join(" · "),
    }));
    downloadCsv(`ggm-follow-up-gaps-${filter}.csv`, toCsv(EXPORT_COLUMNS, data));
  };

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="font-heading text-lg text-primary">Retailers to track</h2>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={exportCsv}
          disabled={!rows.length}
        >
          <Download className="w-3.5 h-3.5" /> Export list
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setFilter(item.key);
              setLimit(STEP);
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs transition-colors",
              filter === item.key
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            <span className="ml-1.5 font-mono">{int(counts[item.key])}</span>
          </button>
        ))}
      </div>

      {loading && !all.length ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : shown.length ? (
        <>
          <div className="ggm-scroll overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-normal">Retailer</th>
                  <th className="px-3 py-2 text-left font-normal">Where</th>
                  <th className="px-3 py-2 text-right font-normal">Balance</th>
                  <th className="px-3 py-2 text-left font-normal">Last contact</th>
                  <th className="px-3 py-2 text-left font-normal">Last visit</th>
                  <th className="px-4 py-2 text-left font-normal">Why</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.retailer.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        to={`/retailers/${row.retailer.id}`}
                        className="flex items-center gap-2 hover:text-primary"
                      >
                        <span className={cn("dot shrink-0", isActive(row.retailer) ? "g" : "r")} />
                        <span className="min-w-0">
                          <span className="block truncate">{row.retailer.name}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            #{row.retailer.customer_id}
                            {row.retailer.shop_name ? ` · ${row.retailer.shop_name}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.retailer.city || "—"}
                      {row.retailer.region ? ` · ${row.retailer.region}` : ""}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-primary">
                      {eur(row.retailer.balance)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.info.last ? (
                        <span className="text-muted-foreground">
                          {fmtDay(row.info.last)} · {row.info.last.fromNow()}
                        </span>
                      ) : (
                        <span className="text-destructive">never contacted</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.lastVisit ? (
                        <span className="text-muted-foreground">{fmtDay(row.lastVisit)}</span>
                      ) : (
                        <span className="text-destructive">never visited</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className="flex flex-wrap gap-1">
                        {row.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive"
                          >
                            {reason}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > shown.length && (
            <div className="border-t border-border px-4 py-3">
              <Button variant="outline" size="sm" onClick={() => setLimit(limit + STEP)}>
                Show {Math.min(STEP, rows.length - shown.length)} more
              </Button>
              <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                {int(shown.length)} of {int(rows.length)}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing to track here — every retailer in this list has been visited and followed up.
        </p>
      )}
    </section>
  );
}