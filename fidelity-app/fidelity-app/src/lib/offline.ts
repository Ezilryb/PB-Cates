"use client";
// ============================================================
// File d'attente hors-ligne via IndexedDB
// Utilisé exclusivement côté client (vendor page)
// ============================================================
import { openDB, type IDBPDatabase } from "idb";
import type { PendingStamp } from "@/types";

const DB_NAME = "fidelity-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_stamps";

let db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "offlineId" });
      }
    },
  });
  return db;
}

/** Ajoute un tampon à la file d'attente hors-ligne */
export async function queueStamp(stamp: PendingStamp): Promise<void> {
  const database = await getDB();
  await database.put(STORE_NAME, stamp);
}

/** Retourne tous les tampons en attente */
export async function getPendingStamps(): Promise<PendingStamp[]> {
  const database = await getDB();
  return database.getAll(STORE_NAME);
}

/** Supprime un tampon de la file (après synchronisation réussie) */
export async function removePendingStamp(offlineId: string): Promise<void> {
  const database = await getDB();
  await database.delete(STORE_NAME, offlineId);
}

/** Vide la file d'attente complète */
export async function clearQueue(): Promise<void> {
  const database = await getDB();
  await database.clear(STORE_NAME);
}

/** Compte les tampons en attente */
export async function getPendingCount(): Promise<number> {
  const database = await getDB();
  return database.count(STORE_NAME);
}

/**
 * Synchronise les tampons en attente avec le serveur.
 * Retourne le nombre de tampons synchronisés avec succès.
 */
export async function syncPendingStamps(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await getPendingStamps();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  const response = await fetch("/api/stamps/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stamps: pending }),
  });

  if (!response.ok) {
    return { synced: 0, failed: pending.length };
  }

  const result = (await response.json()) as {
    results: Array<{ offlineId: string; success: boolean }>;
  };

  for (const item of result.results) {
    if (item.success) {
      await removePendingStamp(item.offlineId);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
}
