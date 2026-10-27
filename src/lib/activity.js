import { db } from "@/api/supabaseClient";

import moment from "moment";

import { isActive } from "@/lib/retailers";

export const FOLLOW_UP_DAYS = 30;

export const INTERACTION_TYPES = ["whatsapp", "call", "visit", "email", "note"];

export const todayKey = () => moment().format("YYYY-MM-DD");

/* Bounded paged read, so a report never silently shows only the first page. */
async function readAll(entity, query = {}, options = {}, maxPages = 6) {
  const out = [];
  let cursor = null;
  for (let i = 0; i < maxPages; i += 1) {
    const page = await entity.filter(query, { limit: 500, cursor, ...options });
    out.push(...(page.items || []));
    if (!page.has_more) break;
    cursor = page.next_cursor;
  }
  return out;
}

export const fetchVisits = (query = {}, options = {}) =>
  readAll(db.entities.Visit, query, options);

export const fetchInteractions = (query = {}, options = {}) =>
  readAll(db.entities.Interaction, query, options);

export async function fetchStaff() {
  try {
    return (await db.entities.User.list()) || [];
  } catch {
    return [];
  }
}

/* Date of the last completed visit per retailer, used to spot shops never visited. */
export async function fetchLastVisits() {
  const map = {};
  try {
    const visits = await readAll(
      db.entities.Visit,
      { status: "completed" },
      { sort: "-completed_at" }
    );
    visits.forEach((visit) => {
      const stamp = visit.completed_at || visit.scheduled_date;
      const current = map[visit.retailer_id];
      if (stamp && (!current || String(current) < String(stamp))) map[visit.retailer_id] = stamp;
    });
  } catch {
    return map;
  }
  return map;
}

/* One month of activity: the visits planned in it and the interactions logged in it. */
export async function fetchMonthActivity(month) {
  const start = month.clone().startOf("month");
  const end = month.clone().endOf("month");
  const [visits, interactions] = await Promise.all([
    readAll(
      db.entities.Visit,
      { scheduled_date: { $gte: start.format("YYYY-MM-DD"), $lte: end.format("YYYY-MM-DD") } },
      { sort: "scheduled_date" }
    ),
    readAll(
      db.entities.Interaction,
      { occurred_at: { $gte: start.toISOString(), $lte: end.toISOString() } },
      { sort: "-occurred_at" }
    ),
  ]);
  return { visits, interactions };
}

/* When a retailer was last contacted, and when the next follow-up falls due. */
export function followUpInfo(retailer, contact) {
  const last = contact?.date ? moment(contact.date) : null;
  const count = contact?.count || 0;
  if (!last) {
    return { state: "never", last: null, days: null, due: moment().startOf("day"), count };
  }
  const days = moment().startOf("day").diff(last.clone().startOf("day"), "days");
  return {
    state: days >= FOLLOW_UP_DAYS ? "due" : "ok",
    last,
    days,
    due: last.clone().add(FOLLOW_UP_DAYS, "days").startOf("day"),
    count,
  };
}

export const isPendingFollowUp = (retailer, contact) =>
  isActive(retailer) && followUpInfo(retailer, contact).state !== "ok";

/* The month calendar: each day with its visits and the follow-ups falling due on it. */
export function monthPlan({ month, visits = [], retailers = [], lastContacts = {} }) {
  const start = month.clone().startOf("month");
  const end = month.clone().endOf("month");
  const gridStart = start.clone().subtract(start.isoWeekday() - 1, "days");
  const gridEnd = end.clone().add((7 - end.isoWeekday()) % 7, "days");
  const startKey = start.format("YYYY-MM-DD");
  const endKey = end.format("YYYY-MM-DD");
  const today = todayKey();

  const days = [];
  const cursor = gridStart.clone();
  while (cursor.isSameOrBefore(gridEnd, "day")) {
    days.push({
      key: cursor.format("YYYY-MM-DD"),
      date: cursor.clone(),
      inMonth: cursor.isSame(month, "month"),
      items: { visits: [], followUps: [] },
    });
    cursor.add(1, "day");
  }
  const byKey = new Map(days.map((day) => [day.key, day]));

  let planned = 0;
  let completed = 0;
  const overdueVisits = [];

  visits.forEach((visit) => {
    const overdue = visit.status === "scheduled" && visit.scheduled_date < today;
    if (visit.scheduled_date >= startKey && visit.scheduled_date <= endKey) {
      if (visit.status === "scheduled") planned += 1;
      if (visit.status === "completed") completed += 1;
    }
    if (overdue) overdueVisits.push({ ...visit, overdue: true });
    const day = byKey.get(visit.scheduled_date);
    if (day) day.items.visits.push({ ...visit, overdue });
  });

  const carried = [];
  let followUpsDue = 0;

  retailers
    .filter((retailer) => isActive(retailer))
    .forEach((retailer) => {
      const info = followUpInfo(retailer, lastContacts[retailer.id]);
      if (info.state === "ok") return;
      const key = info.due.format("YYYY-MM-DD");
      const day = key >= startKey && key <= endKey ? byKey.get(key) : null;
      if (day) {
        day.items.followUps.push({ retailer, info });
        followUpsDue += 1;
      } else if (key < startKey) {
        carried.push({ retailer, info });
      }
    });

  days.forEach((day) => {
    day.items.visits.sort(
      (a, b) =>
        String(a.scheduled_time || "").localeCompare(String(b.scheduled_time || "")) ||
        String(a.retailer_name || "").localeCompare(String(b.retailer_name || ""))
    );
    day.items.followUps.sort(
      (a, b) => (Number(b.retailer.balance) || 0) - (Number(a.retailer.balance) || 0)
    );
  });

  /* What is late right now, independent of the month on screen. */
  const pendingNow = overdueVisits.map((visit) => ({
    kind: "visit",
    key: visit.scheduled_date,
    item: visit,
  }));
  retailers
    .filter((retailer) => isActive(retailer))
    .forEach((retailer) => {
      const info = followUpInfo(retailer, lastContacts[retailer.id]);
      if (info.state !== "ok" && info.due.isBefore(moment(), "day")) {
        pendingNow.push({ kind: "followup", key: info.due.format("YYYY-MM-DD"), item: { retailer, info } });
      }
    });
  pendingNow.sort((a, b) => a.key.localeCompare(b.key));

  return {
    days,
    overdueVisits,
    carried,
    pendingNow,
    overview: { planned, completed, followUpsDue, overdue: overdueVisits.length },
  };
}

