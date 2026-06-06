import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { generateQRToken } from "@/lib/qr";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");
    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
    }

    // Génère le token JWT signé (expire dans 30s)
    const token = await generateQRToken(session.userId, restaurantId);

    // Encode en QR code PNG (data URL base64)
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: "M",
      width: 380,
      margin: 1,
      color: {
        dark: "#111827",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({ qrDataUrl, expiresIn: 30 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
