// Avviso sotto «Numero Assistenza»: lo stesso numero c'è già nello STESSO anno (negli altri anni
// è normale: il numero riparte da 1 ogni gennaio). Non blocca: può essere la stessa assistenza
// su più gru dello stesso cliente.
import React from "react";
import { ticketTwins } from "../ticket";

export const TicketTwins = ({ logs, ticketNumber, year, selfId = null }) => {
  const twins = year ? ticketTwins(logs, ticketNumber, year, selfId) : [];
  if (!twins.length) return null;
  const t = twins[0];
  return (
    <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-snug" data-ticket-twins={twins.length}>
      Il N. {String(ticketNumber).trim()} del {year} c'è già: {t.customer}, gru {t.machineId} ({t.dateString})
      {twins.length > 1 ? ` e altri ${twins.length - 1}` : ""}. Se è la stessa assistenza va bene così.
    </p>
  );
};
