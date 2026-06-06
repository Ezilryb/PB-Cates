"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Restaurant } from "@/types";

export default function SettingsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({
    reward_description: "",
    stamps_required: 10,
    multi_stamp_enabled: false,
    max_stamps_per_visit: 3,
    max_stamps_per_day: 10,
    color: "#f97316",
    name: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setRestaurant(data.restaurant);
        setForm({
          reward_description: data.restaurant.reward_description,
          stamps_required: data.restaurant.stamps_required,
          multi_stamp_enabled: data.restaurant.multi_stamp_enabled,
          max_stamps_per_visit: data.restaurant.max_stamps_per_visit,
          max_stamps_per_day: data.restaurant.max_stamps_per_day,
          color: data.restaurant.color,
          name: data.restaurant.name,
          description: data.restaurant.description ?? "",
        });
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const COLORS = [
    "#f97316", "#ef4444", "#ec4899", "#a855f7",
    "#3b82f6", "#06b6d4", "#10b981", "#84cc16",
  ];

  return (
    <div className="min-h-dvh bg-gray-950">
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-bold text-white">Paramètres</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {!restaurant ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Infos restaurant */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-white">🏪 Restaurant</h2>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Nom du restaurant</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description (optionnelle)</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Cuisine méditerranéenne depuis 1985"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-3">Couleur de la marque</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-9 h-9 rounded-xl border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: form.color === c ? "white" : "transparent",
                        transform: form.color === c ? "scale(1.1)" : "scale(1)",
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-9 h-9 rounded-xl border-2 border-white/20 cursor-pointer bg-transparent"
                    title="Couleur personnalisée"
                  />
                </div>
              </div>
            </div>

            {/* Règles fidélité */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-white">🎁 Programme de fidélité</h2>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Nombre de tampons requis pour la récompense
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={20}
                    value={form.stamps_required}
                    onChange={(e) => setForm((f) => ({ ...f, stamps_required: parseInt(e.target.value) }))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-white font-bold text-xl w-8 text-center">
                    {form.stamps_required}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Description de la récompense
                </label>
                <input
                  className="input"
                  value={form.reward_description}
                  onChange={(e) => setForm((f) => ({ ...f, reward_description: e.target.value }))}
                  placeholder="Ex: Un café ou un dessert offert !"
                  required
                />
              </div>
            </div>

            {/* Anti-fraude & multi-tampons */}
            <div className="card space-y-4">
              <h2 className="font-semibold text-white">🛡️ Anti-fraude & règles</h2>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">Multi-tampon par visite</p>
                  <p className="text-xs text-gray-500 mt-0.5">Permettre d'ajouter plusieurs tampons d'un coup (grande table)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, multi_stamp_enabled: !f.multi_stamp_enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.multi_stamp_enabled ? "bg-orange-500" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      form.multi_stamp_enabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {form.multi_stamp_enabled && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">
                    Maximum de tampons par visite
                  </label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, max_stamps_per_visit: n }))}
                        className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                          form.max_stamps_per_visit === n
                            ? "bg-orange-500/20 border-orange-500 text-white"
                            : "border-white/10 text-gray-400"
                        }`}
                      >
                        ×{n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Limite anti-fraude : max tampons / client / jour
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={form.max_stamps_per_day}
                    onChange={(e) => setForm((f) => ({ ...f, max_stamps_per_day: parseInt(e.target.value) }))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-white font-bold text-xl w-8 text-center">
                    {form.max_stamps_per_day}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-4 py-3 rounded-xl">⚠️ {error}</p>
            )}

            {savedOk && (
              <p className="text-green-400 text-sm bg-green-400/10 px-4 py-3 rounded-xl">
                ✓ Paramètres sauvegardés avec succès
              </p>
            )}

            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Sauvegarde…" : "💾 Sauvegarder les paramètres"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
