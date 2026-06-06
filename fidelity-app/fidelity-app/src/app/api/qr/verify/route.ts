import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { verifyQRToken } from "@/lib/qr";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { QRVerifyResult } from "@/types";

const schema = z.object({
  token: z.string(),
  stampCount: z.number().int().min(1).max(10),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "staff" && session.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { token, stampCount } = schema.parse(body);

    // 1. Vérifie le token QR
    const payload = await verifyQRToken(token);
    if (!payload) {
      return NextResponse.json<QRVerifyResult>(
        { success: false, error: "QR code expiré ou invalide. Demandez au client de rafraîchir." },
        { status: 410 }
      );
    }

    // 2. Vérifie que c'est le bon restaurant
    if (payload.restaurantId !== session.restaurantId) {
      return NextResponse.json<QRVerifyResult>(
        { success: false, error: "QR code d'un autre établissement." },
        { status: 403 }
      );
    }

    const db = getSupabaseServerClient();

    // 3. Charge restaurant (paramètres anti-fraude)
    const { data: restaurant } = await db
      .from("restaurants")
      .select("stamps_required, multi_stamp_enabled, max_stamps_per_visit, max_stamps_per_day")
      .eq("id", payload.restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json<QRVerifyResult>({ success: false, error: "Restaurant introuvable." }, { status: 404 });
    }

    // 4. Contrôle multi-tampon
    const allowedStamps = restaurant.multi_stamp_enabled
      ? Math.min(stampCount, restaurant.max_stamps_per_visit)
      : 1;

    // 5. Contrôle anti-fraude journalier
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: card } = await db
      .from("loyalty_cards")
      .select("id, current_stamps, total_stamps_earned, total_rewards_earned")
      .eq("customer_id", payload.customerId)
      .eq("restaurant_id", payload.restaurantId)
      .single();

    if (!card) {
      return NextResponse.json<QRVerifyResult>({ success: false, error: "Carte introuvable." }, { status: 404 });
    }

    // Compte les tampons d'aujourd'hui pour ce client sur ce restaurant
    const { data: todayEvents } = await db
      .from("stamp_events")
      .select("stamps_added")
      .eq("card_id", card.id)
      .gte("created_at", todayStart.toISOString());

    const stampsToday = (todayEvents ?? []).reduce((s, e) => s + e.stamps_added, 0);
    const remainingToday = restaurant.max_stamps_per_day - stampsToday;

    if (remainingToday <= 0) {
      return NextResponse.json<QRVerifyResult>({
        success: false,
        error: `Limite journalière atteinte pour ce client (${restaurant.max_stamps_per_day} tampons/jour).`,
      }, { status: 429 });
    }

    const finalStamps = Math.min(allowedStamps, remainingToday);

    // 6. Calcule nouveau total et récompenses
    const newCurrentStamps = card.current_stamps + finalStamps;
    const newTotalEarned = card.total_stamps_earned + finalStamps;
    let rewardUnlocked = false;
    let newCurrentAfterReward = newCurrentStamps;
    let newRewardsTotal = card.total_rewards_earned;

    // Si le seuil de récompense est atteint, on remet le compteur à zéro
    if (newCurrentStamps >= restaurant.stamps_required) {
      rewardUnlocked = true;
      newCurrentAfterReward = newCurrentStamps - restaurant.stamps_required;
      newRewardsTotal++;
    }

    // 7. Transaction : enregistre l'événement + met à jour la carte
    const { error: eventError } = await db.from("stamp_events").insert({
      card_id: card.id,
      stamps_added: finalStamps,
      staff_id: session.userId,
    });

    if (eventError) throw new Error(eventError.message);

    const { error: updateError } = await db
      .from("loyalty_cards")
      .update({
        current_stamps: newCurrentAfterReward,
        total_stamps_earned: newTotalEarned,
        total_rewards_earned: newRewardsTotal,
      })
      .eq("id", card.id);

    if (updateError) throw new Error(updateError.message);

    // 8. Enregistre la rédemption si récompense débloquée
    if (rewardUnlocked) {
      await db.from("reward_redemptions").insert({
        card_id: card.id,
        staff_id: session.userId,
      });
    }

    return NextResponse.json<QRVerifyResult>({
      success: true,
      customerId: payload.customerId,
      cardId: card.id,
      stampsAdded: finalStamps,
      newTotal: newCurrentAfterReward,
      rewardUnlocked,
    });
  } catch (err: any) {
    const message = err?.errors?.[0]?.message ?? err?.message ?? "Erreur interne";
    return NextResponse.json<QRVerifyResult>({ success: false, error: message }, { status: 500 });
  }
}
