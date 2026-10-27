import moment from "moment";
import { ITALY_REGIONS } from "@/lib/italy";
import { parseAmount } from "@/lib/csv";

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const LOCATION_BASIS = ["address", "street", "area", "city"];

/* The retailer database columns, used to write the file out and to read it back in. */
export const RETAILER_COLUMNS = [
  { key: "customer_id", label: "customer_id", type: "number", required: true, aliases: ["customer id", "customer", "cliente", "codice cliente", "codice", "code", "id"] },
  { key: "name", label: "name", type: "text", required: true, aliases: ["name", "nome", "ragione sociale", "denominazione", "retailer"] },
  { key: "shop_name", label: "shop_name", type: "text", aliases: ["shop name", "shop", "insegna", "negozio", "store", "punto vendita"] },
  { key: "address", label: "address", type: "text", aliases: ["address", "indirizzo", "via", "street"] },
  { key: "postcode", label: "postcode", type: "text", aliases: ["postcode", "cap", "zip", "postal code"] },
  { key: "city", label: "city", type: "text", aliases: ["city", "citta", "comune", "localita", "town", "locality"] },
  { key: "province", label: "province", type: "text", aliases: ["province", "provincia"] },
  { key: "province_code", label: "province_code", type: "text", aliases: ["province code", "sigla", "codice provincia", "prov"] },
  { key: "region", label: "region", type: "text", aliases: ["region", "regione"] },
  { key: "mobile", label: "mobile", type: "text", aliases: ["mobile", "cellulare", "telefono", "phone", "tel"] },
  { key: "balance", label: "balance", type: "number", aliases: ["balance", "saldo", "importo", "amount", "valore"] },
  { key: "is_active", label: "is_active", type: "boolean", aliases: ["is active", "active", "attivo", "stato", "status"] },
  { key: "lat", label: "lat", type: "number", aliases: ["lat", "latitude", "latitudine"] },
  { key: "lng", label: "lng", type: "number", aliases: ["lng", "lon", "long", "longitude", "longitudine"] },
  { key: "location_basis", label: "location_basis", type: "text", aliases: ["location basis", "precisione", "accuratezza"] },
  { key: "balance_updated_at", label: "balance_updated_at", type: "date", aliases: ["balance updated at", "saldo aggiornato", "aggiornato il"] },
];

/* The rows of the export, keyed by column key so the very same file can be re-imported. */
export function retailerRows(retailers = []) {
  return retailers.map((retailer) =>
    RETAILER_COLUMNS.reduce((row, column) => {
      let value = retailer[column.key];
      if (column.type === "boolean") value = value ? "1" : "0";
      row[column.key] = value == null ? "" : value;
      return row;
    }, {})
  );
}

/* Matches the file's headers to the database columns: exact names first, then partial. */
export function mapColumns(headers = []) {
  const normalized = headers.map(normalize);
  const used = new Set();
  const map = {};

  RETAILER_COLUMNS.forEach((column) => {
    const index = normalized.findIndex(
      (header, i) => !used.has(i) && header && column.aliases.some((a) => normalize(a) === header)
    );
    if (index > -1) {
      map[column.key] = index;
      used.add(index);
    }
  });

  RETAILER_COLUMNS.forEach((column) => {
    if (map[column.key] != null) return;
    const index = normalized.findIndex(
      (header, i) => !used.has(i) && header && column.aliases.some((a) => header.includes(normalize(a)))
    );
    if (index > -1) {
      map[column.key] = index;
      used.add(index);
    }
  });

  return map;
}

const isTruthy = (value) => /^(1|true|yes|y|si|attivo|active|ok|x)$/i.test(String(value).trim());
const isFalsy = (value) => /^(0|false|no|n|non attivo|inactive|chiuso)$/i.test(String(value).trim());

