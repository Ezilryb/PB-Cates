"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type { QRVerifyResult } from "@/types";
import {
  queueStamp,
  getPendingCount,
  syncPendingStamps,
} from "@/lib/offline";


// Le scanner QR est client-only (accès caméra)
const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-square bg-gray-900 rounded-2xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  ),
});

type ScanState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "confirm"; token: string; customerEmail: string; currentStamps: number; stampsRequired: number }
  | { type: "success"; result: QRVerifyResult }
  | { type: "error"; message: string };

export default function VendorPage() {
  const [scanState, setScanState] = useState<ScanState>({ type: "idle" });
  const [stampCount, setStampCount] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{
    email: string;
    restaurantName: string;
    maxStampsPerVisit: number;
    multiStampEnabled: boolean;
    restaurantColor: string;
  } | null>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);

  // Charge les infos staff
  useEffect(() => {
    fetch("/api/vendor/info")
      .then((r) => r.json())
      .then(setStaffInfo)
      .catch(console.error);
  }, []);

  // Surveillance réseau
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Compte des tampons en attente
  useEffect(() => {
    const refresh = async () => setPendingCount(await getPendingCount());
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync manuelle / automatique
  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const { synced } = await syncPendingStamps();
    if (synced > 0) setPendingCount(await getPendingCount());
    setIsSyncing(false);
  }, [isSyncing]);

  // Callback du scanner QR
  const handleQRDetected = useCallback(
    async (token: string) => {
      if (scanState.type !== "scanning") return;

      // Si offline : on met en file directement sans vérifier le token
      if (!isOnline) {
        setScanState({
          type: "confirm",
          token,
          customerEmail: "Client (hors-ligne)",
          currentStamps: -1, // Inconnu
          stampsRequired: staffInfo?.maxStampsPerVisit ?? 10,
        });
        return;
      }

      // En ligne : pre-vérifie le token pour afficher les infos client
      try {
        const res = await fetch("/api/qr/peek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          setScanState({ type: "error", message: "QR code expiré ou invalide. Demandez au client de rafraîchir." });
          return;
        }
        const data = await res.json();
        setScanState({
          type: "confirm",
          token,
          customerEmail: data.email,
          currentStamps: data.currentStamps,
          stampsRequired: data.stampsRequired,
        });
      } catch {
        setScanState({ type: "error", message: "Erreur réseau lors de la lecture du QR." });
      }
    },
    [scanState.type, isOnline, staffInfo]
  );

  // Confirmation du tampon
  async function handleConfirmStamp() {
    if (scanState.type !== "confirm") return;
    const { token } = scanState;

    if (!isOnline) {
      // Mode hors-ligne : file d'attente
      await queueStamp({
        offlineId: crypto.randomUUID(),
        qrToken: token,
        stampCount,
        restaurantId: staffInfo?.restaurantName ?? "",
        timestamp: Date.now(),
      });
      setScanState({
        type: "success",
        result: { success: true, stampsAdded: stampCount },
      });
      return;
    }

    try {
      const res = await fetch("/api/qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, stampCount }),
      });
      const result: QRVerifyResult = await res.json();

      if (!result.success) {
        setScanState({ type: "error", message: result.error ?? "Erreur lors de l'ajout du tampon." });
        return;
      }
      setScanState({ type: "success", result });
    } catch {
      // Si la requête échoue (réseau coupé entre temps) : file d'attente
      await queueStamp({
        offlineId: crypto.randomUUID(),
        qrToken: token,
        stampCount,
        restaurantId: "",
        timestamp: Date.now(),
      });
      setScanState({
        type: "success",
        result: { success: true, stampsAdded: stampCount },
      });
    }
  }

  const reset = () => {
    setScanState({ type: "idle" });
    setStampCount(1);
  };

  const brandColor = staffInfo?.restaurantColor ?? "#f97316";

  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-bold text-white">
              {staffInfo?.restaurantName ?? "Caisse"}
            </h1>
            <p className="text-xs text-gray-500">{staffInfo?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicateur réseau */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: isOnline ? "rgb(34,197,94,0.15)" : "rgb(239,68,68,0.15)",
                color: isOnline ? "rgb(74,222,128)" : "rgb(252,165,165)",
              }}>
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400 animate-pulse"}`} />
              {isOnline ? "En ligne" : "Hors-ligne"}
            </div>
            <a href="/api/auth/logout" className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-white/10">
              ⎋
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Bannière sync offline */}
        {pendingCount > 0 && (
          <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-yellow-300 font-semibold text-sm">
                {pendingCount} tampon{pendingCount > 1 ? "s" : ""} en attente
              </p>
              <p className="text-yellow-300/60 text-xs mt-0.5">
                {isOnline ? "Synchronisation disponible" : "En attente du réseau"}
              </p>
            </div>
            {isOnline && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-semibold rounded-xl border border-yellow-500/30 transition-colors"
              >
                {isSyncing ? "…" : "Sync ↑"}
              </button>
            )}
          </div>
        )}

        {/* État : Idle */}
        {scanState.type === "idle" && (
          <div className="space-y-4">
            <div className="card text-center py-8 space-y-4">
              <p className="text-5xl">📷</p>
              <div>
                <h2 className="font-bold text-white text-lg">Scanner un tampon</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Demandez au client d'ouvrir sa carte fidélité et scannez son QR code.
                </p>
              </div>
              <button
                onClick={() => setScanState({ type: "scanning" })}
                className="btn-primary"
                style={{ backgroundColor: brandColor }}
              >
                Ouvrir le scanner →
              </button>
            </div>
          </div>
        )}

        {/* État : Scanning */}
        {scanState.type === "scanning" && (
          <div className="space-y-4">
            <div className="card overflow-hidden p-0">
              <QRScanner onDetected={handleQRDetected} />
            </div>
            <p className="text-center text-sm text-gray-500">
              Pointez la caméra vers le QR code du client
            </p>
            <button onClick={reset} className="btn-secondary">
              ✕ Annuler
            </button>
          </div>
        )}

        {/* État : Confirmation */}
        {scanState.type === "confirm" && (
          <div className="space-y-4">
            <div className="card space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: brandColor + "20" }}>
                  🎟️
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {scanState.customerEmail}
                  </p>
                  {scanState.currentStamps >= 0 && (
                    <p className="text-sm text-gray-400">
                      {scanState.currentStamps} tampon{scanState.currentStamps > 1 ? "s" : ""} actuellement
                    </p>
                  )}
                </div>
              </div>

              {/* Sélecteur de tampons */}
              {staffInfo?.multiStampEnabled && (staffInfo?.maxStampsPerVisit ?? 1) > 1 ? (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Combien de tampons ?</p>
                  <div className="flex gap-2">
                    {Array.from({ length: staffInfo.maxStampsPerVisit }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setStampCount(n)}
                        className="flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all"
                        style={{
                          borderColor: stampCount === n ? brandColor : "rgba(255,255,255,0.1)",
                          backgroundColor: stampCount === n ? brandColor + "20" : "transparent",
                          color: stampCount === n ? "white" : "rgb(156,163,175)",
                        }}
                      >
                        ×{n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-gray-400 text-sm">Tampon unique</p>
                  <p className="text-3xl font-black text-white">×1</p>
                </div>
              )}

              <button
                onClick={handleConfirmStamp}
                className="btn-primary py-4 text-base font-bold"
                style={{ backgroundColor: brandColor }}
              >
                ✓ Valider {stampCount} tampon{stampCount > 1 ? "s" : ""}
                {!isOnline && " (hors-ligne)"}
              </button>
              <button onClick={reset} className="btn-secondary py-2.5 text-sm">
                ✕ Annuler
              </button>
            </div>
          </div>
        )}

        {/* État : Succès */}
        {scanState.type === "success" && (
          <div className="card text-center space-y-5 py-10">
            {scanState.result.rewardUnlocked ? (
              <>
                <p className="text-6xl animate-stamp-in">🎁</p>
                <div>
                  <h2 className="text-2xl font-black text-white">Récompense débloquée !</h2>
                  <p className="text-gray-400 mt-1 text-sm">
                    Le client peut récupérer sa récompense.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl animate-stamp-in"
                  style={{ backgroundColor: brandColor + "20" }}
                >
                  ✓
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    +{scanState.result.stampsAdded} tampon{(scanState.result.stampsAdded ?? 0) > 1 ? "s" : ""} validé{(scanState.result.stampsAdded ?? 0) > 1 ? "s" : ""}
                  </h2>
                  {scanState.result.newTotal !== undefined && (
                    <p className="text-gray-400 text-sm mt-1">
                      Total : {scanState.result.newTotal} / {staffInfo ? "?" : "?"} tampons
                    </p>
                  )}
                  {!isOnline && (
                    <p className="text-yellow-400 text-xs mt-2">
                      📡 Synchronisation dès le retour du réseau
                    </p>
                  )}
                </div>
              </>
            )}

            <button
              onClick={reset}
              className="btn-primary"
              style={{ backgroundColor: brandColor }}
            >
              Scanner un autre client →
            </button>
          </div>
        )}

        {/* État : Erreur */}
        {scanState.type === "error" && (
          <div className="card text-center space-y-5 py-8">
            <p className="text-5xl">⚠️</p>
            <div>
              <h2 className="font-bold text-white">Scan invalide</h2>
              <p className="text-gray-400 text-sm mt-2">{scanState.message}</p>
            </div>
            <button onClick={() => setScanState({ type: "scanning" })} className="btn-primary">
              Réessayer
            </button>
            <button onClick={reset} className="btn-secondary py-2.5 text-sm">
              Retour
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
