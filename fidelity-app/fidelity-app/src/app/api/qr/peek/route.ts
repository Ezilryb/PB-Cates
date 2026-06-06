import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { verifyQRToken } from "@/lib/qr";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Permet au vendeur de voir les infos du client AVANT de confirmer le tampon
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "staff" && session.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 400 });

    // Vérifie le token QR
    const payload = await verifyQRToken(token);
    if (!payload) {
      return NextResponse.json({ error: "QR code expiré ou invalide" }, { status: 410 });
    }

    // Vérifie que c'est bien le bon restaurant
    if (payload.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: "QR code d'un autre établissement" }, { status: 403 });
    }

    const db = getSupabaseServerClient();

    // Récupère infos client + carte
    const { data: customer } = await db
      .from("customers")
      .select("email")
      .eq("id", payload.customerId)
      .single();

    const { data: card } = await db
      .from("loyalty_cards")
      .select("current_stamps, restaurant:restaurants(stamps_required)")
      .eq("customer_id", payload.customerId)
      .eq("restaurant_id", payload.restaurantId)
      .single();

    return NextResponse.json({
      email: customer?.email ?? "Client inconnu",
      currentStamps: card?.current_stamps ?? 0,
      stampsRequired: (card?.restaurant as any)?.stamps_required ?? 10,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
