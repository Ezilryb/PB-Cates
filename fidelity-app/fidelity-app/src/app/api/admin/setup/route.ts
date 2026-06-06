import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = getSupabaseServerClient();
  const { data: staff } = await db
    .from("staff_accounts")
    .select("id, email, role, created_at")
    .eq("restaurant_id", session.restaurantId!)
    .order("created_at");

  return NextResponse.json({ staff: staff ?? [] });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add_staff"),
    email: z.string().email(),
    role: z.enum(["staff", "admin"]),
  }),
  z.object({
    action: z.literal("remove_staff"),
    staffId: z.string().uuid(),
  }),
]);

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = actionSchema.parse(body);
    const db = getSupabaseServerClient();

    if (parsed.action === "add_staff") {
      // Vérifie que l'email n'est pas déjà dans un autre restaurant
      const { data: existing } = await db
        .from("staff_accounts")
        .select("id, restaurant_id")
        .eq("email", parsed.email)
        .single();

      if (existing && existing.restaurant_id !== session.restaurantId) {
        return NextResponse.json(
          { error: "Cet email est déjà associé à un autre restaurant." },
          { status: 409 }
        );
      }
      if (existing) {
        return NextResponse.json(
          { error: "Cet email a déjà accès à votre restaurant." },
          { status: 409 }
        );
      }

      const { error } = await db.from("staff_accounts").insert({
        restaurant_id: session.restaurantId!,
        email: parsed.email,
        role: parsed.role,
      });

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    if (parsed.action === "remove_staff") {
      // Empêche l'admin de se supprimer lui-même
      if (parsed.staffId === session.userId) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas supprimer votre propre compte." },
          { status: 400 }
        );
      }

      await db
        .from("staff_accounts")
        .delete()
        .eq("id", parsed.staffId)
        .eq("restaurant_id", session.restaurantId!);

      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
