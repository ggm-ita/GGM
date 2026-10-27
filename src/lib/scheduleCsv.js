import moment from "moment";
import { downloadCsv, parseCsv, toCsv } from "@/lib/csv";

export const SCHEDULE_COLUMNS = [
  { key: "staff_email", label: "staff_email" },
  { key: "customer_id", label: "customer_id" },
  { key: "date", label: "date" },
  { key: "time", label: "time" },
  { key: "notes", label: "notes" },
];

const norm = (value) => String(value || "").trim().toLowerCase();

const findCol = (headers, words) =>
  headers.findIndex((header) => words.some((word) => norm(header).includes(word)));

function parseDate(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const parsed = moment(text, ["YYYY-MM-DD", "DD/MM/YYYY", "D/M/YYYY", "DD-MM-YYYY"], true);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

function parseTime(raw) {
  const text = String(raw || "").trim().replace(".", ":");
  if (!text) return "";
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";
  return `${String(match[1]).padStart(2, "0")}:${match[2] || "00"}`;
}

/* Example file: real staff emails and customer IDs when the app has them. */
export function downloadScheduleExample({ staff = [], retailers = [] } = {}) {
  const email = staff[0]?.email || "staff@example.com";
  const day = moment().add(1, "day").format("YYYY-MM-DD");
  const customer = (index) => retailers[index]?.customer_id ?? 1001 + index;
  const rows = [
    { staff_email: email, customer_id: customer(0), date: day, time: "09:00", notes: "Morning round" },
    {
      staff_email: staff[1]?.email || email,
      customer_id: customer(1),
      date: day,
      time: "11:30",
      notes: "Balance follow-up",
    },
  ];
  downloadCsv("ggm-schedule-example.csv", toCsv(SCHEDULE_COLUMNS, rows));
}

/* Turns an uploaded file into visit records, reporting the rows it cannot use. */
export function readSchedule(text, { staff = [], retailers = [], visits = [] } = {}) {
  const { headers, body } = parseCsv(text);
  const staffCol = findCol(headers, ["staff", "email", "agente", "user"]);
  const customerCol = findCol(headers, ["customer", "cliente", "codice"]);
  const dateCol = findCol(headers, ["date", "data", "giorno"]);
  const timeCol = findCol(headers, ["time", "ora"]);
  const notesCol = findCol(headers, ["note", "nota"]);

  if (staffCol < 0 || customerCol < 0 || dateCol < 0) {
    return {
      rows: [],
      duplicates: 0,
      errors: ["The file needs a staff email column, a customer ID column and a date column."],
    };
  }

  const staffByEmail = new Map(
    staff.filter((user) => user.email).map((user) => [norm(user.email), user])
  );
  const retailerById = new Map(retailers.map((shop) => [String(shop.customer_id), shop]));
  const seen = new Set(
    visits.map((visit) => `${visit.retailer_id}|${visit.scheduled_date}|${visit.scheduled_time || ""}`)
  );

  const rows = [];
  const errors = [];
  let duplicates = 0;

  body.forEach((cells, index) => {
    if (!cells.some((cell) => cell)) return;
    const line = index + 2;
    const email = cells[staffCol] || "";
    const user = staffByEmail.get(norm(email));
    const customer = String(cells[customerCol] || "").trim().replace(/\.0$/, "");
    const retailer = retailerById.get(customer);
    const date = parseDate(cells[dateCol]);
    const time = timeCol > -1 ? parseTime(cells[timeCol]) : "";
    const notes = notesCol > -1 ? cells[notesCol] || "" : "";

    const problems = [];
    if (!user) problems.push(`unknown staff "${email || "—"}"`);
    if (!retailer) problems.push(`customer ${customer || "—"} not found`);
    if (!date) problems.push("invalid date");
    if (problems.length) {
      errors.push(`Line ${line}: ${problems.join(", ")}.`);
      return;
    }

    const key = `${retailer.id}|${date}|${time}`;
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);

    rows.push({
      retailer_id: retailer.id,
      retailer_name: retailer.name,
      customer_id: retailer.customer_id,
      city: retailer.city,
      region: retailer.region,
      scheduled_date: date,
      scheduled_time: time,
      status: "scheduled",
      assigned_to: user.email,
      assigned_to_name: user.full_name || user.email,
      notes,
    });
  });

  return { rows, duplicates, errors };
}