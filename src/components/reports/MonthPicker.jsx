import React from "react";
import moment from "moment";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MonthPicker({ month, onChange, className = "" }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous month"
        onClick={() => onChange(month.clone().subtract(1, "month"))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="min-w-[8.5rem] text-center font-heading text-lg capitalize text-primary">
        {month.format("MMMM YYYY")}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next month"
        onClick={() => onChange(month.clone().add(1, "month"))}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      {!month.isSame(moment(), "month") && (
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => onChange(moment())}>
          <RotateCcw className="w-3.5 h-3.5" /> Today
        </Button>
      )}
    </div>
  );
}