import React from "react";

/* ---------------------------------------------------------------------------
 * Italy as a network of retailers.
 *
 * The outline and the dots are drawn from real longitude/latitude pairs and
 * projected onto the SVG, so the shape stays recognisable instead of being
 * freehand. Longitude is squeezed by cos(latitude) so the country is not
 * stretched sideways.
 * ------------------------------------------------------------------------- */

const SCALE = 100; // viewBox units per degree of latitude
const LON_MIN = 6.4;
const LON_MAX = 18.7;
const LAT_MIN = 36.6;
const LAT_MAX = 47.1;
const LAT_REF = 41.9;

const LON_K = Math.cos((LAT_REF * Math.PI) / 180);
const VIEW_W = (LON_MAX - LON_MIN) * LON_K * SCALE;
const VIEW_H = (LAT_MAX - LAT_MIN) * SCALE;

const px = (lon) => (lon - LON_MIN) * LON_K * SCALE;
const py = (lat) => (LAT_MAX - lat) * SCALE;

/* Simplified coastline, traced clockwise from the French border. */
const MAINLAND = [
  [7.6, 43.79], // Ventimiglia
  [7.1, 44.1],
  [7.0, 44.35],
  [6.85, 44.75],
  [6.9, 45.0],
  [7.0, 45.35],
  [6.87, 45.83], // Mont Blanc
  [7.1, 45.95],
  [7.6, 45.9],
  [8.0, 46.02],
  [8.45, 46.45], // Simplon
  [8.9, 46.3],
  [9.2, 46.4],
  [9.6, 46.5],
  [9.95, 46.55],
  [10.4, 46.8], // Stelvio
  [11.0, 46.9],
  [11.6, 46.95],
  [12.1, 46.9],
  [12.45, 46.85],
  [12.8, 46.6],
  [13.3, 46.5],
  [13.7, 46.5], // Tarvisio
  [13.6, 46.2],
  [13.75, 45.8],
  [13.6, 45.65], // Trieste
  [13.4, 45.55],
  [13.1, 45.45],
  [12.7, 45.4],
  [12.35, 45.42], // Venezia
  [12.5, 45.0],
  [12.55, 44.6],
  [12.6, 44.06], // Rimini
  [13.1, 43.75],
  [13.51, 43.62], // Ancona
  [13.9, 43.2],
  [14.2, 42.8],
  [14.35, 42.46], // Pescara
  [14.7, 42.1],
  [15.0, 42.0],
  [15.4, 41.9],
  [15.9, 41.92], // Rodi Garganico
  [16.18, 41.88], // Vieste
  [16.05, 41.71],
  [15.92, 41.63], // Manfredonia
  [16.1, 41.4],
  [16.28, 41.32], // Barletta
  [16.87, 41.12], // Bari
  [17.3, 40.95],
  [17.94, 40.63], // Brindisi
  [18.17, 40.35], // Lecce
  [18.49, 40.14], // Otranto
  [18.36, 39.79], // Santa Maria di Leuca
  [17.98, 40.05], // Gallipoli
  [17.5, 40.3],
  [17.24, 40.47], // Taranto
  [16.9, 40.42],
  [16.5, 39.75], // Sibari
  [16.55, 39.6],
  [17.13, 39.08], // Crotone
  [16.6, 38.82], // Catanzaro Lido
  [16.26, 38.24], // Locri
  [15.65, 38.11], // Reggio Calabria
  [15.85, 38.36], // Palmi
  [15.9, 38.68], // Tropea
  [15.95, 39.52], // Cetraro
  [15.78, 39.9],
  [15.72, 39.99], // Maratea
  [15.63, 40.07], // Sapri
  [15.5, 40.1],
  [15.18, 40.14],
  [14.99, 40.35], // Agropoli
  [14.77, 40.68], // Salerno
  [14.5, 40.63], // Amalfi
  [14.27, 40.85], // Napoli
  [13.95, 40.8],
  [13.57, 41.21], // Gaeta
  [13.25, 41.28], // Terracina
  [12.62, 41.45], // Anzio
  [12.23, 41.73], // Ostia
  [11.8, 42.09], // Civitavecchia
  [11.35, 42.4],
  [11.13, 42.55], // Talamone
  [10.75, 42.75],
  [10.52, 42.92], // Piombino
  [10.35, 43.2],
  [10.31, 43.55], // Livorno
  [10.15, 43.72],
  [9.9, 43.95],
  [9.82, 44.1], // La Spezia
  [9.4, 44.25],
  [8.93, 44.41], // Genova
  [8.48, 44.31], // Savona
  [8.1, 43.95],
  [8.03, 43.89], // Imperia
];

const SICILY = [
  [12.43, 37.8], // Trapani
  [12.6, 38.0],
  [13.0, 38.05],
  [13.36, 38.11], // Palermo
  [13.7, 38.15],
  [14.1, 38.05],
  [14.6, 38.1],
  [15.0, 38.2],
  [15.55, 38.19], // Messina
  [15.45, 37.9],
  [15.29, 37.85], // Taormina
  [15.09, 37.5], // Catania
  [15.28, 37.06], // Siracusa
  [15.1, 36.75],
  [14.85, 36.73], // Pozzallo
  [14.4, 36.75],
  [14.25, 37.07], // Gela
  [13.9, 37.15],
  [13.58, 37.31], // Agrigento
  [13.08, 37.51], // Sciacca
  [12.7, 37.65],
];

