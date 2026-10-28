import { db } from "@/api/supabaseClient";

/* Closes the visit a retailer already has planned — or logs a fresh completed
   one when nothing was scheduled — so the shop leaves the Upcoming list. The
   caller is responsible for adding the matching interaction to the timeline. */
export async function completeVisit({ visit, retailer, user, outcome }) {
  const stamp = new Date().toISOString();
  const report = String(outcome || "").trim();
  const completed = { status: "completed", outcome: report, completed_at: stamp };

  if (visit?.id) {
    await db.entities.Visit.update(visit.id, completed);
    return;
  }

  const retailerId = retailer?.id || visit?.retailer_id;
  const planned = retailerId
    ? await db.entities.Visit.filter(
        { retailer_id: retailerId, status: "scheduled" },
        { sort: "scheduled_date", limit: 1 }
      )
    : null;
  const existing = planned?.items?.[0];

  if (existing) {
    await db.entities.Visit.update(existing.id, completed);
  } else if (retailerId) {
    await db.entities.Visit.create({
      retailer_id: retailerId,
      retailer_name: retailer?.name || visit?.retailer_name,
      customer_id: retailer?.customer_id || visit?.customer_id,
      city: retailer?.city || visit?.city,
      region: retailer?.region || visit?.region,
      scheduled_date: stamp.slice(0, 10),
      scheduled_time: stamp.slice(11, 16),
      status: "completed",
      assigned_to: user?.email || "",
      assigned_to_name: user?.full_name || user?.email || "",
      outcome: report,
      completed_at: stamp,
    });
  }
}
