/* ══════════════════════════════════════════════════════════════════
   NAVIGATION — Routeur d'écrans
   Bascule la section visible et met à jour la barre de navigation.
══════════════════════════════════════════════════════════════════ */
import { appState } from './state.js';

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('flex');
  });
  const t = document.getElementById(`screen-${id}`);
  if (t) { t.classList.remove('hidden'); t.classList.add('flex'); }

  const showNav = (id === 'wallet' || id === 'detail' || id === 'profile');
  document.getElementById('bottom-nav').style.display = showNav ? 'flex' : 'none';

  const navWallet  = document.getElementById('nav-wallet');
  const navProfile = document.getElementById('nav-profile');
  const setActive  = (el, on) => {
    if (!el) return;
    el.classList.toggle('text-gold-dark', on);
    el.classList.toggle('text-slate-400', !on);
  };
  setActive(navWallet,  id === 'wallet' || id === 'detail');
  setActive(navProfile, id === 'profile');

  appState.currentScreen = id;
  window.scrollTo(0, 0);
}

/* Exposition globale — appelé via onclick="showScreen('wallet')" dans le HTML */
window.showScreen = showScreen;
