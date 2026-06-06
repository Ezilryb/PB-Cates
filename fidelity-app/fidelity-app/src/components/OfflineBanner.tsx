"use client";

import { useEffect, useState } from "react";
import { syncPendingStamps, getPendingCount } from "@/lib/offline";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done">("idle");

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const refresh = async () => setPendingCount(await getPendingCount());
    refresh();

    const interval = setInterval(refresh, 3000);

    const onOnline = async () => {
      setIsOnline(true);
      const count = await getPendingCount();
      if (count > 0) {
        setSyncStatus("syncing");
        await syncPendingStamps();
        setSyncStatus("done");
        setPendingCount(0);
        setTimeout(() => setSyncStatus("idle"), 3000);
      }
    };

    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (isOnline && pendingCount === 0 && syncStatus === "idle") return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-50 py-2 px-4 text-center text-xs font-medium transition-all ${
        !isOnline
          ? "bg-red-500/90 text-white"
          : syncStatus === "syncing"
          ? "bg-yellow-500/90 text-black"
          : syncStatus === "done"
          ? "bg-green-500/90 text-white"
          : "bg-yellow-500/90 text-black"
      }`}
    >
      {!isOnline && `📡 Hors-ligne — ${pendingCount} tampon${pendingCount > 1 ? "s" : ""} en attente`}
      {isOnline && syncStatus === "syncing" && "↑ Synchronisation des tampons…"}
      {isOnline && syncStatus === "done" && "✓ Tampons synchronisés avec succès"}
      {isOnline && syncStatus === "idle" && pendingCount > 0 &&
        `⚠️ ${pendingCount} tampon${pendingCount > 1 ? "s" : ""} en attente de sync`}
    </div>
  );
}
