// AREA ADMIN: le schede sono divise in 4 gruppi (prima erano 10 in fila).
// Tocchi un gruppo grande e sotto compaiono solo le sue schede. L'ultima scheda aperta si ricorda.
import React from "react";
import { User, Users, Factory, Layers, FolderOpen, Building2, Truck, Palette, AlertOctagon, Trash2, Settings } from "lucide-react";

export const ADMIN_GROUPS = [
  { id: "people", label: "Persone", icon: User, desc: "Tecnici", views: [["techs", "Staff", User]] },
  {
    id: "customers",
    label: "Clienti e gru",
    icon: Factory,
    desc: "Clienti, gru, tipi, Drive",
    views: [
      ["clients", "Clienti", Users],
      ["machines", "Gru", Factory],
      ["types", "Tipi", Layers],
      ["drive", "Drive", FolderOpen],
    ],
  },
  {
    id: "company",
    label: "Azienda",
    icon: Building2,
    desc: "Avvisi, password, furgoni, aspetto",
    views: [
      ["company", "Azienda", Building2],
      ["vans", "Furgoni", Truck],
      ["design", "Design", Palette],
    ],
  },
  {
    id: "system",
    label: "Sistema",
    icon: Settings,
    desc: "Backup, Excel, letture, cestino",
    views: [
      ["diagnostics", "System", AlertOctagon],
      ["trash", "Cestino", Trash2],
    ],
  },
];

export const groupOf = (view) => ADMIN_GROUPS.find((g) => g.views.some(([v]) => v === view)) || ADMIN_GROUPS[1];

const KEY = "mora_admin_view";
export const savedAdminView = () => {
  try {
    const v = localStorage.getItem(KEY);
    return ADMIN_GROUPS.some((g) => g.views.some(([x]) => x === v)) ? v : "clients";
  } catch (e) {
    return "clients";
  }
};
const remember = (v) => {
  try {
    localStorage.setItem(KEY, v);
  } catch (e) {
    // non importa
  }
};

export const AdminNav = ({ view, onChange, color = "blue" }) => {
  const group = groupOf(view);
  const go = (v) => {
    remember(v);
    onChange(v);
  };
  return (
    <div className="space-y-3" data-section="admin-nav">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ADMIN_GROUPS.map((g) => {
          const on = g.id === group.id;
          const Ic = g.icon;
          return (
            <button
              key={g.id}
              type="button"
              data-admin-group={g.id}
              aria-pressed={on}
              onClick={() => go(on ? view : g.views[0][0])}
              className={`text-left rounded-2xl border p-3 flex items-start gap-2.5 transition-colors ${
                on ? `bg-${color}-600 border-${color}-600 text-white shadow-md` : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Ic className={`w-5 h-5 shrink-0 mt-0.5 ${on ? "text-white" : `text-${color}-600`}`} />
              <span className="min-w-0">
                <span className="block font-black text-sm leading-tight">{g.label}</span>
                <span className={`block text-[11px] leading-snug mt-0.5 ${on ? "text-white/80" : "text-slate-500"}`}>{g.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      {group.views.length > 1 && (
        <div
          className="grid p-1.5 rounded-2xl border border-slate-200 gap-1 bg-white shadow-sm"
          style={{ gridTemplateColumns: `repeat(${group.views.length}, minmax(0, 1fr))` }}
          data-section="admin-tabs"
        >
          {group.views.map(([v, label, Ic]) => (
            <button
              key={v}
              type="button"
              onClick={() => go(v)}
              aria-pressed={view === v}
              className={`min-w-0 h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors ${
                view === v ? `bg-${color}-600 text-white shadow-sm` : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Ic className="w-4 h-4 shrink-0 hidden min-[400px]:block" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
