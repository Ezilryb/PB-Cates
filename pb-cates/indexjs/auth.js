/* ══════════════════════════════════════════════════════════════════
   AUTH — Flux d'authentification complets
   Email/password, Google, Apple (redirect Safari), reset mot de passe.
══════════════════════════════════════════════════════════════════ */
import { getFbAuth }                   from './firebase.js';
import { firebaseAuthError, showToast } from './utils.js';
import { loginSuccess }                from './wallet.js';

/* ── Helpers DOM ── */
export function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function clearAuthError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.classList.add('hidden');
}

/* ── Onglets Connexion / Inscription ── */
export function switchAuthTab(tab) {
  document.getElementById('panel-login').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('panel-register').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('panel-forgot').style.display   = 'none';
  const loginTab = document.getElementById('tab-login');
  const regTab   = document.getElementById('tab-register');
  const setActive = (el, on) => {
    el.classList.toggle('bg-white',      on);
    el.classList.toggle('shadow-sm',     on);
    el.classList.toggle('text-slate-900', on);
    el.classList.toggle('text-slate-400', !on);
  };
  setActive(loginTab, tab === 'login');
  setActive(regTab,   tab === 'register');
  clearAuthError();
}

/* ── Panneau mot de passe oublié ── */
export function showForgotPanel() {
  const loginEmail = document.getElementById('login-email').value.trim();
  if (loginEmail) document.getElementById('forgot-email').value = loginEmail;
  document.getElementById('panel-login').style.display    = 'none';
  document.getElementById('panel-forgot').style.display   = '';
  document.getElementById('forgot-success').style.display = 'none';
  document.getElementById('forgot-email').focus();
  clearAuthError();
}
export function hideForgotPanel() {
  document.getElementById('panel-forgot').style.display = 'none';
  document.getElementById('panel-login').style.display  = '';
}
export async function handleForgotPassword() {
  clearAuthError();
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showAuthError('Veuillez saisir votre adresse email.'); return; }
  const btn = document.getElementById('btn-forgot-send');
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-current/25 border-t-current rounded-full animate-spin mr-1.5 align-middle"></span> Envoi…';
  try {
    const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    await sendPasswordResetEmail(auth, email);
    document.getElementById('forgot-success').style.display = '';
    document.getElementById('forgot-email').value = '';
  } catch (err) {
    const map = {
      'auth/user-not-found':         'Aucun compte trouvé pour cet email.',
      'auth/invalid-email':          'Adresse email invalide.',
      'auth/too-many-requests':      'Trop de demandes. Réessayez plus tard.',
      'auth/network-request-failed': 'Erreur réseau.'
    };
    showAuthError(map[err.code] || 'Une erreur est survenue.');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = 'Envoyer le lien de réinitialisation';
  }
}

/* ── Email / Password ── */
export async function handleEmailLogin() {
  clearAuthError();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showAuthError('Veuillez remplir tous les champs.'); return; }
  const btn = document.getElementById('btn-login');
  btn.disabled  = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-current/25 border-t-current rounded-full animate-spin mr-1.5 align-middle"></span> Connexion…';
  try {
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    const cred = await signInWithEmailAndPassword(auth, email, password);
    loginSuccess({ email: cred.user.email, displayName: cred.user.displayName, uid: cred.user.uid });
  } catch (err) { showAuthError(firebaseAuthError(err.code)); }
  finally { btn.disabled = false; btn.innerHTML = 'Se connecter'; }
}

export async function handleEmailRegister() {
  clearAuthError();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!email || !password) { showAuthError('Veuillez remplir tous les champs.'); return; }
  if (password.length < 6)  { showAuthError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
  const btn = document.getElementById('btn-register');
  btn.disabled  = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-current/25 border-t-current rounded-full animate-spin mr-1.5 align-middle"></span> Création…';
  try {
    const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    showToast('Compte créé avec succès !', 'success');
    loginSuccess({ email: cred.user.email, displayName: cred.user.displayName, uid: cred.user.uid });
  } catch (err) { showAuthError(firebaseAuthError(err.code)); }
  finally { btn.disabled = false; btn.innerHTML = 'Créer mon compte'; }
}

/* ── Google (popup) ── */
export async function signInWithGoogle() {
  clearAuthError();
  document.getElementById('btn-google').disabled = true;
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth = await getFbAuth();
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    loginSuccess({ email: cred.user.email, displayName: cred.user.displayName, uid: cred.user.uid });
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') showAuthError(firebaseAuthError(err.code));
  } finally { document.getElementById('btn-google').disabled = false; }
}

/* ── Apple (redirect — requis par Safari / iOS) ── */
export async function signInWithApple() {
  clearAuthError();
  const btn = document.getElementById('btn-apple');
  btn.disabled  = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-current/25 border-t-current rounded-full animate-spin mr-1.5 align-middle"></span> Redirection Apple…';
  try {
    const { OAuthProvider, signInWithRedirect } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    const auth     = await getFbAuth();
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    await signInWithRedirect(auth, provider);
  } catch (err) {
    showAuthError(firebaseAuthError(err.code));
    btn.disabled  = false;
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46.3 790.6.1 656.4.1 577.2c0-207.2 135.4-316.7 269.1-316.7 71 0 130.5 46.4 175 46.4 42.8 0 109.9-49.5 190.5-49.5zm-88-76.4c40.8-48.6 70-116.1 70-183.6 0-9.5-.6-19-2.5-26.9-66.4 2.5-145.4 44.1-193 98.5-37.5 42.8-72.5 110.3-72.5 178.8 0 10.8 1.9 21.7 2.5 25.2 3.8.6 10.1 1.3 16.4 1.3 59.6 0 133.2-40.1 179.1-93.3z"/></svg> Continuer avec Apple';
  }
}

/* ── Exposition globale — attributs onclick dans le HTML statique ── */
window.signInWithGoogle       = signInWithGoogle;
window.signInWithApple        = signInWithApple;
window.switchAuthTab          = switchAuthTab;
window.handleEmailLogin       = handleEmailLogin;
window.handleEmailRegister    = handleEmailRegister;
window.showForgotPanel        = showForgotPanel;
window.hideForgotPanel        = hideForgotPanel;
window.handleForgotPassword   = handleForgotPassword;
