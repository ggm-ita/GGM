import React from "react";

export default function StatusPill({ active, className = "" }) {
  return (
    <span className={`pill ${active ? "g" : "r"} ${className}`}>
      <i className={`dot ${active ? "g" : "r"}`} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}