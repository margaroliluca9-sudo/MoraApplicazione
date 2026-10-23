// Disegnino del tipo di gru (stile delle altre icone): a ponte, a bandiera, a cavalletto/portale, paranco.
import React from "react";

export const craneKind = (type = "") => {
  const t = String(type).toLowerCase();
  if (/bandiera|mensola|colonna/.test(t)) return "bandiera";
  if (/portale|cavalletto|capra/.test(t)) return "portale";
  if (/paranco|catena|argano|trave fissa|monorotaia/.test(t)) return "paranco";
  return "ponte";
};

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export const CraneTypeIcon = ({ type, className = "w-6 h-6" }) => {
  const k = craneKind(type);
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" data-crane-kind={k}>
      {k === "ponte" && (
        <g {...P}>
          <path d="M2 5h20" />
          <path d="M2 8h20" />
          <path d="M3 5v16M21 5v16" />
          <rect x="10" y="8" width="5" height="3" rx="0.8" />
          <path d="M12.5 11v5" />
          <path d="M12.5 16a1.6 1.6 0 1 0 1.6 1.6" />
        </g>
      )}
      {k === "bandiera" && (
        <g {...P}>
          <path d="M5 21V3" />
          <path d="M2.5 21h5" />
          <path d="M5 5h15" />
          <path d="M5 9l4-4" />
          <rect x="13" y="5" width="4" height="2.5" rx="0.6" />
          <path d="M15 7.5v6" />
          <path d="M15 13.5a1.5 1.5 0 1 0 1.5 1.5" />
        </g>
      )}
      {k === "portale" && (
        <g {...P}>
          <path d="M2 5h20" />
          <path d="M4 5l-2 16M20 5l2 16M4 5l2 16M20 5l-2 16" />
          <rect x="10" y="5" width="4" height="2.5" rx="0.6" />
          <path d="M12 7.5v6" />
          <path d="M12 13.5a1.5 1.5 0 1 0 1.5 1.5" />
        </g>
      )}
      {k === "paranco" && (
        <g {...P}>
          <path d="M3 4h18" />
          <rect x="8" y="6" width="8" height="5" rx="1.5" />
          <path d="M12 4v2" />
          <path d="M10 11v3M14 11v3" />
          <path d="M10 14h4" />
          <path d="M12 14v3" />
          <path d="M12 17a1.8 1.8 0 1 0 1.8 1.8" />
        </g>
      )}
    </svg>
  );
};
