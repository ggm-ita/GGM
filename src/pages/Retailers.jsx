import { db } from "@/api/supabaseClient";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RetailerRow from "@/components/retailers/RetailerRow";
import { fetchLastContacts, int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export default function Retailers() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cities, setCities] = useState([]);
  const [lastContacts, setLastContacts] = useState({});

  const buildQuery = useCallback(() => {
    const query = {};
    if (status === "active") query.is_active = true;
    if (status === "inactive") query.is_active = false;
    if (city) query.city = city;
    const term = q.trim();
    if (term) {
      const text = [{ name: { $regex: term } }, { shop_name: { $regex: term } }];
      if (/^\d{2,}$/.test(term)) {
        query.$or = [{ customer_id: Number(term) }, ...text];
      } else {
        query.$or = [
          ...text,
          { city: { $regex: term } },
          { mobile: { $regex: term } },
          { address: { $regex: term } },
        ];
      }
    }
    return query;
  }, [q, status, city]);

  useEffect(() => {
    let alive = true;
    db.entities.Retailer.list({ distinct: "city" }).then((res) => {
      if (!alive) return;
      const values = Array.isArray(res) ? res : res?.items || [];
      setCities(values.filter(Boolean).sort((a, b) => a.localeCompare(b)));
    });
    fetchLastContacts().then((map) => {
      if (alive) setLastContacts(map);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const query = buildQuery();
      const [page, count] = await Promise.all([
        db.entities.Retailer.filter(query, { sort: "customer_id", limit: 50 }),
        db.entities.Retailer.count(query),
      ]);
      if (!alive) return;
      setItems(page.items || []);
      setCursor(page.next_cursor || null);
      setHasMore(Boolean(page.has_more));
      setTotal(count || 0);
      setLoading(false);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [buildQuery]);

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await db.entities.Retailer.filter(buildQuery(), {
      sort: "customer_id",
      limit: 50,
      cursor,
    });
    setItems((prev) => [...prev, ...(page.items || [])]);
    setCursor(page.next_cursor || null);
    setHasMore(Boolean(page.has_more));
    setLoadingMore(false);
  };

  const activeCount = useMemo(() => items.filter((r) => Number(r.balance) > 0).length, [items]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-10">
      <div className="mb-4">
        <h1 className="font-heading text-3xl text-primary">Retailers</h1>
        <p className="text-sm text-muted-foreground">
          {loading ? "Searching…" : `${int(total)} retailers match · ${int(activeCount)} active on this page`}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, shop, city, mobile or customer ID"
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1 flex overflow-hidden rounded-lg border border-border">
            {STATUSES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setStatus(item.key)}
                className={cn(
                  "flex-1 py-2 text-[11px] font-medium border-r border-border last:border-r-0",
                  status === item.key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="col-span-2 h-10 rounded-lg border border-border bg-secondary px-2 text-xs"
          >
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : items.length ? (
          items.map((r) => (
            <RetailerRow key={r.id} retailer={r} lastContact={lastContacts[r.id]} />
          ))
        ) : (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No retailer matches this search.
          </p>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Load 50 more
          </Button>
        </div>
      )}
    </div>
  );
}