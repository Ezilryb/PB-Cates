/* ══════════════════════════════════════════════════════════════════
   WALLET — Données du portefeuille Firestore
   Écoute temps réel, construit les cartes, gère les écrans détail.
══════════════════════════════════════════════════════════════════ */
import { getFbAuth, getFbDb, getFsModule } from './firebase.js';
import { appState }                         from './state.js';
import { escH, showToast, formatRelativeDate, formatMonthYear, formatHistoryDate } from './utils.js';
import { wc }                               from './carousel.js';
import { showScreen }                       from './navigation.js';
import { openQROverlay }                    from './qr.js';
import { CARD_GRADIENTS }                   from './config.js';

/* Listener Firestore — privé au module, nettoyé via cleanupWalletListeners() */
let _unsubscribeCards = null;

/* ── Session ── */
export function loginSuccess(user) {
  appState.currentUser = user;
  appState.cards       = [];
  const initials = (user.displayName || user.email || 'U')
    .split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').textContent    = initials;
  document.getElementById('profile-avatar').textContent = initials;
  document.getElementById('profile-email').textContent  = user.email || '—';
  document.getElementById('profile-uid').textContent    = user.uid ? `ID : ${user.uid}` : '';
  renderCardList();
  showScreen('wallet');
  loadWallet(user);
}

export async function logout() {
  try {
    const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    await signOut(auth);
    showToast('Vous êtes déconnecté');
  } catch (err) { showToast('Erreur lors de la déconnexion', 'error'); }
}

/** Nettoie le listener Firestore actif — appelé par main.js lors du logout. */
export function cleanupWalletListeners() {
  if (_unsubscribeCards) { _unsubscribeCards(); _unsubscribeCards = null; }
}

/* ── Firestore ── */
export async function loadWallet(user) {
  const db = await getFbDb();
  const fs = getFsModule();

  /* Mise à jour de l'annuaire utilisateurs */
  if (user.email) {
    fs.setDoc(fs.doc(db, 'users', user.uid), {
      email:       user.email.toLowerCase(),
      displayName: user.displayName || null,
      updatedAt:   fs.serverTimestamp()
    }, { merge: true }).catch(err => console.warn('[Wallet] Maj annuaire impossible :', err.message));
  }

  /* Remplace l'éventuel ancien listener */
  if (_unsubscribeCards) { _unsubscribeCards(); _unsubscribeCards = null; }

  const cardsRef   = fs.collection(db, 'users', user.uid, 'cards');
  const cardsQuery = fs.query(cardsRef, fs.orderBy('lastVisit', 'desc'));

  _unsubscribeCards = fs.onSnapshot(cardsQuery, async snapshot => {
    const cards = await Promise.all(snapshot.docs.map(async cardDoc => {
      const cardData = cardDoc.data();
      let commerceData = {};
      try {
        const commerceSnap = await fs.getDoc(fs.doc(db, 'commerces', cardDoc.id));
        if (commerceSnap.exists()) commerceData = commerceSnap.data();
      } catch (_) {}
      return {
        id:            cardDoc.id,
        stamps:        cardData.stamps    || 0,
        maxStamps:     cardData.maxStamps || 10,
        reward:        cardData.reward    || 'Récompense',
        lastVisit:     formatRelativeDate(cardData.lastVisit),
        memberSince:   formatMonthYear(cardData.createdAt),
        history:       (cardData.history || []).slice(-20).reverse(),
        brand:         commerceData.name          || 'Commerce',
        category:      commerceData.category      || '',
        colorClass:    commerceData.colorClass    || 'card-noir',
        logoText:      commerceData.logoText      || '?',
        logoColor:     commerceData.logoColor     || 'rgba(201,168,76,0.15)',
        logoTextColor: commerceData.logoTextColor || 'var(--gold)'
      };
    }));
    appState.cards = cards;
    renderCardList();
  }, error => {
    console.error('[Wallet] Erreur Firestore :', error);
    showToast('Erreur de chargement des cartes', 'error');
  });
}

