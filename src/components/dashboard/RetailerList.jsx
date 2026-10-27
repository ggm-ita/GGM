import React, { useEffect, useState } from "react";
import RetailerRow from "@/components/retailers/RetailerRow";
import { int } from "@/lib/retailers";
import { cn } from "@/lib/utils";

export default function RetailerList({
  retailers,
  lastContacts = {},
  selectedId,
  onFocus,
  className = "",
  step = 60,
}) {
  const [shown, setShown] = useState(step);

  useEffect(() => {
    setShown(step);
  }, [retailers, step]);

  if (!retailers.length) {
    return (
      <p className={cn("px-4 py-8 text-center text-sm text-muted-foreground", className)}>
        No retailers match these filters.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>{int(retailers.length)} shown</span>
        <span>Balance</span>
      </div>
      {retailers.slice(0, shown).map((r) => (
        <RetailerRow
          key={r.id}
          retailer={r}
          lastContact={lastContacts[r.id]}
          selected={r.id === selectedId}
          onFocus={onFocus}
        />
      ))}
      {retailers.length > shown && (
        <button
          type="button"
          onClick={() => setShown((s) => s + step)}
          className="w-full py-3 text-xs font-medium text-primary hover:underline"
        >
          Show {int(Math.min(step, retailers.length - shown))} more
        </button>
      )}
    </div>
  );
}