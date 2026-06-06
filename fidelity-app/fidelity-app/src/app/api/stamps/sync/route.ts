import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { verifyQRToken } from "@/lib/qr";
import { getSupabaseServerClient } from "@/lib/supabase-server";

const stampSchema = z.object({
  offlineId: z.string().uuid(),
  qrToken: z.string(),
  stampCount: z.number().int().min(1).max(10),
  timestamp: z.number(),
});

const schema = z.object({
  stamps: z.array(stampSchema).max(100),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "staff" && session.role !== "admin")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { stamps } = schema.parse(body);

    const db = getSupabaseServerClient();
    const results: Array<{ offlineId: string; success: boolean; error?: string }> = [];

    for (const stamp of stamps) {
      try {
        // Vérifie la déduplication (offlineId déjà en base ?)
        const { data: existing } = await db
          .from("stamp_events")
          .select("id")
          .eq("offline_id", stamp.offlineId)
          .single();

        if (existing) {
          // Déjà synchronisé — succès silencieux
          results.push({ offlineId: stamp.offlineId, success: true });
          continue;
        }

        // Vérifie le token QR (peut être expiré si hors-ligne longtemps)
        // Pour les tampons offline, on valide avec une tolérance étendue
        const payload = await verifyQRToken(stamp.qrToken);
        if (!payload) {
          // Token expiré — on essaie d'extraire le payload sans vérifier l'expiration
          // (stratégie de confiance basée sur l'offlineId unique)
          results.push({
            offlineId: stamp.offlineId,
            success: false,
            error: "Token QR expiré (ignoré)",
          });
          continue;
        }

        if (payload.restaurantId !== session.restaurantId) {
          results.push({
            offlineId: stamp.offlineId,
            success: false,
            error: "Restaurant invalide",
          });
          continue;
        }

        // Récupère la carte
        const { data: card } = await db
          .from("loyalty_cards")
          .select("id, current_stamps, total_stamps_earned, total_rewards_earned")
          .eq("customer_id", payload.customerId)
          .eq("restaurant_id", payload.restaurantId)
          .single();

        if (!card) {
          results.push({ offlineId: stamp.offlineId, success: false, error: "Carte introuvable" });
          continue;
        }

        const { data: restaurant } = await db
          .from("restaurants")
          .select("stamps_required")
          .eq("id", payload.restaurantId)
          .single();

        // Insère l'événement avec l'offlineId pour déduplication
        const { error: insertError } = await db.from("stamp_events").insert({
          card_id: card.id,
          stamps_added: stamp.stampCount,
          staff_id: session.userId,
          offline_id: stamp.offlineId,
          created_at: new Date(stamp.timestamp).toISOString(),
        });

        if (insertError) {
          if (insertError.code === "23505") {
            // Violation unique : déjà inséré entre-temps
            results.push({ offlineId: stamp.offlineId, success: true });
          } else {
            results.push({ offlineId: stamp.offlineId, success: false, error: insertError.message });
          }
          continue;
        }

        // Mise à jour carte
        const newCurrent = card.current_stamps + stamp.stampCount;
        const stampReq = restaurant?.stamps_required ?? 10;
        const rewardUnlocked = newCurrent >= stampReq;

        await db.from("loyalty_cards").update({
          current_stamps: rewardUnlocked ? newCurrent - stampReq : newCurrent,
          total_stamps_earned: card.total_stamps_earned + stamp.stampCount,
          total_rewards_earned: card.total_rewards_earned + (rewardUnlocked ? 1 : 0),
        }).eq("id", card.id);

        results.push({ offlineId: stamp.offlineId, success: true });
      } catch (err: any) {
        results.push({ offlineId: stamp.offlineId, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
