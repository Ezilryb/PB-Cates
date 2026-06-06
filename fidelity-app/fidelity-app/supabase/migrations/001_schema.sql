-- ================================================================
-- FIDELITY APP — Schéma de base de données
-- À exécuter dans Supabase > SQL Editor
-- ================================================================

-- Extension UUID (activée par défaut dans Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- TABLE : restaurants
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  color         TEXT NOT NULL DEFAULT '#f97316',     -- Couleur principale (hex)
  stamps_required    INT NOT NULL DEFAULT 10,         -- Nb tampons pour récompense
  reward_description TEXT NOT NULL DEFAULT 'Une récompense offerte !',
  multi_stamp_enabled    BOOLEAN NOT NULL DEFAULT false,
  max_stamps_per_visit   INT NOT NULL DEFAULT 1,      -- Si multi_stamp activé
  max_stamps_per_day     INT NOT NULL DEFAULT 10,     -- Anti-fraude
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABLE : staff_accounts (partagé par vendeurs + admin du même resto)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_email ON staff_accounts(email);
CREATE INDEX IF NOT EXISTS idx_staff_restaurant ON staff_accounts(restaurant_id);

-- ----------------------------------------------------------------
-- TABLE : customers
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ----------------------------------------------------------------
-- TABLE : loyalty_cards (une carte par client et par restaurant)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id        UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  current_stamps       INT NOT NULL DEFAULT 0,
  total_stamps_earned  INT NOT NULL DEFAULT 0,
  total_rewards_earned INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_cards_customer ON loyalty_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_cards_restaurant ON loyalty_cards(restaurant_id);

-- ----------------------------------------------------------------
-- TABLE : stamp_events (journal immuable de chaque tampon)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stamp_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  stamps_added INT NOT NULL DEFAULT 1,
  staff_id     UUID REFERENCES staff_accounts(id),
  note         TEXT,
  offline_id   TEXT UNIQUE,     -- Déduplication sync offline (UUID généré côté client)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_card ON stamp_events(card_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON stamp_events(created_at DESC);

-- ----------------------------------------------------------------
-- TABLE : reward_redemptions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  staff_id   UUID REFERENCES staff_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- TABLE : otp_codes (codes de connexion par email)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

-- ----------------------------------------------------------------
-- FONCTION : nettoyage automatique des OTP expirés (optionnel)
-- À programmer via pg_cron dans Supabase si disponible
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_otp()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) — Sécurité côté base de données
-- Les routes API utilisent la clé service_role qui bypass RLS.
-- Activez RLS comme mesure de sécurité supplémentaire.
-- ----------------------------------------------------------------
ALTER TABLE restaurants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes          ENABLE ROW LEVEL SECURITY;

-- Politique : seule la clé service_role (côté serveur) peut tout lire/écrire
-- (les clients utilisent des routes API Next.js, jamais le client Supabase directement)
CREATE POLICY "service_only" ON restaurants        USING (false);
CREATE POLICY "service_only" ON staff_accounts     USING (false);
CREATE POLICY "service_only" ON customers          USING (false);
CREATE POLICY "service_only" ON loyalty_cards      USING (false);
CREATE POLICY "service_only" ON stamp_events       USING (false);
CREATE POLICY "service_only" ON reward_redemptions USING (false);
CREATE POLICY "service_only" ON otp_codes          USING (false);

-- ----------------------------------------------------------------
-- DONNÉES DE DÉMARRAGE (seed) — Modifiez selon votre restaurant
-- ----------------------------------------------------------------
-- Décommentez et adaptez pour créer votre premier restaurant + admin :
--
-- INSERT INTO restaurants (name, description, color, stamps_required, reward_description)
-- VALUES (
--   'Le Bistrot du Coin',
--   'Restaurant traditionnel français',
--   '#f97316',
--   10,
--   'Un café ou un dessert offert !'
-- );
--
-- INSERT INTO staff_accounts (restaurant_id, email, role)
-- SELECT id, 'admin@monrestaurant.fr', 'admin'
-- FROM restaurants WHERE name = 'Le Bistrot du Coin';
--
-- INSERT INTO staff_accounts (restaurant_id, email, role)
-- SELECT id, 'serveur@monrestaurant.fr', 'staff'
-- FROM restaurants WHERE name = 'Le Bistrot du Coin';
