import { db } from "@/api/supabaseClient";

import moment from "moment";

export const eur = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export const int = (n) => new Intl.NumberFormat("it-IT").format(Number(n) || 0);

export const isActive = (r) => Number(r?.balance) > 0;

export const waLink = (mobile, text) => {
  const digits = String(mobile || "").replace(/[^0-9]/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

export const telLink = (mobile) => {
  const digits = String(mobile || "").replace(/[^0-9+]/g, "");
  return digits ? `tel:${digits}` : "";
};

export const fmtDay = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");
export const fmtDateTime = (d) => (d ? moment(d).format("DD MMM YYYY · HH:mm") : "—");
export const fromNow = (d) => (d ? moment(d).fromNow() : "never");

/* Every retailer the signed-in user is allowed to see (RLS already applies the region scope). */
export async function fetchAllRetailers() {
  const out = [];
  let cursor = null;
  for (let i = 0; i < 30; i += 1) {
    const page = await db.entities.Retailer.filter(
      {},
      { sort: "customer_id", limit: 500, cursor }
    );
    out.push(...page.items);
    if (!page.has_more) break;
    cursor = page.next_cursor;
  }
  return out;
}

/* Last contact per retailer, so the dashboard can flag retailers nobody has reached out to. */
export async function fetchLastContacts() {
  const map = {};
  try {
    const res = await db.entities.Interaction.aggregate({
      query: {},
      groupBy: "retailer_id",
      max: ["occurred_at"],
    });
    (res?.rows || []).forEach((row) => {
      const key = Object.keys(row).find((k) => k.startsWith("max"));
      map[row.retailer_id] = { date: key ? row[key] : null, count: row.count || 0 };
    });
  } catch {
    return map;
  }
  return map;
}

export function cityStats(retailers) {
  const map = new Map();
  retailers.forEach((r) => {
    const cur = map.get(r.city) || { city: r.city, total: 0, active: 0, balance: 0 };
    cur.total += 1;
    if (isActive(r)) cur.active += 1;
    cur.balance += Number(r.balance) || 0;
    map.set(r.city, cur);
  });
  return [...map.values()].sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
}

/* Aggregate retailers by any field (region, province, city…). */
export function groupStats(retailers, key) {
  const map = new Map();
  retailers.forEach((r) => {
    const label = String(r[key] || "").trim() || "Not set";
    const cur = map.get(label) || { label, total: 0, active: 0, balance: 0, cities: new Set() };
    cur.total += 1;
    if (isActive(r)) cur.active += 1;
    cur.balance += Number(r.balance) || 0;
    if (r.city) cur.cities.add(r.city);
    map.set(label, cur);
  });
  return [...map.values()]
    .map((row) => ({
      label: row.label,
      total: row.total,
      active: row.active,
      inactive: row.total - row.active,
      rate: row.total ? (row.active / row.total) * 100 : 0,
      balance: row.balance,
      avg: row.total ? row.balance / row.total : 0,
      cities: row.cities.size,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export const BALANCE_BANDS = [
  { label: "No balance", test: (b) => b <= 0 },
  { label: "Up to 500", test: (b) => b > 0 && b <= 500 },
  { label: "500 to 2,000", test: (b) => b > 500 && b <= 2000 },
  { label: "Over 2,000", test: (b) => b > 2000 },
];

export const balanceBands = (retailers) =>
  BALANCE_BANDS.map((band) => ({
    label: band.label,
    count: retailers.filter((r) => band.test(Number(r.balance) || 0)).length,
  }));

export function stats(retailers) {
  const total = retailers.length;
  const active = retailers.filter(isActive).length;
  return {
    total,
    active,
    inactive: total - active,
    rate: total ? (active / total) * 100 : 0,
    balance: retailers.reduce((s, r) => s + (Number(r.balance) || 0), 0),
  };
}

export function matchesQuery(r, q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [r.name, r.shop_name, r.city, r.mobile, r.address, r.customer_id]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(needle));
}