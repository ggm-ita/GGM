import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STATUSES = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export default function FilterControls({
  q,
  setQ,
  status,
  setStatus,
  city,
  setCity,
  sort,
  setSort,
  cities,
  showSort = true,
  actions = null,
  className = "",
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 p-3", className)}>
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, shop, city, mobile, ID"
          className="pl-9 h-10 bg-secondary border-border"
        />
      </div>

      <div className="flex shrink-0 overflow-hidden rounded-lg border border-border">
        {STATUSES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setStatus(item.key)}
            aria-pressed={status === item.key}
            className={cn(
              "h-10 px-4 text-xs font-medium border-r border-border last:border-r-0 transition-colors",
              status === item.key
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <select
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="h-10 min-w-[150px] shrink-0 rounded-lg border border-border bg-secondary px-2 text-xs"
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.city} value={c.city}>
            {c.city} ({c.total})
          </option>
        ))}
      </select>

      {showSort && (
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 min-w-[140px] shrink-0 rounded-lg border border-border bg-secondary px-2 text-xs"
        >
          <option value="balance">Sort: balance</option>
          <option value="name">Sort: name</option>
          <option value="city">Sort: city</option>
        </select>
      )}

      {actions}
    </div>
  );
}