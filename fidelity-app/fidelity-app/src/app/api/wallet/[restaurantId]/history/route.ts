import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(
  req: Request,
  { params }: { params: { restaurantId: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    // Trouve la carte du client
    const { data: card } = await db
      .from("loyalty_cards")
      .select("id")
      .eq("customer_id", session.userId)
      .eq("restaurant_id", params.restaurantId)
      .single();

    if (!card) {
      return NextResponse.json({ events: [] });
    }

    // Récupère l'historique (50 derniers)
    const { data: events } = await db
      .from("stamp_events")
      .select("id, stamps_added, created_at")
      .eq("card_id", card.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ events: events ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
