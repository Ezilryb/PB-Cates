/* ══════════════════════════════════════════════════════════════════
   STATE — Singleton d'état global partagé par tous les modules
   Évite le prop-drilling entre auth, wallet, carrousel et QR.
══════════════════════════════════════════════════════════════════ */
import { QR_DURATION } from './config.js';

export const appState = {
  currentScreen:  'auth',
  currentUser:    null,
  cards:          [],
  selectedCardId: null,
  qrTimer:        null,
  qrTimerValue:   QR_DURATION
};