const SARDINIA = [
  [9.19, 41.24], // Santa Teresa
  [9.4, 41.2],
  [9.55, 40.95],
  [9.72, 40.63],
  [9.7, 40.38], // Orosei
  [9.7, 39.94], // Arbatax
  [9.62, 39.6],
  [9.55, 39.25],
  [9.5, 39.14], // Villasimius
  [9.12, 39.2], // Cagliari
  [8.95, 38.97],
  [8.77, 38.97],
  [8.5, 39.05],
  [8.3, 39.15],
  [8.42, 39.35],
  [8.5, 39.9], // Oristano
  [8.5, 40.3], // Bosa
  [8.3, 40.55], // Alghero
  [8.4, 40.83], // Porto Torres
  [8.25, 40.94], // Stintino
  [8.7, 40.9], // Castelsardo
  [8.8, 40.98],
];

/* Retailer hubs, with the towns a rep would actually cover. */
const NODES = [
  { name: "Milano", lon: 9.19, lat: 45.46, hub: true },
  { name: "Torino", lon: 7.69, lat: 45.07 },
  { name: "Genova", lon: 8.93, lat: 44.41 },
  { name: "Venezia", lon: 12.32, lat: 45.44 },
  { name: "Verona", lon: 10.99, lat: 45.44 },
  { name: "Bologna", lon: 11.34, lat: 44.49 },
  { name: "Firenze", lon: 11.26, lat: 43.77 },
  { name: "Perugia", lon: 12.39, lat: 43.11 },
  { name: "Ancona", lon: 13.51, lat: 43.62 },
  { name: "Roma", lon: 12.5, lat: 41.9, hub: true },
  { name: "L'Aquila", lon: 13.4, lat: 42.35 },
  { name: "Napoli", lon: 14.27, lat: 40.85, hub: true },
  { name: "Bari", lon: 16.87, lat: 41.12, hub: true },
  { name: "Potenza", lon: 15.8, lat: 40.64 },
  { name: "Catanzaro", lon: 16.59, lat: 38.91 },
  { name: "Reggio C.", lon: 15.65, lat: 38.11 },
  { name: "Palermo", lon: 13.36, lat: 38.11, hub: true },
  { name: "Catania", lon: 15.09, lat: 37.5 },
  { name: "Cagliari", lon: 9.12, lat: 39.22, hub: true },
  { name: "Lecce", lon: 18.17, lat: 40.35 },
  { name: "Trieste", lon: 13.78, lat: 45.65 },
  { name: "Trento", lon: 11.12, lat: 46.07 },
  { name: "Aosta", lon: 7.32, lat: 45.74 },
];

/* Which retailers trade with which — index pairs into NODES. */
const EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 21], [0, 22],
  [1, 2],
  [3, 4], [3, 5], [3, 20],
  [4, 5], [4, 21],
  [5, 6], [5, 8],
  [6, 7], [6, 9],
  [7, 8], [7, 9],
  [9, 10], [9, 11],
  [8, 12],
  [10, 11], [10, 12],
  [11, 13],
  [12, 13], [12, 19],
  [13, 14], [13, 19],
  [14, 15],
  [15, 16], [15, 17],
  [16, 17], [16, 18],
];

const toPath = (ring) =>
  `${ring.map(([lon, lat], i) => `${i ? "L" : "M"}${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join(" ")} Z`;

const COASTLINES = [MAINLAND, SICILY, SARDINIA].map(toPath);
const POINTS = NODES.map((node) => ({ ...node, x: px(node.lon), y: py(node.lat) }));

export default function ItalyNetwork({ className = "" }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W.toFixed(1)} ${VIEW_H.toFixed(1)}`}
      className={className}
      role="img"
      aria-label="Retailer network across Italy"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ita-fill" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#f1d36b" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {COASTLINES.map((d) => (
        <path
          key={d}
          d={d}
          fill="url(#ita-fill)"
          stroke="#d4af37"
          strokeOpacity="0.5"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      ))}

      <g stroke="#d4af37" strokeOpacity="0.3" strokeWidth="1">
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={POINTS[a].x}
            y1={POINTS[a].y}
            x2={POINTS[b].x}
            y2={POINTS[b].y}
          />
        ))}
      </g>

      <g>
        {POINTS.map((point, i) => (
          <g key={point.name}>
            {point.hub && (
              <circle cx={point.x} cy={point.y} r="17" fill="#d4af37" fillOpacity="0.12" />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={point.hub ? 6 : 4}
              fill="#f1d36b"
              fillOpacity={point.hub ? 1 : 0.85}
            />
            {point.hub && (
              <circle
                className="italy-ping"
                style={{ animationDelay: `${(i % 4) * 0.7}s` }}
                cx={point.x}
                cy={point.y}
                r="7"
                fill="none"
                stroke="#f1d36b"
                strokeWidth="1.4"
              />
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
