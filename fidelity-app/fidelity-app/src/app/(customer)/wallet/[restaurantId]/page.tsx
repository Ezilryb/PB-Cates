"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import type { WalletCard } from "@/types";
import { QR_TTL_SECONDS } from "@/lib/constants";

const REFRESH_MS = QR_TTL_SECONDS * 1000;

export default function LoyaltyCardPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const router = useRouter();

  const [card, setCard] = useState<WalletCard | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [countdown, setCountdown] = useState(QR_TTL_SECONDS);
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Array<{ stamps_added: number; created_at: string }>>([]);
  const [rewardFlash, setRewardFlash] = useState(false);

  // Charge les données de la carte
  const fetchCard = useCallback(async () => {
    try {
      const res = await fetch(`/api/wallet/${restaurantId}`);
      if (!res.ok) { router.push("/wallet"); return; }
      const data = await res.json();
      const prevStamps = card?.current_stamps;
      setCard(data.card);
      // Animation si nouveaux tampons détectés
      if (prevStamps !== undefined && data.card.current_stamps > prevStamps) {
        if (data.card.current_stamps >= data.card.restaurant.stamps_required) {
          setRewardFlash(true);
          setTimeout(() => setRewardFlash(false), 3000);
        }
      }
    } catch {
      router.push("/wallet");
    } finally {
      setIsLoadingCard(false);
    }
  }, [restaurantId, router, card?.current_stamps]);

  // Génère un nouveau QR code
  const refreshQR = useCallback(async () => {
    setIsLoadingQR(true);
    try {
      const res = await fetch(`/api/qr/generate?restaurantId=${restaurantId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
      setCountdown(QR_TTL_SECONDS);
    } catch {
      console.error("QR refresh failed");
    } finally {
      setIsLoadingQR(false);
    }
  }, [restaurantId]);

  // Initialisation
  useEffect(() => {
    fetchCard();
    refreshQR();
  }, []);// eslint-disable-line

  // Compte à rebours + refresh automatique du QR
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refreshQR();
          return QR_TTL_SECONDS;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshQR]);

  // Polling pour les mises à jour de la carte (détecte quand le vendeur ajoute des tampons)
  useEffect(() => {
    const interval = setInterval(fetchCard, 5000);
    return () => clearInterval(interval);
  }, [fetchCard]);

  // Charge l'historique
  async function loadHistory() {
    if (!card) return;
    setShowHistory(true);
    const res = await fetch(`/api/wallet/${restaurantId}/history`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data.events);
    }
  }

  if (isLoadingCard) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) return null;

  const { restaurant } = card;
  const progress = Math.min(100, (card.current_stamps / restaurant.stamps_required) * 100);
  const isComplete = card.current_stamps >= restaurant.stamps_required;
  const countdownPct = (countdown / QR_TTL_SECONDS) * 100;

  return (
    <div className="min-h-dvh bg-gray-950" style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white">{restaurant.name}</h1>
            <p className="text-xs text-gray-500">{restaurant.reward_description}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Alerte récompense */}
        {rewardFlash && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-2xl p-4 text-center animate-stamp-in">
            <p className="text-2xl mb-1">🎁</p>
            <p className="font-bold text-yellow-300">Félicitations !</p>
            <p className="text-sm text-yellow-300/80">{restaurant.reward_description}</p>
          </div>
        )}

        {/* Carte principale */}
        <div
          className="rounded-3xl p-6 border relative overflow-hidden"
          style={{
            backgroundColor: restaurant.color + "15",
            borderColor: restaurant.color + "40",
          }}
        >
          {/* Fond décoratif */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(ellipse at 100% 0%, ${restaurant.color} 0%, transparent 60%)`,
            }}
          />

          <div className="relative">
            {/* En-tête carte */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Tampons collectés</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-5xl font-black text-white">{card.current_stamps}</span>
                  <span className="text-xl text-gray-500">/ {restaurant.stamps_required}</span>
                </div>
              </div>
              {isComplete && (
                <div className="text-right">
                  <p className="text-3xl">🎁</p>
                  <p className="text-xs text-yellow-400 font-semibold mt-1">Disponible !</p>
                </div>
              )}
            </div>

            {/* Grille de tampons */}
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(10, restaurant.stamps_required)}, 1fr)` }}
            >
              {Array.from({ length: restaurant.stamps_required }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: i < card.current_stamps ? restaurant.color : "transparent",
                    borderColor: i < card.current_stamps ? restaurant.color : "rgba(255,255,255,0.15)",
                  }}
                >
                  {i < card.current_stamps && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            {/* Barre de progression */}
            <div className="mt-4 h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, backgroundColor: restaurant.color }}
              />
            </div>

            {/* Stats */}
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-500">Total gagné</p>
                <p className="text-sm font-bold text-white">{card.total_stamps_earned} 🔖</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Récompenses</p>
                <p className="text-sm font-bold text-white">{card.total_rewards_earned} 🎁</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="card text-center space-y-4">
          <div>
            <h2 className="font-semibold text-white text-sm">Montrez ce QR au vendeur</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Rafraîchissement automatique toutes les {QR_TTL_SECONDS} secondes
            </p>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              {/* QR Code */}
              <div
                className="bg-white p-4 rounded-2xl relative"
                style={{ width: 220, height: 220 }}
              >
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR Code"
                    width={188}
                    height={188}
                    className={`transition-opacity duration-200 ${isLoadingQR ? "opacity-30" : "opacity-100"}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Countdown ring */}
              <svg
                className="absolute -inset-2 -rotate-90"
                width={236}
                height={236}
                viewBox="0 0 236 236"
              >
                <circle
                  cx="118" cy="118" r="114"
                  fill="none"
                  stroke="rgba(249,115,22,0.15)"
                  strokeWidth="3"
                />
                <circle
                  cx="118" cy="118" r="114"
                  fill="none"
                  stroke="rgb(249,115,22)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 114}`}
                  strokeDashoffset={`${2 * Math.PI * 114 * (1 - countdownPct / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: countdown > 10 ? "rgb(34,197,94)" : "rgb(234,179,8)",
                animation: countdown <= 5 ? "pulse 0.5s ease-in-out infinite" : "none",
              }}
            />
            <p className="text-xs text-gray-500">
              {countdown > 5
                ? `Valide encore ${countdown}s`
                : <span className="text-yellow-400 font-medium">Expire dans {countdown}s…</span>
              }
            </p>
          </div>

          <button
            onClick={refreshQR}
            disabled={isLoadingQR}
            className="btn-secondary py-2.5 text-sm"
          >
            ↻ Regénérer maintenant
          </button>
        </div>

        {/* Historique */}
        <div className="card">
          <button
            onClick={showHistory ? () => setShowHistory(false) : loadHistory}
            className="w-full flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <span>Historique des tampons</span>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`transition-transform ${showHistory ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Aucun tampon enregistré</p>
              ) : (
                history.slice(0, 10).map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🔖</span>
                      <div>
                        <p className="text-xs text-gray-300 font-medium">
                          +{event.stamps_added} tampon{event.stamps_added > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(event.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
