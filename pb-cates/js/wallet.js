/**
 * js/wallet.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Chargement et gestion des cartes de fidélité depuis Firestore.
 *
 * STRUCTURE FIRESTORE :
 * ┌─ users/{userId}
 * │    ├── email, displayName, createdAt
 * │    └── cards/{cardId}            ← sous-collection
 * │         ├── commerceId           (référence au commerce)
 * │         ├── stamps               (nb tampons actuels)
 * │         ├── maxStamps            (tampons pour récompense)
 * │         ├── reward               (nature de la récompense)
 * │         ├── lastVisit            (Timestamp)
 * │         └── history[]            (tableau des visites)
 * │
 * └─ commerces/{commerceId}
 *      ├── name, category, city
 *      ├── colorTheme
 *      ├── logoText, logoColor
 *      └── settings
 *           ├── maxStamps
 *           ├── reward
 *           ├── multiStampEnabled
 *           └── dailyStampLimit
 * ─────────────────────────────────────────────────────────────────
 */

import { db }                     from './firebase.js';
import { getCurrentUser }         from './auth.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { showScreen, showToast, renderCardList, renderCardDetail } from './ui.js';
import { queueOfflineTampon }     from './sync.js';

/* ── Cache local des cartes (évite les re-renders inutiles) ── */
let _cards = [];
let _unsubscribeSnapshot = null;

/* ══════════════════════════════════════════════════════════════════
   CHARGEMENT DU WALLET
   Ouvre un listener temps-réel Firestore pour les cartes de l'utilisateur.
   Toute modification en base (tampon ajouté en caisse) se reflète
   instantanément sur l'écran du client.
══════════════════════════════════════════════════════════════════ */
export async function loadWallet(user) {
  /* Fermer l'ancien listener si l'utilisateur change */
  if (_unsubscribeSnapshot) {
    _unsubscribeSnapshot();
    _unsubscribeSnapshot = null;
  }

  const cardsRef = collection(db, 'users', user.uid, 'cards');
  const cardsQuery = query(cardsRef, orderBy('lastVisit', 'desc'));

  /* Listener temps-réel : appelé à chaque modification Firestore */
  _unsubscribeSnapshot = onSnapshot(
    cardsQuery,
    async snapshot => {
      /* Pour chaque carte, enrichir avec les données du commerce */
      const cardsPromises = snapshot.docs.map(async cardDoc => {
        const cardData = cardDoc.data();

        /* Récupérer le nom/thème du commerce */
        let commerceData = {};
        if (cardData.commerceId) {
          const commerceDoc = await getDoc(doc(db, 'commerces', cardData.commerceId));
          if (commerceDoc.exists()) {
            commerceData = commerceDoc.data();
          }
        }

        return {
          id: cardDoc.id,
          /* Données de la carte (tampons, historique) */
          stamps:      cardData.stamps      || 0,
          maxStamps:   cardData.maxStamps   || 10,
          reward:      cardData.reward      || 'Récompense',
          lastVisit:   formatRelativeDate(cardData.lastVisit),
          memberSince: formatMonthYear(cardData.createdAt),
          history:     (cardData.history || []).slice(0, 20), /* 20 dernières visites */
          /* Données du commerce */
          brand:       commerceData.name       || 'Commerce',
          category:    commerceData.category   || '',
          colorClass:  commerceData.colorTheme || 'card-noir',
          logoText:    commerceData.logoText    || '?',
          logoColor:   commerceData.logoColor   || 'rgba(201,168,76,0.15)',
          logoTextColor: commerceData.logoTextColor || 'var(--gold)',
        };
      });

      _cards = await Promise.all(cardsPromises);

      /* Mettre à jour les stats du header */
      updateWalletStats(_cards);

      /* Re-rendre la liste des cartes */
      renderCardList(_cards);
    },
    error => {
      console.error('[Wallet] Erreur Firestore :', error);
      showToast('Erreur de chargement des cartes', 'error');
    }
  );
}

/* ══════════════════════════════════════════════════════════════════
   RÉCUPÉRER UNE CARTE PAR SON ID
══════════════════════════════════════════════════════════════════ */
export function getCardById(cardId) {
  return _cards.find(c => c.id === cardId) || null;
}

