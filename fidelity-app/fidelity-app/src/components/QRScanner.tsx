"use client";

import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onDetected: (token: string) => void;
}

export default function QRScanner({ onDetected }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string>("");
  const [hasCamera, setHasCamera] = useState(true);
  const detectedRef = useRef(false); // Évite les détections multiples

  useEffect(() => {
    let mounted = true;

    async function initScanner() {
      try {
        // Import dynamique pour éviter les erreurs SSR
        const QrScannerModule = await import("qr-scanner");
        const QrScanner = QrScannerModule.default;

        if (!videoRef.current || !mounted) return;

        const scanner = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            if (detectedRef.current) return;
            detectedRef.current = true;

            // Feedback vibration si disponible
            if ("vibrate" in navigator) navigator.vibrate(50);

            onDetected(result.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
            preferredCamera: "environment", // Caméra arrière
          }
        );

        scannerRef.current = scanner;

        // Vérifie disponibilité caméra
        const cameras = await QrScanner.listCameras(true);
        if (cameras.length === 0) {
          setHasCamera(false);
          setError("Aucune caméra détectée sur cet appareil.");
          return;
        }

        await scanner.start();
      } catch (err: any) {
        if (!mounted) return;
        if (err.name === "NotAllowedError") {
          setError("Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur.");
        } else if (err.name === "NotFoundError") {
          setError("Aucune caméra disponible.");
          setHasCamera(false);
        } else {
          setError(`Erreur caméra : ${err.message}`);
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [onDetected]);

  if (!hasCamera) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-4xl">📷</p>
        <p className="text-gray-400 text-sm">Caméra non disponible</p>
        <p className="text-gray-500 text-xs">
          Utilisez un appareil avec caméra (smartphone, tablette) pour scanner les QR codes.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full aspect-square object-cover"
        playsInline
        muted
      />

      {/* Overlay cadre de scan */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-56 h-56">
          {/* Coins du cadre */}
          {[
            "top-0 left-0 border-t-2 border-l-2",
            "top-0 right-0 border-t-2 border-r-2",
            "bottom-0 left-0 border-b-2 border-l-2",
            "bottom-0 right-0 border-b-2 border-r-2",
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 border-orange-500 rounded-sm ${cls}`}
            />
          ))}

          {/* Ligne de scan animée */}
          <div className="absolute inset-x-2 top-0 h-0.5 bg-orange-500/60 animate-bounce" />
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Instruction */}
      {!error && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
          <p className="text-white/70 text-xs">Centrez le QR code dans le cadre</p>
        </div>
      )}
    </div>
  );
}
