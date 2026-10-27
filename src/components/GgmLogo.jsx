import React, { useId } from "react";

/* Inline copy of /ggm-logo.svg. Rendering it as JSX instead of an <img> means
   the mark is part of the document: it can never 404, be blocked by a CSP, or
   flash while the file loads. The gradient id is unique per instance so several
   logos can share a page without clashing ids. */
export default function GgmLogo({ className = "h-10 w-auto" }) {
  const gradientId = `ggm-logo-gold-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 192 64"
      className={className}
      role="img"
      aria-label="GGM"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1d36b" />
          <stop offset="100%" stopColor="#d4af37" />
        </linearGradient>
      </defs>
      <text
        x="96"
        y="45"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="44"
        fontWeight="700"
        letterSpacing="6"
        fill={`url(#${gradientId})`}
      >
        GGM
      </text>
    </svg>
  );
}
