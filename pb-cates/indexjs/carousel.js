/* ══════════════════════════════════════════════════════════════════
   CARROUSEL STYLE CARTE BANCAIRE
   Flip 3D, swipe gestuel, QR inline auto-cyclant sur le dos.
══════════════════════════════════════════════════════════════════ */
import { QR_DURATION, WC_SLIDE_OUT_MS, WC_SLIDE_IN_MS } from './config.js';
import { generateQRToken } from './qr.js';

export const wc = {
  cards:          [],
  idx:            0,
  flipped:        {},
  pStart:         null,
  qrTimer:        null,
  qrTimerValue:   0,
  qrActiveCardId: null,
  animating:      false,
  dragActive:     false,

  GRAD: {
    'card-general': ['#b08d2e', '#1a1505'],
    'card-noir':    ['#475569', '#0f172a'],
    'card-navy':    ['#1e3a8a', '#0b1120'],
    'card-forest':  ['#047857', '#052e1f'],
    'card-plum':    ['#6d28d9', '#1e1033'],
    'card-amber':   ['#b45309', '#1c1006'],
  },

  /* Motif QR décoratif (non scannable — uniquement pour l'aspect visuel) */
  QR_PAT: '11111110110111111111000010010100001010111011101011010111011101010101011101110101000000101000001011111110101111111100000000110000000010110110111010010100101001100100101011010101010101010101001000101010100100001011111110111001010110000000010010101011111110001011111011000001010001010110111111100001011111101',

  grad(colorClass) { return this.GRAD[colorClass] || this.GRAD['card-noir']; },

  buildQRSvg(size) {
    const n = 17, cs = size / n;
    let h = `<rect width="${size}" height="${size}" fill="white"/>`;
    this.QR_PAT.split('').forEach((c, k) => {
      if (c === '1') {
        const x = (k % n) * cs + 0.4, y = Math.floor(k / n) * cs + 0.4;
        h += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cs - 0.3).toFixed(1)}" height="${(cs - 0.3).toFixed(1)}" fill="#111"/>`;
      }
    });
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${h}</svg>`;
  },

  esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  init(allCards) {
    this.cards = allCards;
    if (this.idx >= allCards.length) this.idx = 0;
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    const scene = document.getElementById('wc-scene');
    if (!scene || scene._wcBound) return;
    scene._wcBound = true;
    scene.tabIndex = 0; // navigation clavier (flèches gauche/droite)

    scene.addEventListener('pointerdown', e => {
      if (this.animating) return; // une transition est déjà en cours : on l'ignore
      this.pStart = { x: e.clientX, y: e.clientY, t: Date.now() };
      this.dragActive = false;
      try { scene.setPointerCapture(e.pointerId); } catch (_) {}
    });

    scene.addEventListener('pointermove', e => {
      if (!this.pStart || this.animating) return;
      const r  = scene.getBoundingClientRect();
      const x  = ((e.clientX - r.left) / r.width)  * 100;
      const y  = ((e.clientY - r.top)  / r.height) * 100;
      const sh = document.getElementById('wc-shimmer');
      if (sh) sh.style.background = `radial-gradient(ellipse 170px 100px at ${x}% ${y}%, rgba(255,255,255,0.06), transparent 65%)`;

      const dx = e.clientX - this.pStart.x;
      const dy = e.clientY - this.pStart.y;
      if (!this.dragActive && Math.hypot(dx, dy) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        this.dragActive = true;
        scene.style.transition = 'none';
      }
      if (this.dragActive) {
        // Effet "élastique" si on tente de dépasser la première ou la dernière carte
        const atStart = this.idx === 0 && dx > 0;
        const atEnd   = this.idx === this.cards.length - 1 && dx < 0;
        const damp    = (atStart || atEnd) ? 0.32 : 1;
        scene.style.transform = `translateX(${dx * damp}px)`;
      }
    });

    scene.addEventListener('pointerup', e => {
      if (!this.pStart || this.animating) return;
      const dx   = e.clientX - this.pStart.x;
      const dy   = e.clientY - this.pStart.y;
      const dt   = Date.now() - this.pStart.t;
      const dist = Math.hypot(dx, dy);
      const wasDragging = this.dragActive;
      this.pStart     = null;
      this.dragActive = false;

      if (!wasDragging && dist < 12 && dt < 350) {
        const c = this.cards[this.idx];
        this.flipped[c.id] = !this.flipped[c.id];
        const inner = document.getElementById('wc-inner');
        if (inner) inner.style.transform = this.flipped[c.id] ? 'rotateY(180deg)' : 'rotateY(0)';
        if (this.flipped[c.id]) this.startCardQR(c); else this.stopCardQR();
        return;
      }

      if (wasDragging && Math.abs(dx) > 36) {
        if (dx < 0 && this.idx < this.cards.length - 1) { this.navigate(this.idx + 1, -1); return; }
        if (dx > 0 && this.idx > 0)                     { this.navigate(this.idx - 1, 1);  return; }
      }

      // Glissement insuffisant ou en butée : on relâche élastiquement vers la position de repos
      this.snapBack();
    });

    scene.addEventListener('pointercancel', () => {
      this.pStart     = null;
      this.dragActive = false;
      this.snapBack();
    });

    scene.addEventListener('keydown', e => {
      if (this.animating) return;
      if (e.key === 'ArrowRight' && this.idx < this.cards.length - 1) { e.preventDefault(); this.navigate(this.idx + 1, -1); }
      else if (e.key === 'ArrowLeft' && this.idx > 0)                 { e.preventDefault(); this.navigate(this.idx - 1, 1); }
    });
  },

  /* Relâche la carte élastiquement vers sa position de repos (glissement annulé) */
  snapBack() {
    const scene = document.getElementById('wc-scene');
    if (!scene) return;
    scene.style.transition = `transform ${WC_SLIDE_IN_MS}ms cubic-bezier(.34,1.2,.64,1)`;
    scene.style.transform  = 'translateX(0)';
    setTimeout(() => {
      scene.style.transition = '';
      scene.style.transform  = '';
    }, WC_SLIDE_IN_MS);
  },

  /*
    Transition animée de glissement entre deux cartes.
    dir : sens visuel de la sortie de la carte actuelle (1 = vers la droite, -1 = vers la gauche).
    Verrouille les interactions pendant l'animation pour éviter tout chevauchement.
  */
  navigate(newIdx, dir) {
    if (this.animating || newIdx === this.idx || newIdx < 0 || newIdx >= this.cards.length) {
      this.snapBack();
      return;
    }
    const scene = document.getElementById('wc-scene');
    if (!scene) { this.idx = newIdx; this.flipped = {}; this.render(); return; }

    this.animating = true;
    const width = scene.getBoundingClientRect().width || 320;
    // On sort largement au-delà de la largeur visible : la carte est masquée par
    // l'overflow:hidden de #wc-scene bien avant la fin du mouvement, donc l'échange
    // de contenu se fait pendant qu'elle est invisible — plus de "blanc" intermédiaire.
    const exitX = dir * width * 1.15;

    scene.style.transition = `transform ${WC_SLIDE_OUT_MS}ms cubic-bezier(.4,0,.7,.3)`;
    scene.style.transform  = `translateX(${exitX}px)`;

    setTimeout(() => {
      this.idx     = newIdx;
      this.flipped = {};
      this.render();
      if (typeof navigator.vibrate === 'function') { try { navigator.vibrate(8); } catch (_) {} }

      // Repositionne la nouvelle carte hors-écran, côté opposé, sans transition (invisible : déjà hors du cadre clippé)
      scene.style.transition = 'none';
      scene.style.transform  = `translateX(${-exitX}px)`;
      // Force le recalcul du style avant de relancer la transition d'entrée
      void scene.offsetWidth;

      scene.style.transition = `transform ${WC_SLIDE_IN_MS}ms cubic-bezier(.22,1,.36,1)`;
      scene.style.transform  = 'translateX(0)';

      setTimeout(() => {
        scene.style.transition = '';
        scene.style.transform  = '';
        this.animating = false;
      }, WC_SLIDE_IN_MS);
    }, WC_SLIDE_OUT_MS);
  },

  render() {
    if (!this.cards.length) return;
    const c          = this.cards[this.idx];
    const colorClass = c.colorClass || (c.id === '__general__' ? 'card-general' : 'card-noir');
    const [g1, g2]   = this.grad(colorClass);
    const grad       = `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`;

    const front = document.getElementById('wc-front');
    const back  = document.getElementById('wc-back');
    const inner = document.getElementById('wc-inner');
    if (!front || !back || !inner) return;

    front.style.background = grad;
    back.style.background  = grad;
    front.innerHTML        = this.buildFront(c);
    back.innerHTML         = this.buildBack(c);
    inner.style.transform  = this.flipped[c.id] ? 'rotateY(180deg)' : 'rotateY(0)';

    const scene = document.getElementById('wc-scene');
    if (scene) scene.setAttribute('aria-label', `Carte ${c.name}, ${this.idx + 1} sur ${this.cards.length} — touchez pour retourner, glissez ou utilisez les flèches pour changer`);
    const announce = document.getElementById('wc-announce');
    if (announce) announce.textContent = `Carte affichée : ${c.name}`;

    this.renderShadows();
    this.renderDots();
    this.renderList();
    if (this.flipped[c.id]) this.startCardQR(c); else this.stopCardQR();
  },

  startCardQR(card) {
    this.stopCardQR();
    this.qrActiveCardId = card.id;
    this._renderCardQRTick(card);
    this.qrTimerValue = QR_DURATION;
    this.qrTimer = setInterval(() => {
      this.qrTimerValue--;
      const timerEl = document.getElementById(`card-qr-timer-${card.id}`);
      if (timerEl) timerEl.textContent = this.qrTimerValue;
      if (this.qrTimerValue <= 0) {
        this._renderCardQRTick(card);
        this.qrTimerValue = QR_DURATION;
      }
    }, 1000);
  },

  stopCardQR() {
    clearInterval(this.qrTimer);
    this.qrTimer        = null;
    this.qrActiveCardId = null;
  },

  _renderCardQRTick(card) {
    const container = document.getElementById(`card-qr-${card.id}`);
    const timerEl   = document.getElementById(`card-qr-timer-${card.id}`);
    if (!container || typeof QRCode === 'undefined') return;
    container.innerHTML = '';
    const cardIdForToken = card.id === '__general__' ? null : card.id;
    new QRCode(container, {
      text:         generateQRToken(cardIdForToken),
      width:        100,
      height:       100,
      colorDark:    '#000000',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
    if (timerEl) timerEl.textContent = QR_DURATION;
  },

  buildFront(c) {
    const code = (c.shortCode || 'PB').toUpperCase().substring(0, 4).padEnd(4);
    const dots3 = [0, 1, 2].map(() =>
      `<span style="display:flex;gap:2.5px;">${[0, 1, 2, 3].map(() =>
        `<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,0.5);"></span>`
      ).join('')}</span>`
    ).join('');
    const stampBadge = c.maxStamps > 0
      ? `<div style="border:1px solid rgba(255,255,255,0.2);border-radius:17px;padding:4px 10px;font-size:10px;font-weight:700;color:white;letter-spacing:0.4px;background:rgba(0,0,0,0.25);">${c.stamps} / ${c.maxStamps} TAMPONS</div>`
      : '';
    return `
      <div id="wc-shimmer" style="position:absolute;inset:0;border-radius:20px;pointer-events:none;transition:background 0.08s;"></div>
      <div style="position:absolute;right:-42px;top:-42px;width:175px;height:175px;border-radius:50%;background:rgba(255,255,255,0.04);pointer-events:none;"></div>
      <div style="position:absolute;right:-28px;bottom:-72px;width:215px;height:215px;border-radius:50%;background:rgba(255,255,255,0.025);pointer-events:none;"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;">
        <div>
          <div style="font-size:7px;letter-spacing:2.4px;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:4px;">LOYALTY CARD</div>
          <div style="font-size:15px;font-weight:800;color:white;letter-spacing:0.2px;line-height:1.2;">${this.esc(c.name)}</div>
        </div>
        <div style="width:39px;height:39px;border-radius:50%;background:rgba(255,255,255,0.11);border:1px solid rgba(255,255,255,0.17);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:rgba(255,255,255,0.85);flex-shrink:0;">${this.esc((c.logoText || c.shortCode || 'PB').substring(0, 2).toUpperCase())}</div>
      </div>
      <div style="display:flex;align-items:center;gap:9px;position:relative;">
        <div style="width:40px;height:30px;border-radius:5px;border:1px solid #8A6B05;flex-shrink:0;overflow:hidden;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr 1fr;background:linear-gradient(145deg,#EEC038,#C08808,#E0B018);box-shadow:inset 0 1px 2px rgba(255,255,255,0.2);">
          <div style="grid-column:2;grid-row:1/4;background:rgba(0,0,0,0.1);border-left:1px solid rgba(0,0,0,0.07);border-right:1px solid rgba(0,0,0,0.07);"></div>
          <div style="grid-column:1/4;grid-row:2;background:rgba(0,0,0,0.1);border-top:1px solid rgba(0,0,0,0.07);border-bottom:1px solid rgba(0,0,0,0.07);"></div>
        </div>
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><circle cx="4" cy="11" r="2.4" fill="rgba(255,255,255,0.82)"/><path d="M7.5 7.5 Q13 7.5 13 11 Q13 14.5 7.5 14.5" stroke="rgba(255,255,255,0.58)" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M11 4 Q19 4 19 11 Q19 18 11 18" stroke="rgba(255,255,255,0.35)" stroke-width="1.7" fill="none" stroke-linecap="round"/></svg>
        <div style="flex:1;"></div>${stampBadge}
      </div>
      <div style="display:flex;align-items:center;gap:8px;position:relative;">${dots3}<span style="font-family:'Courier New',monospace;font-size:14px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:2px;">${this.esc(code)}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;position:relative;">
        <div>
          <div style="font-size:6.5px;letter-spacing:1.7px;color:rgba(255,255,255,0.36);font-weight:700;margin-bottom:3px;">TITULAIRE</div>
          <div style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.78);font-family:'Courier New',monospace;">${this.esc((c.holder || '').substring(0, 24))}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:6.5px;letter-spacing:1.7px;color:rgba(255,255,255,0.36);font-weight:700;margin-bottom:3px;">EXPIRATION</div>
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.82);font-family:'Courier New',monospace;">${this.esc(c.expiry || '12 / 28')}</div>
        </div>
      </div>`;
  },

  buildBack(c) {
    const isGeneral = c.id === '__general__';
    const sign      = this.esc((c.signCode || 'user').substring(0, 12));
    const dotHtml   = c.maxStamps > 0
      ? Array.from({ length: c.maxStamps }, (_, i) => {
          const f = i < c.stamps;
          return `<div style="width:11px;height:11px;border-radius:50%;background:${f ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.13)'};border:1.5px solid rgba(255,255,255,0.28);${f ? 'box-shadow:0 0 5px rgba(255,255,255,0.3);' : ''}"></div>`;
        }).join('')
      : '';
    const stampSection = c.maxStamps > 0
      ? `<div>
           <div style="font-size:6.5px;letter-spacing:2px;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:3px;">STATUT FIDÉLITÉ</div>
           <div style="font-size:13px;font-weight:800;color:white;margin-bottom:2px;">${c.stamps} / ${c.maxStamps} Tampons</div>
           <div style="font-size:9px;color:rgba(255,255,255,0.5);margin-bottom:6px;">${this.esc(c.offers || '')}</div>
           <div style="display:flex;flex-wrap:wrap;gap:3px;">${dotHtml}</div>
         </div>`
      : `<div style="font-size:9px;color:rgba(255,255,255,0.5);line-height:1.5;">Fonctionne dans tous les commerces partenaires.<br>Présentez votre QR en caisse pour rejoindre un commerce.</div>`;

    return `
      <div style="height:40px;background:#090909;margin-top:24px;flex-shrink:0;"></div>
      <div style="flex:1;padding:9px 15px 12px;display:flex;gap:11px;align-items:flex-start;overflow:hidden;">
        <div style="flex:1;display:flex;flex-direction:column;gap:7px;min-width:0;">
          <div>
            <div style="font-size:6.5px;letter-spacing:2px;color:rgba(255,255,255,0.4);font-weight:700;margin-bottom:4px;">CODE SÉCURISÉ</div>
            <div style="display:flex;border-radius:4px;overflow:hidden;">
              <div style="flex:1;background:white;padding:5px 8px;font-family:cursive;font-size:13px;color:#1A1A8A;font-weight:bold;">${sign}</div>
              <div style="background:rgba(0,0,0,0.38);padding:5px 7px;font-size:10px;color:rgba(255,255,255,0.62);display:flex;align-items:center;">✓</div>
            </div>
          </div>
          ${stampSection}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;flex-shrink:0;">
          <div id="card-qr-${this.esc(c.id)}" style="background:white;padding:5px;border-radius:9px;"></div>
          <div style="font-size:6.5px;letter-spacing:1.2px;color:rgba(255,255,255,0.38);font-weight:700;text-align:center;">${isGeneral ? 'QR UNIVERSEL' : 'QR CODE'}<br>⟳ <span id="card-qr-timer-${this.esc(c.id)}">--</span>s</div>
        </div>
      </div>`;
  },

  renderShadows() {
    const shn = document.getElementById('wc-shn');
    const shp = document.getElementById('wc-shp');
    if (!shn || !shp) return;
    if (this.idx < this.cards.length - 1) {
      const nc = this.cards[this.idx + 1]; const [g1, g2] = this.grad(nc.colorClass || 'card-noir');
      shn.style.background = `linear-gradient(135deg, ${g1}, ${g2})`; shn.style.display = '';
    } else { shn.style.display = 'none'; }
    if (this.idx > 0) {
      const pc = this.cards[this.idx - 1]; const [g1, g2] = this.grad(pc.colorClass || 'card-noir');
      shp.style.background = `linear-gradient(135deg, ${g1}, ${g2})`; shp.style.display = '';
    } else { shp.style.display = 'none'; }
  },

  renderDots() {
    const el = document.getElementById('wc-dots');
    if (!el) return;
    el.innerHTML = this.cards.map((_, i) =>
      `<div role="tab" aria-selected="${i === this.idx}" onclick="wc.goTo(${i})" style="height:7px;width:${i === this.idx ? 21 : 7}px;border-radius:4px;background:${i === this.idx ? '#c9a84c' : '#cbd5e1'};transition:all 0.3s;cursor:pointer;"></div>`
    ).join('');
  },

  renderList() {
    const el = document.getElementById('wc-list');
    if (!el) return;
    if (!this.cards.length) {
      el.innerHTML = `<div class="text-center py-8 px-4"><div class="text-sm text-slate-400">Présentez votre Carte Universelle en caisse<br>pour rejoindre votre premier commerce partenaire.</div></div>`;
      return;
    }
    el.innerHTML = this.cards.map((c, i) => {
      const colorClass = c.colorClass || (c.id === '__general__' ? 'card-general' : 'card-noir');
      const [g1, g2]   = this.grad(colorClass);
      const subtitle   = c.maxStamps > 0
        ? `${c.stamps} / ${c.maxStamps} Tampons • ${c.stamps >= c.maxStamps ? '1 Cadeau disponible ★' : '0 Cadeau(x)'}`
        : 'Carte principale';
      return `<div role="listitem" onclick="wc.goTo(${i})" class="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition ${i === this.idx ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-white/70 border border-transparent'}">
        <div style="background:linear-gradient(135deg,${g1},${g2});" class="w-[38px] h-[38px] rounded-full flex items-center justify-center text-sm font-extrabold text-white/90 flex-shrink-0">${this.esc((c.logoText || c.shortCode || 'PB').substring(0, 2).toUpperCase())}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-slate-900 mb-0.5">${this.esc(c.name)}</div>
          <div class="text-[11px] text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">${this.esc(subtitle)}</div>
        </div>
        <div class="text-[11px] text-gold-dark font-semibold flex-shrink-0">Voir →</div>
      </div>`;
    }).join('');
  },

  goTo(i) {
    if (i === this.idx || this.animating) return;
    this.navigate(i, i > this.idx ? -1 : 1);
  }
};

/* Exposition globale — wc.goTo() est appelé via onclick dans le HTML généré dynamiquement */
window.wc = wc;
