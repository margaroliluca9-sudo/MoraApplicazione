// AREA ADMIN → AZIENDA → DESIGN: nome e colore dell'app, carattere, grandezze, chat, animazioni dell'anno,
// avvio, «La mia area» per tutti. (Era dentro AdminPanel.js: spostato qui così il file è più piccolo.)
import React from "react";
import { AREA_TILES, areaOn } from "../../areaTiles";
import { AppNameField, ThemeColors, SeasonGallery } from "../../components/DesignExtras";
import { PRO_INPUT, getProPanelClass } from "../../ui";
import { FONT_OPTIONS, FONT_SCALE_OPTIONS, RADIUS_OPTIONS, DENSITY_OPTIONS, APPEARANCE_DEFAULTS } from "../../appearance";

export const DesignAdmin = ({ layoutConfig, onUpdateLayout }) => (
  <div
      className={`p-6 shadow-xl ${getProPanelClass(
        layoutConfig.themeColor
      )}`}
    >
      <h3 className="font-black text-slate-800 mb-4">Aspetto dell'app</h3>
      <div className="space-y-5 mb-6">
        <AppNameField layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} color={layoutConfig.themeColor} />
        <ThemeColors layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">
        Le scelte di questa pagina valgono per tutti i telefoni.
      </p>

      <div className="space-y-5 mb-6" data-section="appearance">
        <div className="space-y-1.5">
          <label
            htmlFor="design-font"
            className="text-[10px] font-bold text-slate-500 uppercase ml-1"
          >
            Carattere
          </label>
          <select
            id="design-font"
            className={PRO_INPUT}
            value={layoutConfig.fontFamily || APPEARANCE_DEFAULTS.fontFamily}
            onChange={(e) =>
              onUpdateLayout({ ...layoutConfig, fontFamily: e.target.value })
            }
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {[
          {
            key: "fontScale",
            title: "Grandezza lettere",
            options: FONT_SCALE_OPTIONS,
          },
          { key: "radiusStyle", title: "Angoli", options: RADIUS_OPTIONS },
          { key: "density", title: "Spaziatura", options: DENSITY_OPTIONS },
        ].map((group) => {
          const current =
            layoutConfig[group.key] || APPEARANCE_DEFAULTS[group.key];
          return (
            <div key={group.key} className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block">
                {group.title}
              </span>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${group.options.length}, minmax(0, 1fr))`,
                }}
                role="group"
                aria-label={group.title}
              >
                {group.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={current === o.id}
                    onClick={() =>
                      onUpdateLayout({ ...layoutConfig, [group.key]: o.id })
                    }
                    className={`py-2.5 px-1 rounded-lg border text-xs font-bold transition-all ${
                      current === o.id
                        ? `bg-${layoutConfig.themeColor}-600 border-${layoutConfig.themeColor}-600 text-white`
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                    style={
                      group.key === "fontScale"
                        ? { fontSize: `${12 * o.value}px` }
                        : undefined
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <div
          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
          data-section="chat-toggle"
        >
          <div>
            <span className="text-xs font-bold text-slate-700 block">
              Chat tra tecnici
            </span>
            <span className="text-[10px] text-slate-500">
              {layoutConfig.chatEnabled === true
                ? "Attiva: c'è nella «La mia area» di ogni tecnico"
                : "Spenta: nessuno la vede (i messaggi restano salvati)"}
            </span>
          </div>
          <button
            type="button"
            aria-pressed={layoutConfig.chatEnabled === true}
            onClick={() =>
              onUpdateLayout({
                ...layoutConfig,
                chatEnabled: layoutConfig.chatEnabled !== true,
              })
            }
            className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
              layoutConfig.chatEnabled === true
                ? `bg-${layoutConfig.themeColor}-600 text-white`
                : "bg-white border border-slate-300 text-slate-600"
            }`}
          >
            {layoutConfig.chatEnabled === true ? "Disattiva" : "Attiva"}
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
          data-section="online-toggle"
        >
          <div>
            <span className="text-xs font-bold text-slate-700 block">
              Messaggi da «Tecnici online»
            </span>
            <span className="text-[10px] text-slate-500">
              {layoutConfig.onlineMessages !== false
                ? "Attivi: toccando «tecnici online» in alto si vede chi è collegato e gli si scrive"
                : "Spenti: si vede solo chi è online, senza messaggi"}
            </span>
          </div>
          <button
            type="button"
            aria-pressed={layoutConfig.onlineMessages !== false}
            onClick={() =>
              onUpdateLayout({
                ...layoutConfig,
                onlineMessages: layoutConfig.onlineMessages === false,
              })
            }
            className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
              layoutConfig.onlineMessages !== false
                ? `bg-${layoutConfig.themeColor}-600 text-white`
                : "bg-white border border-slate-300 text-slate-600"
            }`}
          >
            {layoutConfig.onlineMessages !== false ? "Disattiva" : "Attiva"}
          </button>
        </div>

        <SeasonGallery layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} color={layoutConfig.themeColor} />

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
          <div>
            <span className="text-xs font-bold text-slate-700 block">
              Animazione di avvio
            </span>
            <span className="text-[10px] text-slate-500">
              {layoutConfig.showSplash === false
                ? "Disattivata: l'app si apre subito"
                : "Carroponte e gru all'apertura (circa 2 secondi)"}
            </span>
          </div>
          <button
            type="button"
            aria-pressed={layoutConfig.showSplash !== false}
            onClick={() =>
              onUpdateLayout({
                ...layoutConfig,
                showSplash: layoutConfig.showSplash === false,
              })
            }
            className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
              layoutConfig.showSplash === false
                ? "bg-white border border-slate-300 text-slate-600"
                : `bg-${layoutConfig.themeColor}-600 text-white`
            }`}
          >
            {layoutConfig.showSplash === false ? "Attiva" : "Disattiva"}
          </button>
        </div>

        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2" data-section="area-tiles-admin">
          <div>
            <span className="text-xs font-bold text-slate-700 block">«La mia area»: cosa vedono i tecnici</span>
            <span className="text-[10px] text-slate-500">Spegni una parte e sparisce per tutti. I dati restano salvati: riaccendendola torna tutto com'era.</span>
          </div>
          {AREA_TILES.map((t) => {
            const isOn = areaOn(layoutConfig, t.id);
            return (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2" data-area-admin={t.id}>
                <div className="min-w-0">
                  <span className={`text-xs font-bold block ${isOn ? "text-slate-700" : "text-slate-400 line-through"}`}>{t.label}</span>
                  <span className="text-[10px] text-slate-500">{t.sub}</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={t.label}
                  onClick={() =>
                    onUpdateLayout({
                      ...layoutConfig,
                      areaTiles: { ...(layoutConfig.areaTiles || {}), [t.id]: !isOn },
                    })
                  }
                  className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${isOn ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? "left-6" : "left-1"}`} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            onUpdateLayout({ ...layoutConfig, ...APPEARANCE_DEFAULTS })
          }
          className="w-full py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50"
        >
          Ripristina grafica predefinita
        </button>
      </div>

    </div>
  
);
