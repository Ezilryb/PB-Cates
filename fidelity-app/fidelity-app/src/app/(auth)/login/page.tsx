"use client";

import { useState, useRef } from "react";

type Step = "email" | "otp" | "loading";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // Étape 1 : envoi de l'email
  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || isLoading) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  // Étape 2 : vérification du code OTP
  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6 || isLoading) return;
    setError("");
    setIsLoading(true);
    setStep("loading");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Code invalide");
      // Redirection selon le rôle
      window.location.href = data.redirectTo ?? "/wallet";
    } catch (err: any) {
      setError(err.message);
      setStep("otp");
      setOtp("");
      otpRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gray-950">
      {/* Background gradient décoratif */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-orange-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-orange-800/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / En-tête */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500/10 rounded-3xl mb-4 border border-orange-500/20">
            <span className="text-4xl">🎟️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">FidélitéApp</h1>
          <p className="text-gray-400 text-sm mt-1">Votre carnet de tampons digital</p>
        </div>

        {/* Étape : Email */}
        {(step === "email" || step === "otp") && (
          <div className="card space-y-6">
            {step === "email" ? (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-white">Connexion</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Entrez votre email, nous vous envoyons un code à 6 chiffres.
                    Aucun mot de passe requis.
                  </p>
                </div>
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="input"
                    autoFocus
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                  {error && (
                    <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                      ⚠️ {error}
                    </p>
                  )}
                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Envoi en cours…
                      </span>
                    ) : "Recevoir mon code →"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div>
                  <button
                    onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                    className="text-gray-400 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors"
                  >
                    ← Changer d'email
                  </button>
                  <h2 className="text-lg font-semibold text-white">Entrez votre code</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Code envoyé à <strong className="text-white">{email}</strong>
                  </p>
                </div>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <input
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(val);
                      if (val.length === 6) {
                        // Auto-submit quand le code est complet
                        setTimeout(() => {
                          document.getElementById("verify-btn")?.click();
                        }, 50);
                      }
                    }}
                    placeholder="000000"
                    className="otp-input"
                    autoComplete="one-time-code"
                    required
                    disabled={isLoading}
                  />
                  {error && (
                    <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">
                      ⚠️ {error}
                    </p>
                  )}
                  <button
                    id="verify-btn"
                    type="submit"
                    className="btn-primary"
                    disabled={otp.length !== 6 || isLoading}
                  >
                    Valider le code ✓
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
                    disabled={isLoading}
                  >
                    Renvoyer le code
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Étape : Chargement/redirection */}
        {step === "loading" && (
          <div className="card flex flex-col items-center gap-4 py-10">
            <div className="w-14 h-14 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
            <p className="text-gray-300 font-medium">Connexion en cours…</p>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-6">
          En vous connectant, vous acceptez les conditions d'utilisation.
          <br />Vos données ne sont jamais revendues.
        </p>
      </div>
    </div>
  );
}
