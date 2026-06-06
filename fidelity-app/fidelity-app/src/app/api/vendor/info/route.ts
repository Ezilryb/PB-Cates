import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "staff" && session.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const db = getSupabaseServerClient();

    const { data: restaurant } = await db
      .from("restaurants")
      .select("name, color, multi_stamp_enabled, max_stamps_per_visit")
      .eq("id", session.restaurantId!)
      .single();

    return NextResponse.json({
      email: session.email,
      restaurantName: restaurant?.name ?? "Restaurant",
      restaurantColor: restaurant?.color ?? "#f97316",
      multiStampEnabled: restaurant?.multi_stamp_enabled ?? false,
      maxStampsPerVisit: restaurant?.max_stamps_per_visit ?? 1,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
