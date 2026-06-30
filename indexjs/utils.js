/* ══════════════════════════════════════════════════════════════════
   UTILS — Fonctions pures sans état ni dépendances
   Formatage, DOM helpers, messages d'erreur Firebase.
══════════════════════════════════════════════════════════════════ */

/** Échappe le HTML pour prévenir les injections XSS. */
export function escH(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Bascule la visibilité d'un champ mot de passe. */
export function togglePwd(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
  else                         { inp.type = 'password'; btn.textContent = '👁'; }
}

/** Affiche une notification toast éphémère (3 s). */
export function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  const base   = 'px-4 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-slate-900/10 border whitespace-nowrap animate-fadeUp';
  const styles = {
    '':        'bg-slate-900 text-white border-slate-900',
    'success': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'error':   'bg-red-50 text-red-700 border-red-200'
  };
  t.className   = `${base} ${styles[type] || styles['']}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity    = '0';
    t.style.transition = 'opacity 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/** Formate un timestamp Firestore en durée relative en français. */
export function formatRelativeDate(timestamp) {
  if (!timestamp) return 'Jamais';
  const date     = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffDays = Math.floor((Date.now() - date) / 86400000);
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7)  return `Il y a ${diffDays} jours`;
  if (diffDays < 14) return 'Il y a 1 semaine';
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 60) return 'Il y a 1 mois';
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

/** Formate un timestamp Firestore en « mois année » (ex: jan. 2024). */
export function formatMonthYear(timestamp) {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

/** Formate une date d'historique en « 01 janvier 2024 ». */
export function formatHistoryDate(date) {
  if (!date) return '';
  let d;
  if (date?.toDate)    d = date.toDate();
  else if (date?.seconds) d = new Date(date.seconds * 1000);
  else                 d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Traduit un code d'erreur Firebase Auth en message utilisateur français. */
export function firebaseAuthError(code) {
  const map = {
    'auth/invalid-email':                              'Adresse email invalide.',
    'auth/user-disabled':                              'Ce compte a été désactivé.',
    'auth/user-not-found':                             'Aucun compte trouvé pour cet email.',
    'auth/wrong-password':                             'Mot de passe incorrect.',
    'auth/invalid-credential':                         'Email ou mot de passe incorrect.',
    'auth/email-already-in-use':                       'Cette adresse est déjà utilisée.',
    'auth/weak-password':                              'Le mot de passe est trop faible.',
    'auth/too-many-requests':                          'Trop de tentatives. Réessayez plus tard.',
    'auth/network-request-failed':                     'Erreur réseau. Vérifiez votre connexion.',
    'auth/popup-blocked':                              'Le popup a été bloqué. Autorisez les popups pour ce site.',
    'auth/account-exists-with-different-credential':   'Un compte existe déjà avec cet email via un autre fournisseur.',
    'auth/operation-not-supported-in-this-environment':'Apple Sign-In non configuré dans Firebase — voir les pré-requis.',
  };
  return map[code] || 'Une erreur est survenue. Réessayez.';
}

/* ── Exposition globale pour les attributs onclick dans le HTML statique ── */
window.showToast = showToast;
window.togglePwd = togglePwd;
