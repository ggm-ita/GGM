import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import FilterControls from "@/components/dashboard/FilterControls";
import KpiCards from "@/components/dashboard/KpiCards";
import BalanceAnalysis from "@/components/dashboard/BalanceAnalysis";
import CityRanking from "@/components/dashboard/CityRanking";
import DensityRanking from "@/components/dashboard/DensityRanking";
import FollowUpAnalysis from "@/components/dashboard/FollowUpAnalysis";
import RegionReport from "@/components/dashboard/RegionReport";
import {
  cityStats,
  fetchAllRetailers,
  fetchLastContacts,
  int,
  isActive,
  matchesQuery,
  stats as buildStats,
} from "@/lib/retailers";

export default function Dashboard() {
  const [retailers, setRetailers] = useState([]);
  const [lastContacts, setLastContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("");

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

  const statusScoped = useMemo(
    () =>
      retailers.filter((r) => {
        if (status === "active" && !isActive(r)) return false;
        if (status === "inactive" && isActive(r)) return false;
        return matchesQuery(r, q);
      }),
    [retailers, status, q]
  );

  const filtered = useMemo(
    () => statusScoped.filter((r) => !city || r.city === city),
    [statusScoped, city]
  );

  const rankingCities = useMemo(() => cityStats(statusScoped), [statusScoped]);

  const kpis = useMemo(() => buildStats(filtered), [filtered]);
  const regions = useMemo(
    () => new Set(filtered.map((r) => r.region).filter(Boolean)).size,
    [filtered]
  );
  const cities = useMemo(
    () => new Set(filtered.map((r) => r.city).filter(Boolean)).size,
    [filtered]
  );

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
    <div className="space-y-4 p-3 lg:p-6">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <h1 className="font-heading text-3xl text-primary">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          {asOf} · {int(retailers.length)} retailers in your territory
        </p>
        <p className="ml-auto font-mono text-xs text-muted-foreground">
          {int(kpis.total)} shown · {kpis.rate.toFixed(1)}% active
        </p>
      </header>

      <FilterControls
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        city={city}
        setCity={setCity}
        cities={allCities}
        showSort={false}
        className="rounded-xl border border-border bg-card"
      />

      <KpiCards stats={kpis} regions={regions} cities={cities} />

      <div className="grid gap-4 xl:grid-cols-3">
        <BalanceAnalysis retailers={filtered} className="xl:col-span-2" />
        <section className="rounded-xl border border-border bg-card">
          <CityRanking cities={rankingCities} activeCity={city} onCity={setCity} plain />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DensityRanking retailers={filtered} />
        <FollowUpAnalysis retailers={filtered} lastContacts={lastContacts} />
      </div>

      <RegionReport retailers={filtered} />
    </div>
  );
}