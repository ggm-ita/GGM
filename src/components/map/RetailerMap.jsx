import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize2, Layers, Loader2 } from "lucide-react";
import { COLORS as C } from "@/lib/brand";
import { eur } from "@/lib/retailers";

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
const ATTR = "Tiles © Esri";

const BASES = [
  { key: "dark", label: "Dark" },
  { key: "sat", label: "Satellite" },
  { key: "street", label: "Streets" },
];

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

function makeBase(L, name) {
  if (name === "sat") {
    return L.layerGroup([
      L.tileLayer(`${ESRI}World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
        attribution: `${ATTR}, Maxar, Earthstar Geographics`,
        maxZoom: 19,
      }),
      L.tileLayer(`${ESRI}Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
      }),
    ]);
  }
  if (name === "street") {
    return L.layerGroup([
      L.tileLayer(`${ESRI}World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
        attribution: ATTR,
        maxZoom: 19,
      }),
    ]);
  }
  return L.layerGroup([
    L.tileLayer(`${ESRI}Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: ATTR,
      maxZoom: 19,
      maxNativeZoom: 16,
    }),
    L.tileLayer(`${ESRI}Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19,
      maxNativeZoom: 16,
    }),
  ]);
}

function pinIcon(L, active, highlight) {
  const status = active ? C.green : C.red;
  const ring = highlight ? C.goldHi : C.gold;
  const scale = highlight ? 1.15 : 1;
  return L.divIcon({
    className: "ggm-pin-wrap",
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -40],
    tooltipAnchor: [0, -38],
    html: `<svg class="ggm-pin" style="transform:scale(${scale})" width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <path d="M17 1.5c-7.5 0-13.5 5.9-13.5 13.2C3.5 26 17 42.5 17 42.5S30.5 26 30.5 14.7C30.5 7.4 24.5 1.5 17 1.5z" fill="${C.panel}" stroke="${ring}" stroke-width="2.2"/>
      <g transform="translate(17 15.5)" fill="${status}">
        <path d="M-8.4-3.6h16.8l-1.3 3.1a2.1 2.1 0 0 1-1.9 1.2h-10.4a2.1 2.1 0 0 1-1.9-1.2z"/>
        <path d="M-7 1.2h14v8.6a1.2 1.2 0 0 1-1.2 1.2h-11.6A1.2 1.2 0 0 1-7 9.8z"/>
        <path d="M-2.4 4.4h4.8v6.6h-4.8z" fill="${C.panel}"/>
      </g>
    </svg>`,
  });
}

function popupHtml(r, compact) {
  const active = Number(r.balance) > 0;
  const status = active
    ? '<span class="pill g"><i class="dot g"></i>Active</span>'
    : '<span class="pill r"><i class="dot r"></i>Inactive</span>';
  return `<div class="pp">
    <h3>${esc(r.name)}</h3>
    <div class="un">${esc(r.shop_name || "")}</div>
    ${status}
    <dl>
      <dt>Balance</dt><dd class="big">${eur(r.balance)}</dd>
      <dt>Customer ID</dt><dd>${esc(r.customer_id)}</dd>
      <dt>Address</dt><dd>${esc(r.address)}</dd>
      <dt>City</dt><dd>${esc([r.postcode, r.city].filter(Boolean).join(" "))}</dd>
      <dt>Mobile</dt><dd>${esc(r.mobile)}</dd>
    </dl>
    ${compact ? "" : `<button type="button" class="dmore" data-open-retailer="${r.id}">View full details →</button>`}
  </div>`;
}

export default function RetailerMap({
  retailers = [],
  selectedId = null,
  focusId = null,
  onSelect,
  compact = false,
  autoFit = true,
  className = "",
}) {
  const holderRef = useRef(null);
  const mapRef = useRef(null);
  const baseRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef(new Map());
  const [ready, setReady] = useState(false);
  const [base, setBase] = useState("dark");
  const [clusterOn, setClusterOn] = useState(true);
  const navigate = useNavigate();
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);

  useEffect(() => {
    onSelectRef.current = onSelect;
    selectedRef.current = selectedId;
  }, [onSelect, selectedId]);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let observer = null;
    const clickHandler = (event) => {
      const button = event.target.closest?.("[data-open-retailer]");
      if (button) navigate(`/retailers/${button.getAttribute("data-open-retailer")}`);
    };

    const boot = () => {
      if (cancelled || mapRef.current) return;
      const L = window.L;
      if (!L || !holderRef.current) {
        attempt += 1;
        if (attempt < 20) window.setTimeout(boot, 300);
        return;
      }
      const map = L.map(holderRef.current, {
        zoomControl: false,
        minZoom: 5,
        maxZoom: 19,
        attributionControl: !compact,
        scrollWheelZoom: !compact,
      }).setView([42.2, 12.6], 6);
      if (!compact) L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      baseRef.current = makeBase(L, "dark");
      baseRef.current.addTo(map);

      map.getContainer().addEventListener("click", clickHandler);
      observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(holderRef.current);
      setReady(true);
    };

    boot();

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      const map = mapRef.current;
      if (map) {
        map.getContainer().removeEventListener("click", clickHandler);
        map.remove();
      }
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [navigate, compact]);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (baseRef.current) map.removeLayer(baseRef.current);
    baseRef.current = makeBase(L, base);
    baseRef.current.addTo(map);
  }, [base, ready]);

  const fit = useCallback(() => {
    const L = window.L;
    const map = mapRef.current;
    const points = retailers.filter(
      (r) => typeof r.lat === "number" && typeof r.lng === "number"
    );
    if (!L || !map || !points.length) return;
    const bounds = L.latLngBounds(points.map((r) => [r.lat, r.lng]));
    if (points.length === 1 || bounds.getSouthWest().equals(bounds.getNorthEast())) {
      map.setView(bounds.getCenter(), 12);
    } else {
      map.fitBounds(bounds.pad(0.12));
    }
  }, [retailers]);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    if (layerRef.current && map.hasLayer(layerRef.current)) map.removeLayer(layerRef.current);
    markersRef.current = new Map();

    const markers = [];
    retailers.forEach((r) => {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
      const active = Number(r.balance) > 0;
      const marker = L.marker([r.lat, r.lng], {
        icon: pinIcon(L, active, r.id === selectedRef.current),
        riseOnHover: true,
        keyboard: false,
      });
      marker._active = active;
      marker.bindPopup(() => popupHtml(r, compact), { maxWidth: 300 });
      marker.bindTooltip(r.name, { direction: "top" });
      marker.on("mouseover", () => marker.setIcon(pinIcon(L, active, true)));
      marker.on("mouseout", () =>
        marker.setIcon(pinIcon(L, active, r.id === selectedRef.current))
      );
      marker.on("click", () => onSelectRef.current?.(r));
      markersRef.current.set(r.id, marker);
      markers.push(marker);
    });

    const useCluster = clusterOn && !compact && Boolean(L.markerClusterGroup);
    if (useCluster) {
      const group = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 46,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        iconCreateFunction(cluster) {
          const children = cluster.getAllChildMarkers();
          const count = children.length;
          const active = children.filter((m) => m._active).length;
          const size = count < 10 ? 36 : count < 50 ? 44 : count < 150 ? 52 : 62;
          return L.divIcon({
            className: "ggm-cluster",
            iconSize: [size, size],
            html: `<div class="ggm-cl" style="width:${size}px;height:${size}px;--g:${((active / count) * 100).toFixed(1)}%"><span style="width:${size - 12}px;height:${size - 12}px">${count}</span></div>`,
          });
        },
      });
      group.addLayers(markers);
      layerRef.current = group;
    } else {
      layerRef.current = L.layerGroup(markers);
    }
    layerRef.current.addTo(map);
  }, [retailers, ready, clusterOn, compact]);

  useEffect(() => {
    const L = window.L;
    if (!ready || !L) return;
    markersRef.current.forEach((marker) =>
      marker.setIcon(pinIcon(L, marker._active, false))
    );
    const selected = selectedId ? markersRef.current.get(selectedId) : null;
    if (selected) selected.setIcon(pinIcon(L, selected._active, true));
  }, [selectedId, ready]);

  useEffect(() => {
    if (ready && autoFit && retailers.length) fit();
  }, [retailers, ready, autoFit, fit]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focusId) return;
    const marker = markersRef.current.get(focusId);
    const retailer = retailers.find((r) => r.id === focusId);
    if (!marker || !retailer) return;
    const reveal = () => {
      map.setView([retailer.lat, retailer.lng], Math.max(map.getZoom(), 14));
      if (!compact) marker.openPopup();
    };
    if (layerRef.current?.zoomToShowLayer) layerRef.current.zoomToShowLayer(marker, reveal);
    else reveal();
  }, [focusId, ready, retailers, compact]);

  return (
    <div className={`ggm-map ${className}`}>
      <div ref={holderRef} className="absolute inset-0" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-background/80">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!compact && (
        <>
          <div className="absolute z-[900] left-3 top-3 flex gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur">
            {BASES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setBase(item.key)}
                className={
                  base === item.key
                    ? "rounded px-2.5 py-1 text-xs font-semibold bg-primary text-primary-foreground"
                    : "rounded px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="absolute z-[900] left-3 bottom-8 hidden sm:grid gap-1.5 rounded-lg border border-border bg-card/90 p-3 text-xs backdrop-blur max-w-[230px]">
            <div className="flex items-center gap-2">
              <span className="dot g" /> Active retailer
            </div>
            <div className="flex items-center gap-2">
              <span className="dot r" /> Inactive (no balance)
            </div>
            <p className="m-0 text-[11px] leading-snug text-muted-foreground">
              Cluster rings show the active share of each group.
            </p>
          </div>

          <div className="absolute z-[900] right-3 bottom-8 flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={fit}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur hover:bg-primary hover:text-primary-foreground"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fit retailers
            </button>
            <button
              type="button"
              onClick={() => setClusterOn((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card/90 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:text-primary"
            >
              <Layers className="w-3.5 h-3.5" />
              {clusterOn ? "Clusters on" : "Clusters off"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}