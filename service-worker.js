/**
 * service-worker.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Stratégie de cache :
 *   • Ressources statiques (shell) : Cache First (toujours rapide)
 *   • API Firebase / Firestore    : Network First avec fallback cache
 *   • Tampons hors-ligne          : Background Sync via IndexedDB
 *
 * Ce fichier est enregistré depuis firebase.js avec :
 *   navigator.serviceWorker.register('/service-worker.js')
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ── Nom et version du cache (à incrémenter à chaque déploiement) ── */
const CACHE_NAME    = 'pb-cates-v2';
const SYNC_TAG      = 'sync-tampons-offline';

/* ── Ressources du "App Shell" à mettre en cache immédiatement ── */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/firebase.js',
  '/js/auth.js',
  '/js/wallet.js',
  '/js/sync.js',
  /* Polices Google (si pré-chargées localement en production) */
  /* '/assets/fonts/PlayfairDisplay.woff2', */
  /* '/assets/fonts/DMSans.woff2', */
];

/* ══════════════════════════════════════════════════════════════════
   ÉVÉNEMENT INSTALL
   Pré-cache le shell de l'application dès l'installation du SW
══════════════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log('[SW] Installation — mise en cache du shell');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => {
        /* Prendre le contrôle immédiatement sans attendre le rechargement */
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Erreur de mise en cache :', err))
  );
});

/* ══════════════════════════════════════════════════════════════════
   ÉVÉNEMENT ACTIVATE
   Nettoie les anciens caches lors d'une mise à jour du SW
══════════════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log('[SW] Activation — nettoyage des anciens caches');

  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Suppression ancien cache :', name);
              return caches.delete(name);
            })
        )
      )
      /* Prendre le contrôle de tous les onglets ouverts immédiatement */
      .then(() => self.clients.claim())
  );
});

/* ══════════════════════════════════════════════════════════════════
   ÉVÉNEMENT FETCH
   Intercepte chaque requête réseau et applique la bonne stratégie
══════════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* ── 1. Ignorer les requêtes non-GET et les extensions Chrome ── */
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* ── 2. Requêtes Firebase / Firestore → Network First ── */
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  /* ── 3. Google Fonts (CDN) → Stale While Revalidate ── */
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  /* ── 4. Assets de l'App Shell → Cache First ── */
  event.respondWith(cacheFirstStrategy(event.request));
});

/* ══════════════════════════════════════════════════════════════════
   STRATÉGIE : Cache First
   Répond depuis le cache ; si absent, va chercher sur le réseau
   et met en cache le résultat pour la prochaine fois.
══════════════════════════════════════════════════════════════════ */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    /* Ne mettre en cache que les réponses valides */
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    /* Hors-ligne et pas en cache : retourner la page principale */
    const fallback = await caches.match('/index.html');
    return fallback || new Response('Hors-ligne — PB-Cates', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   STRATÉGIE : Network First
   Tente le réseau en priorité ; si échec, répond depuis le cache.
   Idéal pour les données Firestore (toujours fraîches si réseau ok).
══════════════════════════════════════════════════════════════════ */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    /* Réseau indisponible : servir depuis le cache */
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response(JSON.stringify({ offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   STRATÉGIE : Stale While Revalidate
   Répond depuis le cache immédiatement, puis rafraîchit en arrière-plan.
   Idéal pour les polices et assets CDN (performances maximales).
══════════════════════════════════════════════════════════════════ */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  /* Mise à jour en arrière-plan (sans bloquer la réponse) */
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  return cachedResponse || fetchPromise;
}

/* ══════════════════════════════════════════════════════════════════
   BACKGROUND SYNC — Synchronisation des tampons hors-ligne
   ─────────────────────────────────────────────────────────────────
   Quand le serveur est indisponible lors d'une validation de tampon,
   l'action est stockée dans IndexedDB (via sync.js côté client).
   Dès que le réseau revient, ce handler relit la file et envoie
   les tampons en attente à Firestore.
══════════════════════════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background Sync — envoi des tampons hors-ligne');
    event.waitUntil(syncOfflineTampons());
  }
});

/**
 * Lit la file d'attente IndexedDB et envoie chaque tampon à Firestore.
 * En cas d'erreur réseau, le SW retentera automatiquement plus tard.
 */
async function syncOfflineTampons() {
  try {
    /* Ouvrir la base IndexedDB 'pb-cates-offline' */
    const db = await openIndexedDB();
    const pendingTampons = await getAll(db, 'pending_tampons');

    if (!pendingTampons.length) {
      console.log('[SW] Aucun tampon en attente');
      return;
    }

    console.log(`[SW] ${pendingTampons.length} tampon(s) à synchroniser`);

    /* Envoyer chaque tampon à notre Cloud Function Firebase */
    for (const tampon of pendingTampons) {
      const response = await fetch('/api/validate-tampon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tampon)
      });

      if (response.ok) {
        /* Supprimer de la file après succès */
        await deleteRecord(db, 'pending_tampons', tampon.id);
        console.log('[SW] Tampon synchronisé :', tampon.id);

        /* Notifier le client (si l'app est ouverte) */
        notifyClients({ type: 'TAMPON_SYNCED', tampon });
      }
    }
  } catch (err) {
    console.error('[SW] Erreur de synchronisation :', err);
    /* Lever l'erreur pour que le SW réessaie automatiquement */
    throw err;
  }
}

/* ══════════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS
   Reçoit les notifications push Firebase (nouvelles offres, rappels)
══════════════════════════════════════════════════════════════════ */
self.addEventListener('push', event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'PB-Cates', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/assets/icon-192.png',
    badge: '/assets/badge-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [],
    tag: data.tag || 'pb-cates-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PB-Cates', options)
  );
});

/* Clic sur une notification → ouvre ou focus l'application */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        /* Si l'app est déjà ouverte, la mettre au premier plan */
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        /* Sinon, ouvrir un nouvel onglet */
        return clients.openWindow(targetUrl);
      })
  );
});

/* ══════════════════════════════════════════════════════════════════
   HELPERS IndexedDB (mini-ORM pour la file hors-ligne)
══════════════════════════════════════════════════════════════════ */

/** Ouvre (ou crée) la base IndexedDB 'pb-cates-offline' */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pb-cates-offline', 1);

    request.onupgradeneeded = e => {
      const db = e.target.result;
      /* Table des tampons en attente de sync */
      if (!db.objectStoreNames.contains('pending_tampons')) {
        db.createObjectStore('pending_tampons', { keyPath: 'id' });
      }
    };

    request.onsuccess  = e => resolve(e.target.result);
    request.onerror    = e => reject(e.target.error);
  });
}

/** Lit tous les enregistrements d'un object store */
function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readonly');
    const store   = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = e => resolve(e.target.result);
    request.onerror   = e => reject(e.target.error);
  });
}

/** Supprime un enregistrement par sa clé */
function deleteRecord(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(storeName, 'readwrite');
    const store   = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror   = e => reject(e.target.error);
  });
}

/** Envoie un message à tous les onglets ouverts de l'app */
function notifyClients(message) {
  self.clients.matchAll().then(clientList => {
    clientList.forEach(client => client.postMessage(message));
  });
}
