/**
 * js/auth.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Gestion complète de l'authentification passwordless.
 *
 * FLUX MAGIC LINK (Firebase Email Link) :
 *   1. Client saisit son email → sendSignInLinkToEmail()
 *   2. Firebase envoie un email avec un lien sécurisé (valable 1h)
 *   3. Client clique sur le lien → retour sur l'app
 *   4. firebase.js détecte le lien et connecte automatiquement
 *   5. onAuthStateChanged déclenche le chargement du wallet
 *
 * FLUX OTP PERSONNALISÉ (via Cloud Functions) :
 *   Alternative au Magic Link : envoie un code à 6 chiffres
 *   via Firebase Functions + SendGrid/Brevo.
 * ─────────────────────────────────────────────────────────────────
 */

import {
  auth,
  actionCodeSettings
} from './firebase.js';

import {
  sendSignInLinkToEmail,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

import { loadWallet }  from './wallet.js';
import { showScreen, showToast } from './ui.js';

/* ══════════════════════════════════════════════════════════════════
   OBSERVATEUR D'ÉTAT DE CONNEXION
   Firebase maintient la session automatiquement (localStorage).
   Cet observer se déclenche :
     - Au chargement de la page (si déjà connecté → wallet direct)
     - Après une connexion réussie
     - Après une déconnexion
══════════════════════════════════════════════════════════════════ */
onAuthStateChanged(auth, async user => {
  if (user) {
    /* ── Utilisateur connecté ── */
    console.log('[Auth] Connecté :', user.email);

    /* Mettre à jour l'avatar avec les initiales */
    updateAvatar(user);

    /* Charger les cartes de fidélité depuis Firestore */
    await loadWallet(user);

    /* Afficher le wallet */
    showScreen('wallet');

  } else {
    /* ── Utilisateur déconnecté ── */
    console.log('[Auth] Non connecté → écran d\'authentification');
    showScreen('auth');
  }
});

/* ══════════════════════════════════════════════════════════════════
   ENVOI DU MAGIC LINK
   Appelé quand l'utilisateur clique sur "Recevoir mon code"
══════════════════════════════════════════════════════════════════ */
export async function sendSignInLinkToEmail(email) {
  if (!email || !isValidEmail(email)) {
    throw new Error('Email invalide');
  }

  // En production : envoyer un email avec un lien magique via Cloud Function
  // Pour l'instant en démo, on accepte juste n'importe quel email
  
  window.localStorage.setItem('pb_cates_email_for_signin', email);
  
  // Simuler l'envoi du code
  console.log('[Auth] Code envoyé à :', email);
  return { success: true };
}

export async function verifyOTP(email, code) {
  // Accepter le code "123456" en démo
  if (code === '123456') {
    return { success: true };
  }
  throw new Error('Code incorrect');
}

/* ══════════════════════════════════════════════════════════════════
   ENVOI D'UN OTP PERSONNALISÉ (alternative au Magic Link)
   Appelle une Cloud Function Firebase qui envoie un code à 6 chiffres
   via SendGrid ou Brevo (Sendinblue).
   
   Structure Firestore : otps/{email} = { code, expiresAt, attempts }
══════════════════════════════════════════════════════════════════ */
export async function sendCustomOTP(email) {
  if (!isValidEmail(email)) throw new Error('Email invalide');

  /*
   * En production : appel à la Cloud Function
   * const response = await fetch('https://[region]-[project].cloudfunctions.net/sendOTP', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({ email })
   * });
   * if (!response.ok) throw new Error('Erreur envoi OTP');
   */

  /* Simulation (développement local) */
  console.log('[Auth] OTP envoyé à :', email, '— Code de démo : 123456');
  return { success: true, expiresIn: 600 }; /* 10 minutes */
}

/* ══════════════════════════════════════════════════════════════════
   VÉRIFICATION DU CODE OTP
   Valide le code saisi contre celui stocké dans Firestore
   (ou via la Cloud Function de vérification).
══════════════════════════════════════════════════════════════════ */
export async function verifyOTP(email, code) {
  if (!code || code.length !== 6) throw new Error('Code invalide');

  /*
   * En production : appel à la Cloud Function de vérification
   * const response = await fetch('.../verifyOTP', {
   *   method: 'POST',
   *   body: JSON.stringify({ email, code })
   * });
   * const { customToken } = await response.json();
   *
   * import { signInWithCustomToken } from 'firebase/auth';
   * await signInWithCustomToken(auth, customToken);
   */

  /* Simulation : accepter le code "123456" en démo */
  if (code === '123456') {
    console.log('[Auth] OTP valide — connexion simulée');
    return { success: true };
  }

  throw new Error('Code incorrect ou expiré');
}

/* ══════════════════════════════════════════════════════════════════
   DÉCONNEXION
══════════════════════════════════════════════════════════════════ */
export async function logout() {
  await signOut(auth);
  showToast('Vous êtes déconnecté', '');
  console.log('[Auth] Déconnexion effectuée');
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS LOCAUX
══════════════════════════════════════════════════════════════════ */

/** Met à jour l'avatar (initiales) dans le header du wallet */
function updateAvatar(user) {
  const avatarEl = document.getElementById('user-avatar');
  if (!avatarEl) return;

  const name = user.displayName || user.email || 'U';
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('');

  avatarEl.textContent = initials;
}

/** Validation basique du format email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Retourne l'utilisateur actuellement connecté (ou null) */
export function getCurrentUser() {
  return auth.currentUser;
}
