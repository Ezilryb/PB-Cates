import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { WalletCard } from "@/types";

export const revalidate = 0; // Toujours fresh

async function getWalletCards(customerId: string): Promise<WalletCard[]> {
  const db = getSupabaseServerClient();

  // Récupère tous les restos actifs
  const { data: restaurants } = await db
    .from("restaurants")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (!restaurants?.length) return [];

  // Récupère ou crée les cartes du client
  const cards: WalletCard[] = [];
  for (const restaurant of restaurants) {
    let { data: card } = await db
      .from("loyalty_cards")
      .select("*")
      .eq("customer_id", customerId)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (!card) {
      const { data: newCard } = await db
        .from("loyalty_cards")
        .insert({ customer_id: customerId, restaurant_id: restaurant.id })
        .select("*")
        .single();
      card = newCard;
    }

    if (card) {
      cards.push({ ...card, restaurant });
    }
  }

  return cards;
}

export default async function WalletPage() {
  const session = await getSession();
  if (!session || session.role !== "customer") redirect("/login");

  const cards = await getWalletCards(session.userId);

  return (
    <div className="min-h-dvh bg-gray-950 pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-bold text-white text-lg">Mes cartes</h1>
            <p className="text-xs text-gray-500">{session.email}</p>
          </div>
          <Link
            href="/api/auth/logout"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg border border-white/10"
          >
            Déconnexion
          </Link>
        </div>
      </header>

      {/* Liste des cartes */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {cards.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-3">🎟️</p>
            <p className="text-gray-400">Aucun restaurant disponible pour l'instant.</p>
          </div>
        ) : (
          cards.map((card) => (
            <Link
              key={card.id}
              href={`/wallet/${card.restaurant_id}`}
              className="block group"
            >
              <div
                className="rounded-2xl p-5 border border-white/10 transition-all duration-200 
                           active:scale-[0.98] hover:brightness-110 relative overflow-hidden"
                style={{ backgroundColor: card.restaurant.color + "20", borderColor: card.restaurant.color + "40" }}
              >
                {/* Fond décoratif */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    background: `radial-gradient(circle at 80% 50%, ${card.restaurant.color}, transparent 60%)`,
                  }}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-white text-lg truncate">
                      {card.restaurant.name}
                    </h2>
                    {card.restaurant.description && (
                      <p className="text-sm text-gray-400 mt-0.5 truncate">
                        {card.restaurant.description}
                      </p>
                    )}

                    {/* Barre de progression tampons */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{card.current_stamps} / {card.restaurant.stamps_required} tampons</span>
                        {card.total_rewards_earned > 0 && (
                          <span className="text-orange-400">
                            🎁 ×{card.total_rewards_earned}
                          </span>
                        )}
                      </div>
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, (card.current_stamps / card.restaurant.stamps_required) * 100)}%`,
                            backgroundColor: card.restaurant.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Grille de tampons (miniature) */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Array.from({ length: card.restaurant.stamps_required }).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border transition-all"
                          style={{
                            backgroundColor: i < card.current_stamps
                              ? card.restaurant.color
                              : "transparent",
                            borderColor: i < card.current_stamps
                              ? card.restaurant.color
                              : "rgba(255,255,255,0.15)",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-gray-400 group-hover:text-white transition-colors mt-1">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
