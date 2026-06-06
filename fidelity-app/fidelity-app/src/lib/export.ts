import * as XLSX from "xlsx";
import { getSupabaseServerClient } from "./supabase-server";

export interface ExportRow {
  Date: string;
  Heure: string;
  Email_Client: string;
  ID_Client: string;
  Tampons_Ajoutés: number;
  Total_Tampons_Carte: number;
  Récompenses_Total: number;
}

/**
 * Génère un fichier Excel avec l'historique complet des tampons
 * pour un restaurant donné.
 */
export async function generateExport(
  restaurantId: string
): Promise<Buffer> {
  const db = getSupabaseServerClient();

  // Récupère tous les événements du restaurant avec infos client
  const { data: events, error } = await db
    .from("stamp_events")
    .select(`
      stamps_added,
      created_at,
      loyalty_cards!inner (
        total_stamps_earned,
        total_rewards_earned,
        customer_id,
        customers!inner (
          id,
          email
        ),
        restaurant_id
      )
    `)
    .eq("loyalty_cards.restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Export query failed: ${error.message}`);

  const rows: ExportRow[] = (events ?? []).map((event) => {
    const card = event.loyalty_cards as any;
    const customer = card.customers as any;
    const date = new Date(event.created_at);

    return {
      Date: date.toLocaleDateString("fr-FR"),
      Heure: date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      Email_Client: customer.email,
      ID_Client: customer.id.substring(0, 8).toUpperCase(),
      Tampons_Ajoutés: event.stamps_added,
      Total_Tampons_Carte: card.total_stamps_earned,
      Récompenses_Total: card.total_rewards_earned,
    };
  });

  // Métadonnées : résumé par client
  const { data: summaries } = await db
    .from("loyalty_cards")
    .select(`
      current_stamps,
      total_stamps_earned,
      total_rewards_earned,
      created_at,
      customers!inner (email, id)
    `)
    .eq("restaurant_id", restaurantId)
    .order("total_stamps_earned", { ascending: false });

  const summaryRows = (summaries ?? []).map((card) => {
    const customer = card.customers as any;
    return {
      Email: customer.email,
      ID_Client: customer.id.substring(0, 8).toUpperCase(),
      Tampons_Actuels: card.current_stamps,
      Total_Tampons: card.total_stamps_earned,
      Total_Récompenses: card.total_rewards_earned,
      Membre_Depuis: new Date(card.created_at).toLocaleDateString("fr-FR"),
    };
  });

  // Construction du classeur Excel
  const workbook = XLSX.utils.book_new();

  // Onglet 1 : Historique des tampons
  const historySheet = XLSX.utils.json_to_sheet(rows);
  historySheet["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 32 }, { wch: 12 },
    { wch: 18 }, { wch: 20 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, historySheet, "Historique Tampons");

  // Onglet 2 : Résumé clients
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 32 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Résumé Clients");

  // Génération du buffer
  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return buffer;
}