/* Turns one CSV line into a retailer record. */
export function buildRow(cells, map) {
  const raw = (key) => (map[key] == null ? "" : String(cells[map[key]] ?? "").trim());
  const row = {};
  const issues = [];

  const id = Number(raw("customer_id").replace(/[^0-9-]/g, ""));
  if (!Number.isFinite(id) || id === 0) issues.push("missing customer ID");
  else row.customer_id = id;

  const name = raw("name");
  if (!name) issues.push("missing retailer name");
  else row.name = name;

  ["shop_name", "address", "postcode", "city", "mobile", "province", "province_code"].forEach((key) => {
    const value = raw(key);
    if (value) row[key] = value;
  });

  const region = raw("region");
  if (region) {
    const match = ITALY_REGIONS.find(
      (candidate) =>
        normalize(candidate) === normalize(region) || normalize(candidate).startsWith(normalize(region))
    );
    row.region = match || region;
  }

  const basis = raw("location_basis").toLowerCase();
  if (LOCATION_BASIS.includes(basis)) row.location_basis = basis;

  ["lat", "lng"].forEach((key) => {
    const value = raw(key);
    if (!value) return;
    const number = Number(value.replace(",", "."));
    if (Number.isFinite(number)) row[key] = number;
  });

  const balance = raw("balance");
  if (balance) {
    const number = parseAmount(balance);
    if (Number.isFinite(number)) row.balance = number;
  }

  const active = raw("is_active");
  if (active && isTruthy(active)) row.is_active = true;
  else if (active && isFalsy(active)) row.is_active = false;

  const stamp = raw("balance_updated_at");
  if (stamp) {
    const parsed = moment(stamp, [moment.ISO_8601, "DD/MM/YYYY", "DD-MM-YYYY", "YYYY-MM-DD"], true);
    if (parsed.isValid()) row.balance_updated_at = parsed.toISOString();
  }

  return { row, issues };
}

const sameText = (a, b) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

const sameValue = (column, next, current) => {
  if (column.type === "number") return Math.abs((Number(next) || 0) - (Number(current) || 0)) < 0.005;
  if (column.type === "boolean") return Boolean(next) === Boolean(current);
  if (column.type === "date") {
    const a = moment(next);
    const b = moment(current);
    return a.isValid() && b.isValid() ? a.valueOf() === b.valueOf() : sameText(next, current);
  }
  return sameText(next, current);
};

/* Compares the uploaded file with the database: creations, updates and skipped rows. */
export function diffImport({ body = [], map = {}, retailers = [] }) {
  const byId = new Map(retailers.map((retailer) => [Number(retailer.customer_id), retailer]));
  const queued = new Set();
  const creates = [];
  const updates = [];
  const invalid = [];
  let unchanged = 0;

  body.forEach((cells, index) => {
    const line = index + 2;
    const { row, issues } = buildRow(cells, map);
    if (issues.length) {
      invalid.push({ line, reason: issues.join(", ") });
      return;
    }

    const existing = byId.get(row.customer_id);
    if (!existing) {
      if (queued.has(row.customer_id)) {
        invalid.push({ line, reason: `customer ID ${row.customer_id} repeated in the file` });
        return;
      }
      queued.add(row.customer_id);
      creates.push({
        ...row,
        is_active: row.is_active ?? (Number(row.balance) || 0) > 0,
        balance_updated_at: row.balance_updated_at || new Date().toISOString(),
      });
      return;
    }

    const patch = {};
    RETAILER_COLUMNS.forEach((column) => {
      if (row[column.key] === undefined) return;
      if (sameValue(column, row[column.key], existing[column.key])) return;
      patch[column.key] = row[column.key];
    });

    if (patch.balance !== undefined) {
      patch.balance_updated_at = new Date().toISOString();
      if (row.is_active === undefined) patch.is_active = patch.balance > 0;
    }

    if (!Object.keys(patch).length) {
      unchanged += 1;
      return;
    }

    updates.push({ retailer: existing, patch });
  });

  return {
    creates,
    updates,
    invalid,
    unchanged,
    rows: body.length,
    fields: RETAILER_COLUMNS.filter((column) => map[column.key] != null).map((c) => c.label),
  };
}