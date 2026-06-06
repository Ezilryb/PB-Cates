import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const revalidate = 0;

async function getStats(restaurantId: string) {
  const db = getSupabaseServerClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalCustomers },
    { count: activeCards },
    { data: weeklyEvents },
    { data: recentEvents },
    { data: restaurant },
  ] = await Promise.all([
    db.from("loyalty_cards").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    db.from("loyalty_cards").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId).gt("current_stamps", 0),
    db.from("stamp_events").select("stamps_added, loyalty_cards!inner(restaurant_id)")
      .eq("loyalty_cards.restaurant_id", restaurantId)
      .gte("stamp_events.created_at", oneWeekAgo),
    db.from("stamp_events")
      .select(`
        id, stamps_added, created_at,
        loyalty_cards!inner (
          restaurant_id,
          customers!inner(email)
        )
      `)
      .eq("loyalty_cards.restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(10),
    db.from("restaurants").select("*").eq("id", restaurantId).single(),
  ]);

  const stampsThisWeek = (weeklyEvents ?? []).reduce(
    (sum, e) => sum + (e.stamps_added ?? 0),
    0
  );

  const { count: rewardsGiven } = await db
    .from("reward_redemptions")
    .select("*", { count: "exact", head: true })
    .eq("loyalty_cards.restaurant_id", restaurantId);

  return {
    restaurant,
    totalCustomers: totalCustomers ?? 0,
    activeCards: activeCards ?? 0,
    stampsThisWeek,
    rewardsGiven: rewardsGiven ?? 0,
    recentEvents: (recentEvents ?? []).map((e) => ({
      id: e.id,
      stamps_added: e.stamps_added,
      created_at: e.created_at,
      customer_email: (e.loyalty_cards as any)?.customers?.email ?? "—",
    })),
  };
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");

  const stats = await getStats(session.restaurantId!);

  const statCards = [
    { label: "Clients inscrits", value: stats.totalCustomers, icon: "👥", color: "blue" },
    { label: "Cartes actives", value: stats.activeCards, icon: "🎟️", color: "orange" },
    { label: "Tampons (7j)", value: stats.stampsThisWeek, icon: "🔖", color: "green" },
    { label: "Récompenses", value: stats.rewardsGiven, icon: "🎁", color: "purple" },
  ];

  return (
    <div className="min-h-dvh bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-xl border-b border-white/5 px-5 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div>
            <h1 className="font-bold text-white">{stats.restaurant?.name ?? "Administration"}</h1>
            <p className="text-xs text-gray-500">{session.email} · Admin</p>
          </div>
          <a href="/api/auth/logout" className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-white/10">
            Déconnexion
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="card">
              <p className="text-2xl mb-2">{s.icon}</p>
              <p className="text-3xl font-black text-white">{s.value.toLocaleString("fr-FR")}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Navigation admin */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/admin/settings", icon: "⚙️", label: "Paramètres", desc: "Règles métier & récompenses" },
            { href: "/admin/export", icon: "📊", label: "Export données", desc: "Télécharger Excel" },
            { href: "/vendor", icon: "📷", label: "Mode caisse", desc: "Scanner des tampons" },
            { href: "/admin/setup", icon: "🏪", label: "Configurer", desc: "Restaurant & staff" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="card hover:bg-white/10 transition-colors active:scale-[0.97] block">
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="font-semibold text-white text-sm">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Activité récente */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Activité récente</h2>
          {stats.recentEvents.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Aucune activité pour l'instant</p>
          ) : (
            <div className="space-y-1">
              {stats.recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-sm">
                      🔖
                    </div>
                    <div>
                      <p className="text-sm text-gray-200 font-medium truncate max-w-[200px]">
                        {event.customer_email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-orange-400 font-bold text-sm">+{event.stamps_added}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
