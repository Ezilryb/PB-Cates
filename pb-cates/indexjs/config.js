/* ══════════════════════════════════════════════════════════════════
   CONFIG — Constantes partagées entre tous les modules
══════════════════════════════════════════════════════════════════ */

export const QR_DURATION      = 150;
export const QR_CIRCUMFERENCE = 553;

/* Durées de la transition de glissement entre les cartes du portefeuille (en ms) */
export const WC_SLIDE_OUT_MS = 160;
export const WC_SLIDE_IN_MS  = 210;

/*
  Palette dynamique par commerce — partagée entre le carrousel (dégradés inline)
  et la fiche détail (classes Tailwind arbitraires), pour une cohérence parfaite.
*/
export const CARD_GRADIENTS = {
  'card-general': 'linear-gradient(135deg,#b08d2e,#1a1505)',
  'card-noir':    'linear-gradient(135deg,#475569,#0f172a)',
  'card-navy':    'linear-gradient(135deg,#1e3a8a,#0b1120)',
  'card-forest':  'linear-gradient(135deg,#047857,#052e1f)',
  'card-plum':    'linear-gradient(135deg,#6d28d9,#1e1033)',
  'card-amber':   'linear-gradient(135deg,#b45309,#1c1006)',
};
