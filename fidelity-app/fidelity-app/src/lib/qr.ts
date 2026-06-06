import { SignJWT, jwtVerify } from "jose";

import { QR_TTL_SECONDS } from "@/lib/constants";

function getQRSecret() {
  return new TextEncoder().encode(process.env.QR_SECRET!);
}

export interface QRPayload {
  customerId: string;
  restaurantId: string;
  type: "qr_stamp";
}

/**
 * Génère un token JWT court-terme pour le QR code du client.
 * Appelé par GET /api/qr/generate depuis la page du client.
 */
export async function generateQRToken(
  customerId: string,
  restaurantId: string
): Promise<string> {
  return await new SignJWT({
    customerId,
    restaurantId,
    type: "qr_stamp",
  } satisfies QRPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${QR_TTL_SECONDS}s`)
    .sign(getQRSecret());
}

/**
 * Vérifie un token QR scanné par le vendeur.
 * Retourne null si expiré, signature invalide, ou mauvais type.
 */
export async function verifyQRToken(
  token: string
): Promise<QRPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getQRSecret());
    if (payload.type !== "qr_stamp") return null;
    return {
      customerId: payload.customerId as string,
      restaurantId: payload.restaurantId as string,
      type: "qr_stamp",
    };
  } catch {
    return null;
  }
}

