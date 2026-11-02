// AREA ADMIN → AZIENDA → DESIGN: nome e colore dell'app, carattere, grandezze, chat, animazioni dell'anno,
// avvio, «La mia area» per tutti. (Era dentro AdminPanel.js: spostato qui così il file è più piccolo.)
import React from "react";
import { AREA_TILES, areaOn } from "../../areaTiles";
import { AppNameField, ThemeColors, SeasonGallery } from "../../components/DesignExtras";
import { PRO_INPUT, getProPanelClass } from "../../ui";
import { SwitchRow, Switch } from "../../components/Switch";
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

        <SwitchRow
          section="chat-toggle"
          id="chat"
          title="Chat tra tecnici"
          text={layoutConfig.chatEnabled === true ? "Accesa: c'è nella «La mia area» di ogni tecnico" : "Spenta: nessuno la vede (i messaggi restano salvati)"}
          on={layoutConfig.chatEnabled === true}
          onChange={(v) => onUpdateLayout({ ...layoutConfig, chatEnabled: v })}
        />

        <SwitchRow
          section="online-toggle"
          id="online"
          title="Messaggi da «Tecnici online»"
          text={layoutConfig.onlineMessages !== false ? "Accesi: toccando «tecnici online» in alto si vede chi è collegato e gli si scrive" : "Spenti: si vede solo chi è online, senza messaggi"}
          on={layoutConfig.onlineMessages !== false}
          onChange={(v) => onUpdateLayout({ ...layoutConfig, onlineMessages: v })}
        />

        <SeasonGallery layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} color={layoutConfig.themeColor} />

        <SwitchRow
          section="splash-toggle"
          id="splash"
          title="Animazione di avvio"
          text={layoutConfig.showSplash === false ? "Spenta: l'app si apre subito" : "Carroponte e gru all'apertura (circa 2 secondi)"}
          on={layoutConfig.showSplash !== false}
          onChange={(v) => onUpdateLayout({ ...layoutConfig, showSplash: v })}
        />

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
                <Switch id={"area-" + t.id} label={t.label} on={isOn} onChange={() => onUpdateLayout({ ...layoutConfig, areaTiles: { ...(layoutConfig.areaTiles || {}), [t.id]: !isOn } })} />
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
