"use client";

import { useState } from "react";
import Link from "next/link";

export default function ExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setIsExporting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur export");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fidelite_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-gray-950">
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-bold text-white">Export données</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="card space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-3xl flex-shrink-0">
              📊
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Export Excel complet</h2>
              <p className="text-sm text-gray-400 mt-1">
                Téléchargez un fichier .xlsx avec l'intégralité de vos données de fidélité.
              </p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Contenu du fichier</p>
            {[
              { icon: "📋", label: "Onglet 1 — Historique tampons", desc: "Date, heure, email client, tampons ajoutés" },
              { icon: "👥", label: "Onglet 2 — Résumé clients", desc: "Tous les clients, tampons totaux, récompenses" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-2">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-sm text-white font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl">⚠️ {error}</p>
          )}

          <button onClick={handleExport} disabled={isExporting} className="btn-primary">
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Génération en cours…
              </span>
            ) : "⬇️ Télécharger le fichier Excel"}
          </button>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-white text-sm">💡 Utilisations recommandées</h2>
          {[
            "Analyser les habitudes de visite de vos clients",
            "Identifier vos clients les plus fidèles",
            "Créer des listes pour vos campagnes email",
            "Suivre l'évolution de votre programme sur la durée",
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-2">
              <span className="text-green-400 text-sm mt-0.5">✓</span>
              <p className="text-sm text-gray-400">{tip}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
