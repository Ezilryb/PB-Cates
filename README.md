# PB-Cates — Plateforme de Fidélité Multi-Commerce Passwordless

> **Solution Marque Blanche · Paiement Unique · Zéro Frais Récurrents**

---

## Structure du Projet

```
pb-cates/
├── index.html              ← App client PWA (portefeuille + QR dynamique)
├── store.html              ← App caisse PWA (scanner QR + validation tampons)
├── admin.html              ← Panneau admin — NON PWA (accès : Maj+Alt+A)
├── manifest.json           ← Manifest PWA client
├── store-manifest.json     ← Manifest PWA caisse
├── service-worker.js       ← Cache hors-ligne + Background Sync
├── firestore.rules         ← Règles de sécurité Firestore
│
└── js/
    ├── firebase.js         ← Initialisation Firebase + Magic Link
    ├── auth.js             ← Authentification passwordless
    ├── wallet.js           ← Lecture Firestore + gestion des tampons
    ├── sync.js             ← File d'attente IndexedDB hors-ligne
    └── ui.js               ← Rendu des composants + navigation
```

---

## Les 3 Interfaces

### 1. `index.html` — Portefeuille Client (PWA)
- Connexion passwordless par email (OTP 6 chiffres)
- Liste verticale des cartes de fidélité
- QR code dynamique **réel** (qrcode.js) avec token signé `{ v, card_id, uid, ts, exp, nonce }`
- Anneau de compte à rebours SVG 30 secondes (or → orange → rouge)
- Raccourci caché `Maj + Alt + A` → accès panneau admin

### 2. `store.html` — Interface Caisse (PWA)
- Connexion staff par email OTP
- Scanner caméra QR (jsQR) avec `requestAnimationFrame`
- Validation du token : expiration, version, **anti-rejeu par nonce**
- Sheet de confirmation : sélecteur de tampons (+1/+2/+3), aperçu carte client
- Historique des validations de la session
- Mode hors-ligne avec synchronisation Background Sync

### 3. `admin.html` — Panneau Administration (Non-PWA)
- Accès caché : depuis `index.html`, appuyer sur `Maj + Alt + A`
- 2 comptes administrateurs :
  - `admin@betacapital.fr` / `PBCates-Admin-2025`
  - `support@betacapital.fr` / `PBCates-Support-2025`
- CRUD complet des restaurants (persisté localStorage en démo, Firestore en prod)
- Configuration : nom, catégorie, récompense, nb tampons, thème couleur, multi-tampon, limite/jour

> ⚠️ Les credentials admin sont hardcodés pour la démo.
> En production, utiliser Firebase Custom Claims.

---

## Démarrage Rapide (Mode Démo)

Ouvrez simplement `index.html` dans un navigateur et cliquez sur **"Voir la démo sans email"**.

Pour tester la caisse : ouvrir `store.html` et cliquer **"Mode démo — sans email"**.

Pour l'admin : depuis `index.html`, appuyer sur `Maj + Alt + A`.

Aucun serveur ni Firebase requis pour tester l'interface.

---

## Déploiement Firebase (Production)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

L'app sera accessible sur : `https://votre-projet.web.app`

---

## Sécurité QR — Architecture Sprint 3

```
Client génère :  { v:1, card_id, uid, ts, exp: now+30s, nonce: uuid }
                              ↓
Caisse scanne  →  Vérifie exp > Date.now()
               →  Vérifie card_id correspond au commerce
               →  Vérifie uid via JWT Firebase
               →  Consomme le nonce (Redis/Supabase) → anti-rejeu
                              ↓
               →  updateDoc Firestore : stamps++
```

---

## Coûts Firebase (Free Tier Spark)

| Service | Limite gratuite | Suffisant pour |
|---------|-----------------|----------------|
| Authentication | 10 000 connexions/mois | ~500 clients actifs |
| Firestore reads | 50 000/jour | ✓ |
| Firestore writes | 20 000/jour | ✓ |
| Hosting | 10 GB/mois | ✓ |

**→ Coût mensuel estimé : 0 € pour 200–500 clients**