/* One row per staff member: visits planned and interactions logged in the period. */
export function staffRows({ users = [], visits = [], interactions = [] }) {
  const names = new Map(
    users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u.full_name || u.email])
  );
  const rows = new Map();

  const ensure = (email) => {
    const key = String(email || "").trim().toLowerCase() || "unassigned";
    if (!rows.has(key)) {
      rows.set(key, {
        key,
        email: email || "",
        name: names.get(key) || email || "Unassigned",
        planned: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        interactions: 0,
        types: INTERACTION_TYPES.reduce((acc, type) => ({ ...acc, [type]: 0 }), {}),
        retailers: new Set(),
        lastActivity: null,
        visitList: [],
        interactionList: [],
      });
    }
    return rows.get(key);
  };

  users.forEach((user) => ensure(user.email));
  const today = todayKey();

  visits.forEach((visit) => {
    const row = ensure(visit.assigned_to);
    row.planned += 1;
    if (visit.status === "completed") row.completed += 1;
    if (visit.status === "cancelled") row.cancelled += 1;
    if (visit.status === "scheduled" && visit.scheduled_date < today) row.overdue += 1;
    if (visit.retailer_id) row.retailers.add(visit.retailer_id);
    row.visitList.push(visit);
    const stamp = visit.completed_at || visit.scheduled_date;
    if (stamp && (!row.lastActivity || String(row.lastActivity) < String(stamp))) {
      row.lastActivity = stamp;
    }
  });

  interactions.forEach((interaction) => {
    const row = ensure(interaction.staff_email);
    row.interactions += 1;
    if (row.types[interaction.type] != null) row.types[interaction.type] += 1;
    if (interaction.retailer_id) row.retailers.add(interaction.retailer_id);
    row.interactionList.push(interaction);
    if (
      interaction.occurred_at &&
      (!row.lastActivity || String(row.lastActivity) < String(interaction.occurred_at))
    ) {
      row.lastActivity = interaction.occurred_at;
    }
  });

  return [...rows.values()]
    .map((row) => ({ ...row, touches: row.retailers.size, activity: row.planned + row.interactions }))
    .sort(
      (a, b) =>
        b.activity - a.activity || b.touches - a.touches || a.name.localeCompare(b.name)
    );
}

/* Retailers nobody follows up (or nobody visits), the tracking list for admins. */
export function gapRows({ retailers = [], lastContacts = {}, lastVisits = {}, filter = "both" }) {
  return retailers
    .map((retailer) => {
      const info = followUpInfo(retailer, lastContacts[retailer.id]);
      const lastVisit = lastVisits[retailer.id] ? moment(lastVisits[retailer.id]) : null;
      const noFollowUp = info.state !== "ok";
      const noVisit = !lastVisit;
      return {
        retailer,
        info,
        lastVisit,
        noFollowUp,
        noVisit,
        reasons: [
          info.state === "never" ? "Never contacted" : info.state === "due" ? `No contact in ${info.days} days` : null,
          noVisit ? "Never visited" : null,
        ].filter(Boolean),
      };
    })
    .filter((row) => {
      if (filter === "both") return row.noFollowUp && row.noVisit;
      if (filter === "followup") return row.noFollowUp;
      if (filter === "visit") return row.noVisit;
      return true;
    })
    .sort((a, b) => (Number(b.retailer.balance) || 0) - (Number(a.retailer.balance) || 0));
}