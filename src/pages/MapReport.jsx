import React, { useEffect, useMemo, useState } from "react";
import { Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import FilterControls from "@/components/dashboard/FilterControls";
import RetailerList from "@/components/dashboard/RetailerList";
import RetailerMap from "@/components/map/RetailerMap";
import { Button } from "@/components/ui/button";
import {
  cityStats,
  fetchAllRetailers,
  fetchLastContacts,
  isActive,
  matchesQuery,
  stats as buildStats,
} from "@/lib/retailers";

export default function MapReport() {
  const [retailers, setRetailers] = useState([]);
  const [lastContacts, setLastContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("balance");
  const [selectedId, setSelectedId] = useState(null);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [list, contacts] = await Promise.all([fetchAllRetailers(), fetchLastContacts()]);
        if (!alive) return;
        setRetailers(list);
        setLastContacts(contacts);
      } catch {
        if (alive) setUnavailable(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allCities = useMemo(() => cityStats(retailers), [retailers]);

  const filtered = useMemo(() => {
    const list = retailers.filter((r) => {
      if (status === "active" && !isActive(r)) return false;
      if (status === "inactive" && isActive(r)) return false;
      if (city && r.city !== city) return false;
      return matchesQuery(r, q);
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "city") return a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
      return (Number(b.balance) || 0) - (Number(a.balance) || 0);
    });
  }, [retailers, status, city, q, sort]);

  const kpis = useMemo(() => buildStats(filtered), [filtered]);

  const focusRetailer = (retailer) => {
    setSelectedId(retailer.id);
    if (window.innerWidth < 1024) {
      document.getElementById("ggm-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const asOf = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="grid h-[70vh] place-items-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading your retailers…
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="grid place-items-center gap-3 px-6 py-24 text-center">
        <h2 className="font-heading text-2xl text-primary">No retailers visible</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account has no territory assigned yet. Ask an administrator to set your regions or
          provinces, then reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="lg:h-dvh lg:flex lg:flex-col lg:overflow-hidden">
      <div className="hidden lg:flex items-center gap-4 border-b border-border bg-card px-4 py-3">
        <h1 className="font-heading text-2xl text-primary">Retailer map report</h1>
        <p className="text-xs text-muted-foreground">
          {asOf} · {retailers.length} retailers in your territory
        </p>
        <p className="ml-auto font-mono text-xs text-muted-foreground">
          {kpis.total} shown · {kpis.rate.toFixed(1)}% active
        </p>
      </div>

      <div className="sticky top-14 z-20 border-b border-border bg-card lg:static lg:z-auto">
        <FilterControls
          q={q}
          setQ={setQ}
          status={status}
          setStatus={setStatus}
          city={city}
          setCity={setCity}
          sort={sort}
          setSort={setSort}
          cities={allCities}
          actions={
            <Button
              variant="outline"
              onClick={() => setShowList((v) => !v)}
              className="h-10 shrink-0 gap-2"
            >
              {showList ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
              {showList ? "Hide panel" : "Show panel"}
            </Button>
          }
        />
      </div>

      <div className="lg:flex-1 lg:min-h-0 lg:flex">
        <div className="lg:flex-1 lg:min-w-0 lg:relative">
          <div id="ggm-map" className="h-[58vh] lg:absolute lg:inset-0 lg:h-auto">
            <RetailerMap
              retailers={filtered}
              selectedId={selectedId}
              focusId={selectedId}
              onSelect={(r) => setSelectedId(r.id)}
              className="h-full"
            />
          </div>

          {showList && (
            <div className="lg:hidden border-t border-border">
              <RetailerList
                retailers={filtered}
                lastContacts={lastContacts}
                selectedId={selectedId}
                onFocus={focusRetailer}
              />
            </div>
          )}
        </div>

        {showList && (
          <aside className="hidden lg:block lg:w-[380px] xl:w-[420px] shrink-0 lg:overflow-y-auto ggm-scroll border-l border-border bg-card">
            <RetailerList
              retailers={filtered}
              lastContacts={lastContacts}
              selectedId={selectedId}
              onFocus={focusRetailer}
            />
          </aside>
        )}
      </div>
    </div>
  );
}