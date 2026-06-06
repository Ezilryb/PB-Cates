# 🎟️ FidélitéApp — Plateforme de fidélité "Passwordless"

Application de fidélité multi-commerce en marque blanche, sans mot de passe, déployable en **une heure** sur infrastructure **100% gratuite**.

---

## Stack technique

| Couche | Service | Free tier |
|--------|---------|-----------|
| Frontend + API | **Next.js 14** sur Vercel | 100 GB bande passante/mois |
| Base de données | **Supabase** (PostgreSQL) | 500 MB, 50k requêtes/mois |
| Emails OTP | **Resend** | 3 000 emails/mois |
| Auth | JWT maison (cookie httpOnly) | — |
| QR Code | `qrcode` (génération) + `qr-scanner` (lecture) | — |
| Offline | IndexedDB via `idb` | — |
| Export | `xlsx` | — |

---

## Déploiement en 5 étapes

### 1. Supabase — Base de données

1. Créez un compte sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet (région **eu-west** pour la France)
3. Allez dans **SQL Editor** et exécutez le contenu de `supabase/migrations/001_schema.sql`
4. Récupérez dans **Settings > API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Resend — Emails

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine (ou utilisez `onboarding@resend.dev` pour les tests)
3. Créez une clé API → `RESEND_API_KEY`
4. Renseignez l'adresse expéditrice → `EMAIL_FROM`

### 3. Variables d'environnement

Copiez `.env.example` en `.env.local` et remplissez toutes les valeurs :

```bash
cp .env.example .env.local
```

Générez les secrets avec :
```bash
openssl rand -hex 32   # Pour SESSION_SECRET
openssl rand -hex 32   # Pour QR_SECRET
```

### 4. Premier restaurant et compte admin

Exécutez dans Supabase SQL Editor (adaptez les valeurs) :

```sql
-- Crée votre restaurant
INSERT INTO restaurants (name, description, color, stamps_required, reward_description)
VALUES (
  'Le Bistrot du Coin',
  'Cuisine traditionnelle française',
  '#f97316',
  10,
  'Un café ou un dessert offert !'
);

-- Crée votre compte admin
INSERT INTO staff_accounts (restaurant_id, email, role)
SELECT id, 'votre@email.com', 'admin'
FROM restaurants WHERE name = 'Le Bistrot du Coin';

-- Optionnel : compte caisse partagé pour les vendeurs
INSERT INTO staff_accounts (restaurant_id, email, role)
SELECT id, 'caisse@monrestaurant.fr', 'staff'
FROM restaurants WHERE name = 'Le Bistrot du Coin';
```

### 5. Déploiement sur Vercel

```bash
# Installation locale
npm install

# Vérification du build
npm run build

# Déploiement (si vous avez le CLI Vercel)
npx vercel --prod
```

Ou connectez votre repo GitHub à [vercel.com](https://vercel.com) et ajoutez les variables d'environnement dans **Settings > Environment Variables**.

---

## Utilisation

### Côté client (votre clientèle)

1. Le client visite `https://votre-app.vercel.app` depuis son smartphone
2. Il saisit son email → reçoit un code à 6 chiffres → il est connecté
3. Son portefeuille affiche toutes les cartes de fidélité disponibles
4. En cliquant sur une carte, il voit ses tampons + un **QR code** qui se rafraîchit toutes les 30 secondes

### Côté vendeur/caisse

1. Le vendeur visite `https://votre-app.vercel.app` et se connecte avec l'email caisse
2. Il accède au **mode scanner** : la caméra s'ouvre
3. Il scanne le QR code du client → choisit le nombre de tampons → confirme
4. En cas de coupure WiFi : les tampons sont mis en file d'attente et synchronisés automatiquement dès le retour du réseau

### Côté admin

1. Connectez-vous avec votre email admin → accès au **tableau de bord**
2. **Paramètres** : configurez la couleur, le nombre de tampons, la récompense, les règles anti-fraude
3. **Équipe** : ajoutez/supprimez des comptes vendeur
4. **Export** : téléchargez un fichier Excel avec tout l'historique

---

## Architecture des routes

```
GET  /                          → Redirect selon rôle
GET  /login                     → Page de connexion (OTP)
GET  /wallet                    → Portefeuille client
GET  /wallet/[restaurantId]     → Carte fidélité + QR code
GET  /vendor                    → Interface caisse (scanner QR)
GET  /admin                     → Tableau de bord admin
GET  /admin/settings            → Paramètres restaurant
GET  /admin/export              → Export données
GET  /admin/setup               → Gestion équipe

POST /api/auth/send-otp         → Envoie code OTP par email
POST /api/auth/verify-otp       → Vérifie code → pose cookie session
GET  /api/auth/logout           → Supprime cookie → redirect /login

GET  /api/qr/generate           → Génère token QR (JWT 30s)
POST /api/qr/peek               → Info client depuis token (sans tampon)
POST /api/qr/verify             → Vérifie token + ajoute tampons

POST /api/stamps/sync           → Synchronise tampons hors-ligne

GET  /api/wallet/[id]           → Données carte client
GET  /api/wallet/[id]/history   → Historique tampons

GET  /api/vendor/info           → Infos restaurant pour l'interface caisse

GET  /api/admin/settings        → Paramètres restaurant
PATCH /api/admin/settings       → Mise à jour paramètres
GET  /api/admin/export          → Télécharge fichier Excel
GET  /api/admin/setup           → Liste staff
POST /api/admin/setup           → Ajoute/supprime staff
```

---

## Sécurité

- **Aucun mot de passe stocké** : authentification par OTP email uniquement
- **Sessions JWT** : cookie `httpOnly`, `Secure`, `SameSite=Lax`, durée 7 jours
- **QR codes JWT signés** : expiration 30 secondes, rotation automatique
- **Row Level Security** (Supabase) : toutes les tables bloquent l'accès direct depuis le client
- **Anti-fraude** : limite configurable de tampons par client par jour
- **Déduplication offline** : `offlineId` UUID unique prévient les doubles ajouts

---

## Personnalisation marque blanche

Pour adapter à votre restaurant avant livraison :

1. **Nom & couleurs** : via le dashboard admin (`/admin/settings`) ou directement en SQL
2. **Logo** : uploadez une image dans Supabase Storage, mettez l'URL dans `restaurants.logo_url`
3. **Domaine** : configurez votre domaine personnalisé dans Vercel (Settings > Domains)
4. **Email expéditeur** : dans Resend, ajoutez votre domaine pour envoyer depuis `noreply@votre-resto.fr`
5. **Nom de l'app** : modifiez `APP_NAME` dans les métadonnées (`src/app/layout.tsx`)

---

## Estimation de coût (500 clients actifs)

| Service | Usage estimé | Coût mensuel |
|---------|-------------|--------------|
| Vercel (Hobby) | ~50k requêtes/mois | **0 €** |
| Supabase (Free) | ~200 MB données | **0 €** |
| Resend (Free) | ~1 500 emails/mois | **0 €** |
| **Total** | | **0 €** |

Au-delà de 500 clients actifs quotidiens, Supabase Pro à 25$/mois devient nécessaire.

---

## Licence

Code livré en propriété exclusive à l'acheteur. Aucune restriction d'utilisation ou de redistribution.
