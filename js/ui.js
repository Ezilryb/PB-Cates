/**
 * js/ui.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Fonctions de rendu et de navigation entre les écrans.
 * Découplé de la logique métier (wallet.js, auth.js).
 *
 * RESPONSABILITÉS :
 *   - showScreen() : navigation entre auth / wallet / detail
 *   - renderCardList() : rendu de la liste verticale des cartes
 *   - renderCardDetail() : rendu de l'écran détail d'une carte
 *   - showToast() : notifications légères
 *   - openQROverlay() : afficher le QR code dynamique
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   NAVIGATION ENTRE ÉCRANS
══════════════════════════════════════════════════════════════════ */

/**
 * Affiche l'écran demandé en masquant les autres.
 * @param {'auth'|'wallet'|'detail'} screenId
 */
export function showScreen(screenId) {
  /* Masquer tous les écrans */
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });

  /* Afficher l'écran cible */
  const target = document.getElementById(`screen-${screenId}`);
  if (target) target.classList.add('active');

  /* Barre de navigation du bas : visible sur wallet et detail */
  const nav = document.getElementById('bottom-nav');
  if (nav) {
    nav.style.display = (screenId === 'wallet' || screenId === 'detail') ? 'flex' : 'none';
  }

  /* Remonter en haut de page */
  window.scrollTo({ top: 0, behavior: 'instant' });

  /* Mettre à jour l'historique du navigateur (bouton retour natif) */
  if (screenId === 'wallet') {
    history.pushState({ screen: 'wallet' }, '', '/');
  } else if (screenId === 'detail') {
    history.pushState({ screen: 'detail' }, '', '/carte');
  }
}

/* Gestion du bouton retour natif du navigateur */
window.addEventListener('popstate', event => {
  const screen = event.state?.screen || 'wallet';
  showScreen(screen);
});

/* ══════════════════════════════════════════════════════════════════
   RENDU DE LA LISTE DES CARTES (écran Wallet)
══════════════════════════════════════════════════════════════════ */

/**
 * Génère et injecte la liste verticale des cartes de fidélité.
 * @param {Array} cards - Tableau de cartes venant de wallet.js
 */
export function renderCardList(cards) {
  const container = document.getElementById('card-list');
  if (!container) return;

  /* État vide */
  if (!cards || !cards.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" aria-hidden="true">◈</div>
        <div class="empty-title">Portefeuille vide</div>
        <div class="empty-sub">
          Scannez le QR code d'un commerce partenaire pour ajouter votre première carte de fidélité.
        </div>
      </div>`;
    return;
  }

  container.innerHTML = '';

  cards.forEach((card, index) => {
    const el = createCardElement(card, index);
    container.appendChild(el);
  });
}

/**
 * Crée un élément DOM pour une carte de fidélité.
 * @param {Object} card - Données de la carte
 * @param {number} index - Position dans la liste (pour l'animation décalée)
 * @returns {HTMLElement}
 */
function createCardElement(card, index) {
  const isComplete    = card.stamps >= card.maxStamps;
  const progressPct   = Math.min(100, Math.round((card.stamps / card.maxStamps) * 100));
  const stampsLeft    = card.maxStamps - card.stamps;

  /* Générer les icônes de tampons */
  const stampsHTML = Array.from({ length: card.maxStamps }, (_, i) => {
    const filled = i < card.stamps;
    const isLast = i === card.maxStamps - 1;
    return `<div class="stamp ${filled ? 'filled' : ''} ${isLast ? 'reward' : ''}"
                 role="img"
                 aria-label="${filled ? 'Tampon validé' : 'Tampon vide'}">
               ${filled ? '✦' : ''}
             </div>`;
  }).join('');

  const article = document.createElement('article');
  article.className = `loyalty-card ${card.colorClass}`;
  article.setAttribute('role', 'listitem');
  article.setAttribute('tabindex', '0');
  article.setAttribute('aria-label',
    `Carte ${card.brand}, ${card.stamps} tampons sur ${card.maxStamps}`
  );
  /* Délai d'animation en cascade */
  article.style.animationDelay = `${index * 0.07}s`;

  article.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-brand-name">${escapeHtml(card.brand)}</div>
        <div class="card-category">${escapeHtml(card.category)}</div>
      </div>
      <div class="card-logo"
           style="background:${card.logoColor};color:${card.logoTextColor}"
           aria-hidden="true">
        ${escapeHtml(card.logoText)}
      </div>
    </div>

    <div class="stamps-section" style="margin-top:1.1rem">
      <div class="stamps-label">
        ${card.stamps}/${card.maxStamps} tampons
        · ${escapeHtml(card.reward)}
      </div>
      <div class="stamps-grid"
           role="group"
           aria-label="${card.stamps} tampons validés sur ${card.maxStamps}">
        ${stampsHTML}
      </div>
      <div class="progress-bar"
           role="progressbar"
           aria-valuenow="${card.stamps}"
           aria-valuemin="0"
           aria-valuemax="${card.maxStamps}"
           aria-valuetext="${card.stamps} tampons sur ${card.maxStamps}">
        <div class="progress-fill" style="width:${progressPct}%"></div>
      </div>
    </div>

    <div class="card-footer" style="margin-top:0.9rem">
      <div class="card-last-visit">
        Dernière visite : ${escapeHtml(card.lastVisit)}
      </div>
      ${isComplete
        ? `<div class="reward-badge" role="status" aria-label="Récompense disponible">
             ✦ Récompense dispo
           </div>`
        : `<div style="font-size:0.72rem;color:var(--text-muted)">
             ${stampsLeft} tampon${stampsLeft > 1 ? 's' : ''} restant${stampsLeft > 1 ? 's' : ''}
           </div>`
      }
    </div>`;

  /* Évènements d'interaction */
  article.addEventListener('click', () => openCardDetail(card.id));
  article.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openCardDetail(card.id);
    }
  });

  return article;
}