/* ── Rendu du carrousel ── */
export function renderCardList() {
  const userEmail = appState.currentUser?.email || '';
  const signCode  = userEmail.split('@')[0].substring(0, 12);

  const generalCard = {
    id: '__general__', name: 'Carte Universelle', shortCode: 'PB',
    colorClass: 'card-general', stamps: 0, maxStamps: 0,
    holder: userEmail.toUpperCase(), expiry: '12 / 28',
    signCode, logoText: 'PB', offers: 'Carte principale'
  };

  const storeCards = appState.cards.map(card => ({
    id:         card.id,
    name:       card.brand,
    shortCode:  (card.logoText || card.brand || 'XX').substring(0, 4).toUpperCase(),
    colorClass: card.colorClass || 'card-noir',
    stamps:     card.stamps    || 0,
    maxStamps:  card.maxStamps || 10,
    holder:     userEmail.toUpperCase(),
    expiry:     '12 / 28',
    signCode,
    logoText:   card.logoText || (card.brand || 'XX').substring(0, 2).toUpperCase(),
    offers:     card.reward   || 'Récompense'
  }));

  document.getElementById('stat-cards').textContent   = appState.cards.length;
  document.getElementById('stat-rewards').textContent = appState.cards.filter(c => c.stamps >= c.maxStamps).length;
  wc.init([generalCard, ...storeCards]);
}

/* ── Raccourcis QR ── */
export function openGeneralQR() {
  appState.selectedCardId = null;
  document.getElementById('qr-modal-brand').textContent = 'Carte Universelle';
  openQROverlay();
}

export function openStoreCardQR(cardId) {
  appState.selectedCardId = cardId;
  const card = appState.cards.find(c => c.id === cardId);
  document.getElementById('qr-modal-brand').textContent = card ? card.brand : 'Carte Fidélité';
  openQROverlay();
}

/* ── Écran détail ── */
export function openCardDetail(cardId) {
  const card = appState.cards.find(c => c.id === cardId);
  if (!card) return;
  appState.selectedCardId = cardId;

  document.getElementById('detail-brand').textContent        = card.brand;
  document.getElementById('detail-category').textContent     = card.category;
  document.getElementById('detail-member-since').textContent = `Membre depuis ${card.memberSince}`;
  document.getElementById('detail-card').style.background    = CARD_GRADIENTS[card.colorClass] || CARD_GRADIENTS['card-noir'];
  document.getElementById('qr-modal-brand').textContent      = card.brand;

  document.getElementById('detail-stamps-grid').innerHTML = Array.from({ length: card.maxStamps }, (_, i) => {
    const filled = i < card.stamps;
    const isLast = i === card.maxStamps - 1;
    return `<div class="w-9 h-9 rounded-full flex items-center justify-center text-sm border transition ${filled ? 'bg-gold border-gold text-slate-900 font-bold' : 'border-dashed border-white/30 text-transparent'} ${isLast ? 'ring-2 ring-gold/40' : ''}">${filled ? '✓' : ''}</div>`;
  }).join('');

  const left = card.maxStamps - card.stamps;
  document.getElementById('detail-reward-badge').innerHTML = card.stamps >= card.maxStamps
    ? `<div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/15 border border-emerald-300/30 text-emerald-200 text-xs font-semibold">✦ ${escH(card.reward)} disponible</div>`
    : `<div class="text-xs text-white/60">${left} tampon${left > 1 ? 's' : ''} avant ${escH(card.reward)}</div>`;

  const hist = card.history || [];
  document.getElementById('detail-history').innerHTML = hist.length
    ? hist.map(h => `<div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"><div><div class="text-sm text-slate-900">${escH(h.action)}</div><div class="text-xs text-slate-400 mt-0.5">${formatHistoryDate(h.date)}</div></div><div class="inline-flex items-center gap-1 px-2.5 py-1 bg-gold/10 rounded-full text-xs text-gold-dark font-medium">${h.stamps > 0 ? `+${h.stamps} tampon${h.stamps > 1 ? 's' : ''}` : `Utilisé (${Math.abs(h.stamps)} tampons)`}</div></div>`).join('')
    : `<p class="text-slate-400 text-sm py-4">Aucune visite enregistrée pour le moment.</p>`;

  showScreen('detail');
}

/* ── Exposition globale ── */
window.logout          = logout;
window.openCardDetail  = openCardDetail;
window.openGeneralQR   = openGeneralQR;
window.openStoreCardQR = openStoreCardQR;
