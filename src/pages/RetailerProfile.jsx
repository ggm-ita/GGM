import { db } from "@/api/supabaseClient";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import RetailerMap from "@/components/map/RetailerMap";
import StatusPill from "@/components/retailers/StatusPill";
import RetailerTimeline from "@/components/retailers/RetailerTimeline";
import InteractionDialog from "@/components/retailers/InteractionDialog";
import VisitFormDialog from "@/components/visits/VisitFormDialog";
import MarkVisitedDialog from "@/components/visits/MarkVisitedDialog";
import BalanceDialog from "@/components/retailers/BalanceDialog";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  CalendarPlus,
  CheckCircle2,
  NotebookPen,
  Navigation,
  Wallet,
  Loader2,
} from "lucide-react";
import {
  eur,
  fmtDay,
  fmtDateTime,
  fromNow,
  isActive,
  telLink,
  waLink,
} from "@/lib/retailers";

const LOCATION_LABEL = {
  address: "Mapped from the shop address",
  street: "Street level",
  area: "Postcode area",
  city: "City centre (approximate)",
};

const VISIT_STYLE = {
  scheduled: "text-primary",
  completed: "text-success",
  cancelled: "text-muted-foreground",
};

export default function RetailerProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [retailer, setRetailer] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState("");
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitedOpen, setVisitedOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [record, log, planned] = await Promise.all([
        db.entities.Retailer.get(id),
        db.entities.Interaction.filter(
          { retailer_id: id },
          { sort: "-occurred_at", limit: 50 }
        ),
        db.entities.Visit.filter({ retailer_id: id }, { sort: "-scheduled_date", limit: 25 }),
      ]);
      setRetailer(record);
      setInteractions(log.items || []);
      setVisits(planned.items || []);
    } catch {
      setMissing(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const mapRetailers = useMemo(() => (retailer ? [retailer] : []), [retailer]);

  const saved = (message) => {
    setNotice(message);
    load();
  };

  if (loading) {
    return (
      <div className="grid h-[70vh] place-items-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (missing || !retailer) {
    return (
      <div className="grid place-items-center gap-3 px-6 py-24 text-center">
        <h2 className="font-heading text-2xl text-primary">Retailer not available</h2>
        <p className="text-sm text-muted-foreground">
          This retailer does not exist, or it sits outside your assigned territory.
        </p>
        <Button asChild variant="outline">
          <Link to="/retailers">Back to retailers</Link>
        </Button>
      </div>
    );
  }

  const active = isActive(retailer);
  const nextVisit = visits.find((v) => v.status === "scheduled");
  const lastContact = interactions[0];
  const whatsapp = waLink(
    retailer.mobile,
    `Hello ${retailer.name}, this is GGM. We would like to follow up on your account.`
  );

  const facts = [
    { label: "Customer ID", value: `#${retailer.customer_id}` },
    { label: "Mobile", value: retailer.mobile || "—" },
    { label: "City", value: retailer.city || "—" },
    { label: "Postcode", value: retailer.postcode || "—" },
    { label: "Province", value: retailer.province || "—" },
    { label: "Region", value: retailer.region || "—" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 pb-10">
      <Link
        to="/retailers"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to retailers
      </Link>

      {notice && (
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-3xl leading-tight text-primary">{retailer.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {retailer.shop_name ? `${retailer.shop_name} · ` : ""}
                {retailer.city}
                {retailer.province_code ? ` (${retailer.province_code})` : ""} · #{retailer.customer_id}
              </p>
            </div>
            <StatusPill active={active} />
          </div>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-background/60 p-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Balance
              </div>
              <div
                className={`font-mono text-3xl tabular-nums ${active ? "text-success" : "text-destructive"}`}
              >
                {eur(retailer.balance)}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {retailer.balance_updated_at
                  ? `Balance updated ${fmtDateTime(retailer.balance_updated_at)}`
                  : "Balance not updated from a file yet"}
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setBalanceOpen(true)}>
                <Wallet className="w-3.5 h-3.5 mr-1.5" /> Update balance
              </Button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {fact.label}
                </div>
                <div className="truncate font-mono text-sm">{fact.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Address
            </div>
            <p className="text-sm">
              {retailer.address}
              {retailer.postcode ? `, ${retailer.postcode}` : ""} {retailer.city}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {LOCATION_LABEL[retailer.location_basis] || "Mapped location"}
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {whatsapp ? (
              <Button asChild>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp retailer
                </a>
              </Button>
            ) : (
              <Button disabled>
                <MessageCircle className="w-4 h-4 mr-2" /> No WhatsApp number
              </Button>
            )}
            {telLink(retailer.mobile) ? (
              <Button asChild variant="outline">
                <a href={telLink(retailer.mobile)}>
                  <Phone className="w-4 h-4 mr-2" /> Call {retailer.mobile}
                </a>
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Phone className="w-4 h-4 mr-2" /> No phone number
              </Button>
            )}
            <Button variant="outline" onClick={() => setVisitOpen(true)}>
              <CalendarPlus className="w-4 h-4 mr-2" /> Schedule visit
            </Button>
            <Button variant="outline" onClick={() => setVisitedOpen(true)}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as visited
            </Button>
            <Button variant="secondary" className="sm:col-span-2" onClick={() => setInteractionOpen(true)}>
              <NotebookPen className="w-4 h-4 mr-2" /> Log interaction
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 font-heading text-xl text-primary">Follow-up status</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Last contact</dt>
                <dd className="text-right font-mono text-xs">
                  {lastContact ? fromNow(lastContact.occurred_at || lastContact.created_date) : "never"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Interactions logged</dt>
                <dd className="font-mono text-xs">{interactions.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Next visit</dt>
                <dd className="text-right font-mono text-xs">
                  {nextVisit
                    ? `${fmtDay(nextVisit.scheduled_date)}${nextVisit.scheduled_time ? ` · ${nextVisit.scheduled_time}` : ""}`
                    : "not scheduled"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-heading text-xl text-primary">Location</h2>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${retailer.lat},${retailer.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" /> Directions
              </a>
            </div>
            <RetailerMap
              retailers={mapRetailers}
              focusId={retailer.id}
              compact
              autoFit={false}
              className="h-52 overflow-hidden rounded-lg border border-border"
            />
          </div>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-heading text-xl text-primary">Visits</h2>
        {visits.length ? (
          <ul className="grid gap-2">
            {visits.map((visit) => (
              <li
                key={visit.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/60 pb-2 text-sm last:border-b-0 last:pb-0"
              >
                <span className="font-mono text-xs">{fmtDay(visit.scheduled_date)}</span>
                <span className={`text-[10px] uppercase tracking-wider ${VISIT_STYLE[visit.status]}`}>
                  {visit.status}
                </span>
                {visit.assigned_to_name && (
                  <span className="text-xs text-muted-foreground">{visit.assigned_to_name}</span>
                )}
                {visit.outcome && <span className="w-full text-xs">{visit.outcome}</span>}
                {!visit.outcome && visit.notes && (
                  <span className="w-full text-xs text-muted-foreground">{visit.notes}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No visit scheduled yet. Use “Schedule visit” to plan the next call.
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 font-heading text-xl text-primary">Interaction timeline</h2>
        <RetailerTimeline interactions={interactions} />
      </section>

      <InteractionDialog
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        retailer={retailer}
        onSaved={() => saved("Interaction added to the timeline.")}
      />
      <VisitFormDialog
        open={visitOpen}
        onOpenChange={setVisitOpen}
        retailer={retailer}
        onSaved={() => saved("Visit scheduled.")}
      />
      <MarkVisitedDialog
        open={visitedOpen}
        onOpenChange={setVisitedOpen}
        retailer={retailer}
        onSaved={() => saved("Visit recorded on the timeline.")}
      />
      <BalanceDialog
        open={balanceOpen}
        onOpenChange={setBalanceOpen}
        retailer={retailer}
        onSaved={() => saved(`${retailer.name} is now active with the new balance.`)}
      />
    </div>
  );
}