// Se una schermata va in errore, invece della pagina bianca si vede un avviso con «Riprova».
// L'errore finisce anche in Area admin → System → «Errori sui telefoni».
import React from "react";
import { reportError } from "../errorLog";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error, info) {
    const e = error || {};
    reportError({ message: e.message || String(error), stack: `${e.stack || ""}\n--- componenti:${(info && info.componentStack) || ""}`.slice(0, 900) }, "schermata");
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100" data-error-screen>
        <div className="bg-white rounded-3xl shadow-xl p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-4xl">🛠️</p>
          <h2 className="text-xl font-black text-slate-800">Qualcosa è andato storto</h2>
          <p className="text-sm text-slate-600">Non hai perso niente: i dati sono salvati. Tocca «Riprova» per riaprire l'app.</p>
          <button type="button" onClick={() => window.location.reload()} className="w-full h-12 rounded-full bg-blue-600 text-white font-black">
            Riprova
          </button>
        </div>
      </div>
    );
  }
}
