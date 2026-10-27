export const ITALY_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
];

/* Provinces that actually hold retailers — offered when scoping staff access. */
export function provinceOptions(retailers) {
  const map = new Map();
  retailers.forEach((r) => {
    if (!r.province_code) return;
    if (!map.has(r.province_code)) {
      map.set(r.province_code, {
        code: r.province_code,
        name: r.province || r.province_code,
        region: r.region || "",
        count: 0,
      });
    }
    map.get(r.province_code).count += 1;
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const scopeLabel = (user) => {
  if (user?.role === "admin") return "All Italy · admin";
  if (user?.scope_type === "regions") {
    const list = user.regions || [];
    return list.length ? list.join(", ") : "No regions assigned";
  }
  if (user?.scope_type === "provinces") {
    const list = user.provinces || [];
    return list.length ? list.join(", ") : "No provinces assigned";
  }
  if (user?.scope_type === "all") return "All Italy";
  return "No access assigned yet";
};