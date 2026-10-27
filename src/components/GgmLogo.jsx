import React from "react";

import { GGM_LOGO } from "@/lib/brand";

/* The brand mark on the signed-out pages. It points at public/ggm-logo.svg,
   the same file the signed-in shell uses — replace that file to rebrand. */
export default function GgmLogo({ className = "h-10 w-auto", alt = "GGM" }) {
  return <img src={GGM_LOGO} alt={alt} className={className} />;
}
