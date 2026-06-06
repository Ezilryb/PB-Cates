import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAndStoreOTP } from "@/lib/auth";
import { sendOTPEmail } from "@/lib/email";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const schema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Vérifie si c'est un compte staff pour personnaliser l'email
    const db = getSupabaseServerClient();
    const { data: staff } = await db
      .from("staff_accounts")
      .select("restaurant_id")
      .eq("email", email.toLowerCase())
      .single();

    let restaurantName: string | undefined;
    if (staff) {
      const { data: restaurant } = await db
        .from("restaurants")
        .select("name")
        .eq("id", staff.restaurant_id)
        .single();
      restaurantName = restaurant?.name;
    }

    const code = await generateAndStoreOTP(email);
    await sendOTPEmail(email, code, restaurantName);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.message ?? err?.message ?? "Erreur interne";
    const status = err?.errors ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
