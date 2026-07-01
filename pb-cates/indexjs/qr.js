/* ══════════════════════════════════════════════════════════════════
   QR CODE DYNAMIQUE
   Génère un vrai QR code scannable via la lib qrcode.js (davidshimjs).
   Token : { v:1, card_id, uid, ts, exp, nonce }
     • card_id = null       → Carte Universelle (passe-partout)
     • card_id = commerceId → Carte de commerce spécifique
══════════════════════════════════════════════════════════════════ */
import { appState }                 from './state.js';
import { QR_DURATION, QR_CIRCUMFERENCE } from './config.js';

let qrInstance = null;

export function generateNonce() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateQRToken(cardId) {
  const now            = Date.now();
  const resolvedCardId = cardId !== undefined ? cardId : (appState.selectedCardId || null);
  return JSON.stringify({
    v:       1,
    card_id: resolvedCardId,
    uid:     appState.currentUser?.uid || '',
    ts:      now,
    exp:     now + (QR_DURATION * 1000),
    nonce:   generateNonce()
  });
}

export function renderQRCode() {
  const container = document.getElementById('qr-canvas-container');
  container.innerHTML = '';
  if (typeof QRCode === 'undefined') {
    container.innerHTML = '<div style="padding:8px;font-size:10px;color:#999;text-align:center">QR indisponible</div>';
    return;
  }
  qrInstance = new QRCode(container, {
    text:         generateQRToken(),
    width:        144,
    height:       144,
    colorDark:    '#000000',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

export function updateRing(timeLeft) {
  const ring    = document.getElementById('qr-ring-progress');
  const timerEl = document.getElementById('qr-timer');
  if (ring) {
    const offset          = QR_CIRCUMFERENCE * (1 - timeLeft / QR_DURATION);
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = timeLeft > 18 ? '#c9a84c' : timeLeft > 9 ? '#d4700a' : '#d43a3a';
  }
  if (timerEl) timerEl.textContent = timeLeft;
}

export function openQROverlay() {
  const overlay = document.getElementById('qr-overlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  renderQRCode();
  appState.qrTimerValue = QR_DURATION;
  updateRing(QR_DURATION);
  clearInterval(appState.qrTimer);
  appState.qrTimer = setInterval(() => {
    appState.qrTimerValue--;
    updateRing(appState.qrTimerValue);
    if (appState.qrTimerValue <= 0) {
      renderQRCode();
      appState.qrTimerValue = QR_DURATION;
    }
  }, 1000);
}

export function closeQROverlay(e) {
  if (e && e.target !== document.getElementById('qr-overlay')) return;
  const overlay = document.getElementById('qr-overlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  clearInterval(appState.qrTimer);
  updateRing(QR_DURATION);
}

/* Exposition globale — appelé via onclick dans le HTML statique */
window.openQROverlay  = openQROverlay;
window.closeQROverlay = closeQROverlay;
