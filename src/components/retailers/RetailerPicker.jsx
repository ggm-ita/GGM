import React, { useEffect, useMemo, useState } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fetchAllRetailers, eur, isActive } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function RetailerPicker({ value, onChange }) {
  const [retailers, setRetailers] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    fetchAllRetailers().then((list) => {
      if (alive) setRetailers(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (!retailers) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return retailers.slice(0, 6);
    return retailers
      .filter((r) =>
        [r.name, r.shop_name, r.city, r.customer_id]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      )
      .slice(0, 8);
  }, [retailers, q]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{value.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {value.city} · {isActive(value) ? "Active" : "Inactive"} · {eur(value.balance)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 text-muted-foreground hover:text-primary"
          aria-label="Change retailer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a retailer by name, city or ID"
          className="pl-9"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border ggm-scroll">
        {!retailers ? (
          <div className="grid place-items-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        ) : results.length ? (
          results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left last:border-b-0 hover:bg-secondary"
            >
              <span className={cn("dot", isActive(r) ? "g" : "r")} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{r.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {r.shop_name ? `${r.shop_name} · ` : ""}
                  {r.city} · #{r.customer_id}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">No retailer matches that search.</p>
        )}
      </div>
    </div>
  );
}