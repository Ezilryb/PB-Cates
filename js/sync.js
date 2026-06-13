/**
 * js/sync.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Résilience réseau : gestion des tampons validés hors-ligne.
 *
 * FLUX HORS-LIGNE :
 *   1. Vendeur valide un tampon (Wi-Fi coupé)
 *   2. wallet.js attrape l'erreur Firestore 'unavailable'
 *   3. queueOfflineTampon() sauvegarde dans IndexedDB
 *   4. Background Sync est enregistré (si supporté)
 *   5. Dès le retour du réseau, le Service Worker appelle
 *      /api/validate-tampon pour chaque tampon en attente
 *   6. On notifie l'interface via CustomEvent 'tampon-synced'
 *
 * INDEXEDDB :
 *   Base : 'pb-cates-offline'
 *   Store : 'pending_tampons'
 *   Clé : ID auto-généré (timestamp + random)
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── Nom de la base IndexedDB ── */
const DB_NAME    = 'pb-cates-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_tampons';
const SYNC_TAG   = 'sync-tampons-offline';

/* ── Référence unique à la connexion DB ── */
let _db = null;

/* ══════════════════════════════════════════════════════════════════
   INITIALISATION DE LA BASE INDEXEDDB
══════════════════════════════════════════════════════════════════ */
async function getDB() {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    /* Création du schéma (première fois ou nouvelle version) */
    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        /* Clé auto-incrémentée + index sur cardId pour les requêtes */
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'localId'
        });
        store.createIndex('cardId',    'cardId',    { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('synced',    'synced',    { unique: false });
      }
    };

    request.onsuccess = event => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = event => reject(event.target.error);
  });
}

