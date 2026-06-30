/* ══════════════════════════════════════════════════════════════════
   MAIN — Point d'entrée unique
   Orchestre l'init DOMContentLoaded, le redirect Apple et l'observer
   Firebase. Feuille terminale du graphe de dépendances.
══════════════════════════════════════════════════════════════════ */
import { getFbAuth }                        from './firebase.js';
import { appState }                         from './state.js';
import { showScreen }                       from './navigation.js';
import { firebaseAuthError }                from './utils.js';
import { showAuthError }                    from './auth.js';
import { loginSuccess, cleanupWalletListeners } from './wallet.js';
import { wc }                               from './carousel.js';

/* Les imports ci-dessus déclenchent l'exécution de chaque module et notamment
   les affectations window.* en bas de chaque fichier. Tous les onclick HTML
   sont donc résolus avant la première interaction utilisateur. */

document.addEventListener('DOMContentLoaded', () => {

  /* Raccourci admin — Shift + Alt + A */
  document.addEventListener('keydown', e => {
    if (e.shiftKey && e.altKey && (e.key === 'A' || e.key === 'a'))
      window.location.href = 'admin.html';
  });

  /* ── Retour après redirection Apple Sign-In ── */
  (async () => {
    try {
      const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const auth   = await getFbAuth();
      const result = await getRedirectResult(auth);
      if (result) console.log('[Auth] Redirect Apple Sign-In réussi :', result.user?.email);
    } catch (err) {
      if (err.code && err.code !== 'auth/no-current-user') {
        console.error('[Auth] Erreur redirect Apple :', err.code, err.message);
        showAuthError(firebaseAuthError(err.code));
      }
    }
  })();

  /* ── Session persistante — observer d'état Firebase ── */
  (async () => {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    onAuthStateChanged(auth, user => {
      if (user) {
        loginSuccess({ email: user.email, displayName: user.displayName, uid: user.uid });
      } else if (appState.currentUser) {
        appState.currentUser = null;
        appState.cards       = [];
        cleanupWalletListeners();
        wc.stopCardQR();
        showScreen('auth');
      }
    });
  })();

});