export function getAllCards() {
  return _cards;
}

/* ══════════════════════════════════════════════════════════════════
   AJOUTER UN TAMPON (appelé côté vendeur via QR scan)
   En production : la validation se fait toujours côté serveur
   (Cloud Function) pour éviter les fraudes.
══════════════════════════════════════════════════════════════════ */
export async function addStamp(userId, cardId, count = 1) {
  const user = getCurrentUser();
  if (!user) throw new Error('Non authentifié');

  const cardRef = doc(db, 'users', userId, 'cards', cardId);

  /* Entrée d'historique */
  const historyEntry = {
    date:      Timestamp.now(),
    action:    count === 1 ? 'Visite validée' : `${count} tampons validés`,
    stamps:    count,
    staffId:   user.uid  /* L'ID du compte staff qui a validé */
  };

  try {
    /* Mise à jour atomique Firestore */
    await updateDoc(cardRef, {
      stamps:    increment(count),
      lastVisit: serverTimestamp(),
      history:   arrayUnion(historyEntry)
    });

    console.log(`[Wallet] +${count} tampon(s) ajouté(s) à la carte ${cardId}`);

  } catch (err) {
    if (err.code === 'unavailable') {
      /* Réseau indisponible → mettre en file d'attente hors-ligne */
      console.warn('[Wallet] Hors-ligne — tampon mis en attente de synchronisation');
      await queueOfflineTampon({ userId, cardId, count, historyEntry });
      showToast('Mode hors-ligne — tampon enregistré localement', '');
    } else {
      throw err;
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   UTILISER UNE RÉCOMPENSE
   Remet le compteur à zéro et enregistre la récompense utilisée.
══════════════════════════════════════════════════════════════════ */
export async function redeemReward(cardId) {
  const user = getCurrentUser();
  if (!user) throw new Error('Non authentifié');

  const card = getCardById(cardId);
  if (!card || card.stamps < card.maxStamps) {
    throw new Error('Récompense non disponible');
  }

  const cardRef = doc(db, 'users', user.uid, 'cards', cardId);

  const historyEntry = {
    date:    Timestamp.now(),
    action:  `Récompense utilisée : ${card.reward}`,
    stamps:  -card.maxStamps
  };

  await updateDoc(cardRef, {
    stamps:    0,  /* Remise à zéro */
    lastVisit: serverTimestamp(),
    history:   arrayUnion(historyEntry)
  });

  showToast(`Récompense validée : ${card.reward} !`, 'success');
}

/* ══════════════════════════════════════════════════════════════════
   MISE À JOUR DES STATS DU WALLET HEADER
══════════════════════════════════════════════════════════════════ */
function updateWalletStats(cards) {
  const totalCards    = cards.length;
  const rewardCount   = cards.filter(c => c.stamps >= c.maxStamps).length;

  const elCards   = document.getElementById('stat-cards');
  const elRewards = document.getElementById('stat-rewards');

  if (elCards)   elCards.textContent   = totalCards;
  if (elRewards) elRewards.textContent = rewardCount;
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS DE FORMATAGE DES DATES
══════════════════════════════════════════════════════════════════ */

/**
 * Convertit un Timestamp Firestore en texte relatif
 * ex: "Il y a 3 jours", "Aujourd'hui", "Il y a 2 semaines"
 */
function formatRelativeDate(timestamp) {
  if (!timestamp) return 'Jamais';

  const date = timestamp instanceof Timestamp
    ? timestamp.toDate()
    : new Date(timestamp);

  const now    = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)   return `Il y a ${diffDays} jours`;
  if (diffDays < 14)  return 'Il y a 1 semaine';
  if (diffDays < 30)  return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 60)  return 'Il y a 1 mois';

  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

/**
 * Convertit un Timestamp Firestore en "mois année"
 * ex: "jan. 2024"
 */
function formatMonthYear(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Timestamp
    ? timestamp.toDate()
    : new Date(timestamp);

  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

/**
 * Convertit un Timestamp Firestore en date complète
 * ex: "05 juin 2025"
 */
export function formatFullDate(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Timestamp
    ? timestamp.toDate()
    : new Date(timestamp);

  return date.toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric'
  });
}
