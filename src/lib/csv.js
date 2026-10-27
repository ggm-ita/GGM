export function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/[^\d.,-]/g, "").trim();
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  }
  const value = Number(s);
  return Number.isFinite(value) ? value : NaN;
}

function splitRows(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.trim()) rows.push(current);
      current = "";
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      current += char;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

function splitCells(line, delimiter) {
  const cells = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/* Reads a retailer balance export: returns a header row plus the data rows. */
export function parseCsv(text) {
  const rows = splitRows(text).map((line) => line);
  if (!rows.length) return { headers: [], body: [] };
  const sample = rows[0];
  const delimiter =
    (sample.match(/;/g) || []).length > (sample.match(/,/g) || []).length ? ";" : ",";
  const table = rows.map((line) => splitCells(line, delimiter));
  const firstIsHeader = table[0].some(
    (cell) => /[a-z]/i.test(cell) && !Number.isFinite(parseAmount(cell))
  );
  if (firstIsHeader) return { headers: table[0], body: table.slice(1) };
  return { headers: table[0].map((_, i) => `Column ${i + 1}`), body: table };
}

/* Builds CSV text from columns ({key, label}) and rows of plain objects. */
export function toCsv(columns, rows) {
  const cell = (value) => {
    const text = value == null ? "" : String(value);
    /* A leading =, +, -, @ or tab makes Excel/Sheets evaluate the cell as a
       formula. Quote those with an apostrophe (invisible in both) unless the
       value is a plain number, so negative amounts stay numeric. */
    const safe =
      /^[=+\-@\t\r]/.test(text) && !/^-?\d+(?:[.,]\d+)?$/.test(text) ? `'${text}` : text;
    return /[",\r\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => cell(row[c.key])).join(","));
  return [head, ...body].join("\r\n");
}

/* Hands a CSV file to the browser as a download (BOM so Excel keeps accents). */
export function downloadCsv(filename, text) {
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function guessColumns(headers) {
  const idWords = ["customer", "cliente", "codice", "code", "cod", "id"];
  const amountWords = ["saldo", "balance", "importo", "amount", "totale", "valore"];
  const find = (words) =>
    headers.findIndex((h) =>
      words.some((w) => String(h).toLowerCase().includes(w))
    );
  const idCol = find(idWords);
  const amountCol = find(amountWords);
  return {
    idCol: idCol > -1 ? idCol : 0,
    amountCol: amountCol > -1 && amountCol !== idCol ? amountCol : idCol === 0 ? 1 : 0,
  };
}