/* ══════════════════════════════════════════════════════════════════
   ÉCRAN DÉTAIL D'UNE CARTE
══════════════════════════════════════════════════════════════════ */

/**
 * Rempli et affiche l'écran détail pour une carte donnée.
 * @param {Object} card - Données complètes de la carte
 */
export function renderCardDetail(card) {
  if (!card) return;

  /* Grande carte */
  document.getElementById('detail-brand').textContent    = card.brand;
  document.getElementById('detail-category').textContent = card.category;
  document.getElementById('detail-member-since').textContent = `Membre depuis ${card.memberSince}`;
  document.getElementById('detail-card').className = `detail-loyalty-card ${card.colorClass}`;
  document.getElementById('qr-modal-brand').textContent  = card.brand;

  /* Tampons en grand format */
  const stampsGrid = document.getElementById('detail-stamps-grid');
  if (stampsGrid) {
    stampsGrid.innerHTML = Array.from({ length: card.maxStamps }, (_, i) => {
      const filled = i < card.stamps;
      const isLast = i === card.maxStamps - 1;
      return `<div class="detail-stamp ${filled ? 'filled' : ''} ${isLast ? 'reward' : ''}"
                   role="img"
                   aria-label="${filled ? 'Tampon validé' : 'Tampon vide'}">
               ${filled ? '✦' : ''}
             </div>`;
    }).join('');
  }

  /* Badge récompense / tampons restants */
  const badgeEl = document.getElementById('detail-reward-badge');
  if (badgeEl) {
    const left = card.maxStamps - card.stamps;
    badgeEl.innerHTML = card.stamps >= card.maxStamps
      ? `<div class="reward-badge" role="status">✦ ${escapeHtml(card.reward)} disponible</div>`
      : `<div style="font-size:0.78rem;color:var(--text-secondary)">
           ${left} tampon${left > 1 ? 's' : ''} avant ${escapeHtml(card.reward)}
         </div>`;
  }

  /* Historique des visites */
  const historyEl = document.getElementById('detail-history');
  if (historyEl && card.history?.length) {
    historyEl.innerHTML = card.history.map(h => `
      <div class="history-item">
        <div>
          <div class="history-action">${escapeHtml(h.action)}</div>
          <div class="history-date">${formatHistoryDate(h.date)}</div>
        </div>
        <div class="history-stamps-badge">
          ${h.stamps > 0
            ? `+${h.stamps} tampon${h.stamps > 1 ? 's' : ''}`
            : `Utilisé (${Math.abs(h.stamps)} tampons)`
          }
        </div>
      </div>`
    ).join('');
  } else if (historyEl) {
    historyEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0">
      Aucune visite enregistrée pour le moment.
    </p>`;
  }
}

/* ── Ouvre l'écran détail (appelé depuis renderCardList) ── */
function openCardDetail(cardId) {
  /* Importer dynamiquement wallet.js pour éviter la dépendance circulaire */
  import('./wallet.js').then(({ getCardById }) => {
    const card = getCardById(cardId);
    if (!card) return;

    renderCardDetail(card);
    showScreen('detail');

    /* Sauvegarder l'ID de la carte sélectionnée */
    window._selectedCardId = cardId;
  });
}

/* ══════════════════════════════════════════════════════════════════
   OVERLAY QR CODE
══════════════════════════════════════════════════════════════════ */

let _qrTimerInterval = null;
let _qrTimerValue    = 90;

/** Ouvre l'overlay QR code avec un compte à rebours de 90 secondes */
export function openQROverlay() {
  const overlay = document.getElementById('qr-overlay');
  if (!overlay) return;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');

  regenerateQRPattern();

  /* Démarrer le compte à rebours */
  _qrTimerValue = 90;
  document.getElementById('qr-timer').textContent = _qrTimerValue;
  clearInterval(_qrTimerInterval);

  _qrTimerInterval = setInterval(() => {
    _qrTimerValue--;
    const timerEl = document.getElementById('qr-timer');
    if (timerEl) timerEl.textContent = _qrTimerValue;

    /* Régénérer le pattern à mi-chemin (simule la rotation du token) */
    if (_qrTimerValue === 45) regenerateQRPattern();

    if (_qrTimerValue <= 0) {
      clearInterval(_qrTimerInterval);
      if (timerEl) timerEl.textContent = '⟳ Expiré';
      regenerateQRPattern();
    }
  }, 1000);
}

/** Ferme l'overlay QR code */
export function closeQROverlay(event) {
  /* Ne fermer que si on clique sur le fond sombre, pas sur la modal */
  const overlay = document.getElementById('qr-overlay');
  if (event && event.target !== overlay) return;

  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  clearInterval(_qrTimerInterval);
}

/**
 * Génère un motif aléatoire de cellules pour le QR code simulé.
 * En production, ce SVG serait remplacé par une vraie librairie QR
 * encodant un JWT signé : { userId, cardId, exp }
 */
function regenerateQRPattern() {
  const cells  = document.getElementById('qr-data-cells');
  if (!cells) return;

  cells.innerHTML = '';
  const CELL_SIZE = 7;
  const OFFSET    = 32;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (Math.random() > 0.5) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x',      OFFSET + col * CELL_SIZE);
        rect.setAttribute('y',      OFFSET + row * CELL_SIZE);
        rect.setAttribute('width',  CELL_SIZE - 1);
        rect.setAttribute('height', CELL_SIZE - 1);
        rect.setAttribute('fill',   '#000');
        cells.appendChild(rect);
      }
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   SYSTÈME DE TOASTS
══════════════════════════════════════════════════════════════════ */

/**
 * Affiche une notification légère en haut de l'écran.
 * @param {string} message - Texte à afficher
 * @param {'success'|'error'|''} type - Style visuel
 * @param {number} duration - Durée en ms (défaut : 3000)
 */
export function showToast(message, type = '', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

/**
 * Échappe les caractères HTML pour éviter les injections XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formate une date d'historique.
 * Accepte un Timestamp Firestore, un objet Date, ou une chaîne.
 */
function formatHistoryDate(date) {
  if (!date) return '';

  let d;
  /* Timestamp Firestore (objet avec .seconds) */
  if (date?.seconds) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: 'long',
    year:  'numeric'
  });
}
