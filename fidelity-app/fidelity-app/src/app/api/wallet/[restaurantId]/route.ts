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

    const { data: card } = await db
      .from("loyalty_cards")
      .select(`*, restaurant:restaurants(*)`)
      .eq("customer_id", session.userId)
      .eq("restaurant_id", params.restaurantId)
      .single();

    if (!card) {
      return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