/* ══════════════════════════════════════════════════════════════════
   AJOUTER UN TAMPON DANS LA FILE D'ATTENTE
   Appelé par wallet.js quand Firestore est inaccessible.
══════════════════════════════════════════════════════════════════ */
export async function queueOfflineTampon({ userId, cardId, count, historyEntry }) {
  const db = await getDB();

  /* Créer un identifiant local unique */
  const localId = `tampon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const record = {
    localId,
    userId,
    cardId,
    count,
    historyEntry,
    timestamp: Date.now(),
    synced: false,
    retries: 0
  };

  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => {
      console.log('[Sync] Tampon mis en file d\'attente :', localId);

      /* Enregistrer un Background Sync si supporté */
      registerBackgroundSync();

      resolve(localId);
    };

    request.onerror = e => reject(e.target.error);
  });
}

/* ══════════════════════════════════════════════════════════════════
   RÉCUPÉRER TOUS LES TAMPONS EN ATTENTE
══════════════════════════════════════════════════════════════════ */
export async function getPendingTampons() {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const index   = store.index('synced');
    const request = index.getAll(IDBKeyRange.only(false)); /* synced = false */

    request.onsuccess = e => resolve(e.target.result);
    request.onerror   = e => reject(e.target.error);
  });
}

/* ══════════════════════════════════════════════════════════════════
   COMPTER LES TAMPONS EN ATTENTE (pour l'indicateur UI)
══════════════════════════════════════════════════════════════════ */
export async function getPendingCount() {
  const pending = await getPendingTampons();
  return pending.length;
}

/* ══════════════════════════════════════════════════════════════════
   MARQUER UN TAMPON COMME SYNCHRONISÉ
══════════════════════════════════════════════════════════════════ */
export async function markAsSynced(localId) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);

    /* Lire, modifier, réécrire */
    const getReq  = store.get(localId);

    getReq.onsuccess = e => {
      const record = e.target.result;
      if (!record) { resolve(); return; }

      record.synced  = true;
      record.syncedAt = Date.now();

      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror   = err => reject(err.target.error);
    };

    getReq.onerror = e => reject(e.target.error);
  });
}

/* ══════════════════════════════════════════════════════════════════
   SYNCHRONISATION MANUELLE (quand le réseau revient)
   Alternative à Background Sync pour les navigateurs qui ne le
   supportent pas (Safari < 15.4, Firefox).
══════════════════════════════════════════════════════════════════ */
export async function syncPendingTampons() {
  const pending = await getPendingTampons();
  if (!pending.length) return 0;

  console.log(`[Sync] Synchronisation de ${pending.length} tampon(s) hors-ligne`);

  let syncedCount = 0;

  for (const tampon of pending) {
    try {
      const response = await fetch('/api/validate-tampon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:       tampon.userId,
          cardId:       tampon.cardId,
          count:        tampon.count,
          historyEntry: tampon.historyEntry,
          localId:      tampon.localId
        })
      });

      if (response.ok) {
        await markAsSynced(tampon.localId);
        syncedCount++;
        console.log('[Sync] ✓ Tampon synchronisé :', tampon.localId);

        /* Notifier l'interface */
        window.dispatchEvent(new CustomEvent('tampon-synced', {
          detail: { cardId: tampon.cardId, count: tampon.count }
        }));
      } else {
        console.warn('[Sync] Erreur serveur pour :', tampon.localId, response.status);
        await incrementRetries(tampon.localId);
      }

    } catch (err) {
      /* Toujours hors-ligne → on réessaiera plus tard */
      console.warn('[Sync] Réseau indisponible :', err.message);
      break;
    }
  }

  return syncedCount;
}

/* ══════════════════════════════════════════════════════════════════
   INCRÉMENTER LE COMPTEUR D'ESSAIS (pour limiter les retentatives)
══════════════════════════════════════════════════════════════════ */
async function incrementRetries(localId) {
  const db = await getDB();

  return new Promise((resolve) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const get   = store.get(localId);

    get.onsuccess = e => {
      const record = e.target.result;
      if (record) {
        record.retries = (record.retries || 0) + 1;
        store.put(record);
      }
      resolve();
    };
  });
}

/* ══════════════════════════════════════════════════════════════════
   ENREGISTREMENT DU BACKGROUND SYNC
   Si le navigateur le supporte (Chrome/Edge), le SW se chargera
   de la synchronisation automatiquement au retour du réseau.
══════════════════════════════════════════════════════════════════ */
async function registerBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    /* Fallback : écouter l'événement 'online' directement */
    window.addEventListener('online', handleOnlineEvent, { once: true });
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(SYNC_TAG);
    console.log('[Sync] Background Sync enregistré :', SYNC_TAG);
  } catch (err) {
    /* Fallback si Background Sync échoue */
    console.warn('[Sync] Background Sync non disponible, fallback online :', err);
    window.addEventListener('online', handleOnlineEvent, { once: true });
  }
}

/* ══════════════════════════════════════════════════════════════════
   FALLBACK : Écouter l'événement 'online' natif du navigateur
══════════════════════════════════════════════════════════════════ */
async function handleOnlineEvent() {
  console.log('[Sync] Réseau restauré — synchronisation automatique');
  const count = await syncPendingTampons();
  if (count > 0) {
    /* Importer showToast dynamiquement pour éviter les dépendances circulaires */
    const { showToast } = await import('./ui.js');
    showToast(`${count} tampon${count > 1 ? 's' : ''} synchronisé${count > 1 ? 's' : ''}`, 'success');
  }
}

/* ══════════════════════════════════════════════════════════════════
   INDICATEUR DE STATUT RÉSEAU EN TEMPS RÉEL
   Écoute les changements online/offline et met à jour l'UI.
══════════════════════════════════════════════════════════════════ */
export function initNetworkStatusWatcher() {
  const updateStatus = async () => {
    const isOnline  = navigator.onLine;
    const pending   = await getPendingCount();
    const indicator = document.getElementById('network-indicator');

    if (indicator) {
      indicator.className = isOnline
        ? (pending > 0 ? 'syncing' : 'online')
        : 'offline';

      indicator.title = isOnline
        ? (pending > 0 ? `Synchronisation de ${pending} tampon(s)…` : 'En ligne')
        : `Hors-ligne — ${pending} tampon(s) en attente`;
    }
  };

  window.addEventListener('online',  updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus(); /* État initial */
}

/* ══════════════════════════════════════════════════════════════════
   NETTOYAGE DE LA BASE (supprimer les anciens enregistrements)
   À appeler périodiquement (ex: au démarrage de l'app)
══════════════════════════════════════════════════════════════════ */
export async function cleanupSyncedRecords(maxAgeDays = 30) {
  const db       = await getDB();
  const cutoff   = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

  return new Promise(resolve => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoff);
    const req   = index.openCursor(range);
    let   count = 0;

    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.synced) {
          cursor.delete();
          count++;
        }
        cursor.continue();
      } else {
        console.log(`[Sync] ${count} anciens enregistrements nettoyés`);
        resolve(count);
      }
    };
  });
}
