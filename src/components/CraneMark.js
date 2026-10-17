import React from "react";

// Simbolo dell'app: carroponte con gancio (sostituisce il casco)
export const CraneMark = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2 5h20" />
    <path d="M4 5v15M20 5v15" />
    <rect x="9.5" y="3" width="5" height="4" rx="1" fill="currentColor" stroke="none" />
    <path d="M12 7v6" />
    <path d="M12 13v2a2 2 0 1 1-2 2" />
    <path d="M2 20h20" />
  </svg>
);
