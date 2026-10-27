import React from "react";
import { MessageCircle, Phone, MapPin, Mail, StickyNote } from "lucide-react";
import { fmtDateTime } from "@/lib/retailers";

const ICONS = {
  whatsapp: MessageCircle,
  call: Phone,
  visit: MapPin,
  email: Mail,
  note: StickyNote,
};

const LABELS = {
  whatsapp: "WhatsApp",
  call: "Phone call",
  visit: "Visit",
  email: "Email",
  note: "Note",
};

export default function RetailerTimeline({ interactions = [] }) {
  if (!interactions.length) {
    return (
      <p className="py-3 text-sm text-muted-foreground">
        No interactions yet. Use “Log interaction” to record the first contact.
      </p>
    );
  }

  return (
    <ol className="relative ml-2 space-y-5 border-l border-border pl-6">
      {interactions.map((item) => {
        const Icon = ICONS[item.type] || StickyNote;
        return (
          <li key={item.id} className="relative">
            <span className="absolute -left-[34px] top-0 grid h-5 w-5 place-items-center rounded-full border border-border bg-card">
              <Icon className="w-3 h-3 text-primary" />
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-primary">
                {LABELS[item.type] || "Interaction"}
              </span>
              <span>{fmtDateTime(item.occurred_at || item.created_date)}</span>
              {item.staff_name ? <span>· {item.staff_name}</span> : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{item.summary}</p>
          </li>
        );
      })}
    </ol>
  );
}