# Sprint 2 — Backend Authentification OTP/Magic Code

## Architecture

```
src/
├── index.js                  # Point d'entrée Express
├── config/
│   └── database.js           # Pool PostgreSQL (Supabase)
├── routes/
│   └── auth.js               # POST /send-code | POST /verify-code | GET /me
├── services/
│   ├── otpService.js         # Génération/stockage/vérification OTP
│   ├── emailService.js       # Envoi email via Resend
│   └── jwtService.js         # Génération/vérification JWT
├── middleware/
│   └── authenticate.js       # Middleware JWT + contrôle de rôle
└── templates/
    └── otpEmail.js           # Template HTML + texte brut
```

---

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Ouvrir .env et remplir les valeurs (voir section ci-dessous)

# 3. Lancer en développement
npm run dev

# 4. Lancer en production
npm start
```

---

## Configuration des variables d'environnement

### `DATABASE_URL`
Récupérer depuis : **Supabase Dashboard → Settings → Database → Connection string → URI**

```
DATABASE_URL=postgresql://postgres:[MOT_DE_PASSE]@db.[REF].supabase.co:5432/postgres
```

### `JWT_SECRET`
Générer une clé forte (ne jamais mettre en dur dans le code) :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### `RESEND_API_KEY`
1. Créer un compte gratuit sur [resend.com](https://resend.com)
2. **Dashboard → API Keys → Create API Key**
3. Coller la clé dans `.env` (format `re_xxxxxxxxxxxx`)
4. En développement : utiliser `EMAIL_FROM=onboarding@resend.dev` (domaine Resend, pas besoin de vérification)
5. En production : vérifier votre propre domaine dans Resend (DNS TXT/MX)

---

## Référence API

### `POST /api/auth/send-code`
Génère un code à 6 chiffres, le stocke haché en base et l'envoie par email.

**Body :**
```json
{
  "email": "client@example.com",
  "commerce_name": "Pizzeria Mario"
}
```

**Réponse 200 :**
```json
{
  "message": "Code envoyé. Vérifiez votre email.",
  "expires_in_seconds": 300
}
```

**Rate limit :** 3 requêtes / 15 min par IP.

---

### `POST /api/auth/verify-code`
Vérifie le code, purge les champs OTP en base et retourne un JWT.

**Body :**
```json
{
  "email": "client@example.com",
  "code": "482916"
}
```

**Réponse 200 :**
```json
{
  "message": "Connexion réussie.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "client@example.com",
    "role": "client",
    "commerce_id": null
  }
}
```

**Codes d'erreur :**
| Code HTTP | `error`                     | Cause                                |
|-----------|----------------------------|--------------------------------------|
| 401       | Code incorrect             | Code invalide                        |
| 401       | Code expiré                | > 5 min                              |
| 401       | Aucun code en attente      | Pas de `send-code` préalable         |
| 429       | Compte bloqué              | 3 tentatives ratées → ban 15 min     |

---

### `GET /api/auth/me`
Retourne le profil de l'utilisateur connecté.

**Header :** `Authorization: Bearer <token>`

**Réponse 200 :**
```json
{
  "user": {
    "sub": "uuid",
    "email": "client@example.com",
    "role": "client",
    "commerce_id": null
  }
}
```

---

## Modèle de données OTP (dans `utilisateurs` — Sprint 1)

Pas de table séparée : les champs OTP vivent directement dans `utilisateurs`,
conformément au Sprint 1. Ils sont purgés dès validation réussie.

| Colonne                | Type         | Rôle                                    |
|------------------------|--------------|------------------------------------------|
| `otp_hash`             | `CHAR(64)`   | SHA-256 du code (jamais le code brut)   |
| `otp_expire_le`        | `TIMESTAMPTZ`| Expiration (NOW + 5 min)                |
| `otp_tentatives`       | `SMALLINT`   | Compteur de tentatives ratées           |
| `otp_bloque_jusqu_au`  | `TIMESTAMPTZ`| Ban temporaire après 3 échecs           |

---

## Sécurité — Points clés

- **Code jamais en clair** : seul le SHA-256 est stocké. Même un accès direct à la base ne révèle aucun code.
- **`crypto.timingSafeEqual`** : comparaison en temps constant → protection contre les attaques temporelles.
- **Rate limiting** à deux niveaux : IP (middleware) + email (compteur en base).
- **Expiration côté serveur** : le code est invalidé indépendamment du client.
- **Purge systématique** : les champs OTP sont effacés dès validation OU expiration.
- **JWT avec claims minimaux** : `sub`, `email`, `role`, `commerce_id` — pas de données sensibles dans le payload.

---

## Checklist de déploiement

- [ ] `NODE_ENV=production` dans les variables d'environnement
- [ ] Domaine email vérifié sur Resend
- [ ] SSL actif sur la base de données (`rejectUnauthorized: false` déjà configuré)
- [ ] RLS activé sur toutes les tables Supabase (Sprint 1)
- [ ] `JWT_SECRET` long et aléatoire (min 64 bytes)
- [ ] `ALLOWED_ORIGINS` restreint à vos vrais domaines
