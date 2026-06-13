/**
 * js/firebase.js — PB-Cates
 * ─────────────────────────────────────────────────────────────────
 * Initialisation Firebase (Auth + Firestore) et enregistrement PWA.
 *
 * DÉPLOIEMENT :
 *   1. Créez un projet sur https://console.firebase.google.com
 *   2. Activez Authentication > Sign-in method > Email/Password
 *      (on utilisera les "Email Link" / Magic Link)
 *   3. Activez Firestore Database
 *   4. Remplacez les valeurs firebaseConfig ci-dessous
 *      par celles de votre projet (Settings > General > Your apps)
 * ─────────────────────────────────────────────────────────────────
 */

import { initializeApp }          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInAnonymously,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore,
         enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/* ══════════════════════════════════════════════════════════════════
   CONFIGURATION DU PROJET FIREBASE
   ⚠️  REMPLACER par vos vraies valeurs avant déploiement
══════════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyAY6M5puxY9bZITCDLw0fg__a3Fky3NJZ0",
  authDomain: "pb-cates-demo.firebaseapp.com",
  projectId: "pb-cates-demo",
  storageBucket: "pb-cates-demo.firebasestorage.app",
  messagingSenderId: "786794482585",
  appId: "1:786794482585:web:21d3b2b210349b5a0a6108"
};

/* ── Initialisation Firebase ── */
const firebaseApp = initializeApp(firebaseConfig);

/* ── Auth (connexion passwordless Magic Link) ── */
export const auth = getAuth(firebaseApp);

/* ── Firestore (base de données temps-réel) ── */
export const db = getFirestore(firebaseApp);

/* ══════════════════════════════════════════════════════════════════
   MODE HORS-LIGNE FIRESTORE
   Active la persistance IndexedDB automatiquement.
   Les données sont mises en cache localement → fonctionne sans réseau.
   Les écritures hors-ligne sont synchronisées dès le retour du réseau.
══════════════════════════════════════════════════════════════════ */
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    /* Plusieurs onglets ouverts → persistence désactivée (limitation Firestore) */
    console.warn('[Firestore] Mode hors-ligne désactivé : plusieurs onglets détectés');
  } else if (err.code === 'unimplemented') {
    /* Navigateur trop ancien (ex: IE) */
    console.warn('[Firestore] Mode hors-ligne non supporté par ce navigateur');
  }
});

/* ══════════════════════════════════════════════════════════════════
   PARAMÈTRES DU MAGIC LINK (Email OTP)
   Firebase envoie un email contenant un lien de connexion.
   Au retour sur l'app, on vérifie le lien et on connecte l'utilisateur.
══════════════════════════════════════════════════════════════════ */
export const actionCodeSettings = {
  /* URL de redirection après clic sur le lien email */
  url: window.location.origin + '/?finishLogin=1',
  handleCodeInApp: true,

  /* iOS : si installé en PWA, ouvre directement l'app */
  iOS: {
    bundleId: 'com.pbcates.app'
  },
  /* Android : si installé en PWA, ouvre directement l'app */
  android: {
    packageName: 'com.pbcates.app',
    installApp: false,
    minimumVersion: '12'
  }
};

/* ══════════════════════════════════════════════════════════════════
   ENREGISTREMENT DU SERVICE WORKER (PWA)
══════════════════════════════════════════════════════════════════ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker enregistré :', registration.scope);

      /* Écouter les messages du SW (ex: tampon synchronisé) */
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'TAMPON_SYNCED') {
          console.log('[PWA] Tampon synchronisé depuis le SW :', event.data.tampon);
          /* Rafraîchir l'affichage de la carte concernée */
          window.dispatchEvent(new CustomEvent('tampon-synced', { detail: event.data.tampon }));
        }
      });

    } catch (err) {
      console.error('[PWA] Erreur enregistrement Service Worker :', err);
    }
  });
}

/* ══════════════════════════════════════════════════════════════════
   GESTION DU RETOUR APRÈS MAGIC LINK
   Détecte automatiquement si l'URL contient un lien Firebase Email
   et finalise la connexion sans que l'utilisateur ait à saisir son email.
══════════════════════════════════════════════════════════════════ */
if (isSignInWithEmailLink(auth, window.location.href)) {
  /* Récupérer l'email sauvegardé avant l'envoi du lien */
  let email = window.localStorage.getItem('pb_cates_email_for_signin');

  if (!email) {
    /* Sécurité : si l'email n'est pas en localStorage (autre appareil) */
    email = window.prompt('Confirmez votre adresse email pour finaliser la connexion :');
  }

  if (email) {
    signInWithEmailLink(auth, email, window.location.href)
      .then(result => {
        window.localStorage.removeItem('pb_cates_email_for_signin');
        /* Nettoyer l'URL (enlever les paramètres Firebase) */
        window.history.replaceState({}, '', '/');
        console.log('[Auth] Connexion Magic Link réussie :', result.user.email);
        /* L'observer onAuthStateChanged dans auth.js prendra le relais */
      })
      .catch(err => {
        console.error('[Auth] Erreur Magic Link :', err.code, err.message);
        window.location.href = '/';
      });
  }
}

export { firebaseApp, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword };
