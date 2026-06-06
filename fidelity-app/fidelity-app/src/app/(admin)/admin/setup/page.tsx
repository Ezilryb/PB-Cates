"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface StaffMember { id: string; email: string; role: string }

export default function SetupPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"staff" | "admin">("staff");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    const res = await fetch("/api/admin/setup");
    if (res.ok) { const d = await res.json(); setStaff(d.staff); }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || isAdding) return;
    setIsAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_staff", email: newEmail.trim().toLowerCase(), role: newRole }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`✓ ${newEmail} ajouté(e) comme ${newRole}`);
      setNewEmail("");
      loadStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveStaff(id: string, email: string) {
    if (!confirm(`Supprimer ${email} ?`)) return;
    await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_staff", staffId: id }),
    });
    loadStaff();
  }

  const roleColor = (role: string) =>
    role === "admin"
      ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
      : "bg-blue-500/15 text-blue-300 border-blue-500/30";

  return (
    <div className="min-h-dvh bg-gray-950">
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="font-bold text-white">Équipe & accès</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Ajouter un membre */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-white">Ajouter un accès</h2>
          <form onSubmit={handleAddStaff} className="space-y-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@vendeur.com"
              className="input"
              required
            />
            <div className="flex gap-2">
              {(["staff", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${
                    newRole === r
                      ? r === "admin"
                        ? "bg-orange-500/20 border-orange-500 text-white"
                        : "bg-blue-500/20 border-blue-500 text-white"
                      : "border-white/10 text-gray-400"
                  }`}
                >
                  {r === "admin" ? "👑 Admin" : "🧑‍💼 Vendeur"}
                </button>
              ))}
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              {newRole === "admin" ? (
                <p>👑 <strong className="text-gray-400">Admin</strong> : accès au tableau de bord, paramètres, exports + mode caisse</p>
              ) : (
                <p>🧑‍💼 <strong className="text-gray-400">Vendeur</strong> : accès uniquement au mode caisse (scan QR)</p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">⚠️ {error}</p>}
            {success && <p className="text-green-400 text-sm bg-green-400/10 px-3 py-2 rounded-lg">{success}</p>}
            <button type="submit" disabled={isAdding} className="btn-primary">
              {isAdding ? "Ajout…" : "Ajouter ce compte"}
            </button>
          </form>
        </div>

        {/* Liste des membres */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-white">Comptes actifs ({staff.length})</h2>
          {staff.length === 0 ? (
            <p className="text-sm text-gray-500 py-2 text-center">Aucun compte staff configuré</p>
          ) : (
            staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                    {member.role === "admin" ? "👑" : "🧑‍💼"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium truncate">{member.email}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border mt-0.5 ${roleColor(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveStaff(member.id, member.email)}
                  className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Supprimer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card bg-yellow-500/5 border-yellow-500/20 space-y-2">
          <h3 className="text-sm font-semibold text-yellow-300">💡 Compte staff partagé</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            Vos vendeurs peuvent partager le même compte email (par ex. <code className="text-orange-300">caisse@monresto.fr</code>).
            Tous reçoivent le code OTP sur cet email et accèdent à l'interface caisse sans mot de passe.
          </p>
        </div>
      </main>
    </div>
  );
}
