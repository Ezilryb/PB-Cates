import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  reward_description: z.string().min(1).max(200),
  stamps_required: z.number().int().min(3).max(30),
  multi_stamp_enabled: z.boolean(),
  max_stamps_per_visit: z.number().int().min(1).max(10),
  max_stamps_per_day: z.number().int().min(1).max(50),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const db = getSupabaseServerClient();
  const { data: restaurant, error } = await db
    .from("restaurants")
    .select("*")
    .eq("id", session.restaurantId!)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
  }

  return NextResponse.json({ restaurant });
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const updates = updateSchema.parse(body);

    const db = getSupabaseServerClient();
    const { error } = await db
      .from("restaurants")
      .update(updates)
      .eq("id", session.restaurantId!);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
