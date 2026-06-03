// ================================================================
// services/otpService.js
// Logique métier OTP : génération, stockage haché, vérification.
// Ce service opère DIRECTEMENT sur la table `utilisateurs` du Sprint 1.
// ================================================================
const crypto = require('crypto');
const pool = require('../config/database');

// ----------------------------------------------------------------
// CONSTANTES DE CONFIGURATION
// ----------------------------------------------------------------
const OTP_EXPIRES_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES) || 5;
const OTP_MAX_ATTEMPTS    = parseInt(process.env.OTP_MAX_ATTEMPTS)    || 3;
const OTP_BLOCK_MINUTES   = parseInt(process.env.OTP_BLOCK_DURATION_MINUTES) || 15;

// ----------------------------------------------------------------
// UTILITAIRE : Hasher un code OTP en SHA-256 (hex, 64 chars)
// Correspond au champ CHAR(64) otp_hash du Sprint 1.
// ----------------------------------------------------------------
function hashOTP(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// ----------------------------------------------------------------
// UTILITAIRE : Générer un code à 6 chiffres cryptographiquement sûr
// crypto.randomInt() est plus sûr que Math.random() pour ce cas.
// ----------------------------------------------------------------
function generateOTPCode() {
  // Produit un entier entre 100000 et 999999 → toujours 6 chiffres
  return String(crypto.randomInt(100000, 999999));
}

// ================================================================
// generateAndStoreOTP(email)
//
// 1. Cherche ou crée l'utilisateur dans `utilisateurs`
// 2. Vérifie qu'il n'est pas bloqué (anti-brute-force)
// 3. Génère un code, le hashe, le stocke avec sa date d'expiration
// 4. Remet les tentatives à 0 (nouveau code = nouveau cycle)
// Retourne : { code, user } — le code en clair pour l'envoyer par email
// ================================================================
async function generateAndStoreOTP(email) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Étape 1 : Upsert de l'utilisateur ---
    // ON CONFLICT garantit que l'email existant ne crée pas de doublon.
    // Pour un nouveau client, role = 'client' par défaut (conforme Sprint 1).
    const upsertResult = await client.query(
      `INSERT INTO utilisateurs (email, role)
       VALUES ($1, 'client')
       ON CONFLICT (email) DO UPDATE
         SET email = EXCLUDED.email   -- no-op, force le retour de la ligne
       RETURNING id, email, role, commerce_id, actif,
                 otp_bloque_jusqu_au`,
      [email.toLowerCase().trim()]
    );

    const user = upsertResult.rows[0];

    // --- Étape 2 : Vérifier si le compte est actif ---
    if (!user.actif) {
      throw new Error('ACCOUNT_DISABLED');
    }

    // --- Étape 3 : Vérifier le blocage anti-brute-force ---
    if (user.otp_bloque_jusqu_au && new Date(user.otp_bloque_jusqu_au) > new Date()) {
      const unblockAt = new Date(user.otp_bloque_jusqu_au);
      throw Object.assign(new Error('ACCOUNT_BLOCKED'), { unblockAt });
    }

    // --- Étape 4 : Générer et stocker le nouveau code ---
    const code       = generateOTPCode();
    const otpHash    = hashOTP(code);
    const expiresAt  = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await client.query(
      `UPDATE utilisateurs
       SET otp_hash            = $1,
           otp_expire_le       = $2,
           otp_tentatives      = 0,      -- reset : nouveau code, nouveau cycle
           otp_bloque_jusqu_au = NULL    -- lever le blocage précédent
       WHERE id = $3`,
      [otpHash, expiresAt, user.id]
    );

    await client.query('COMMIT');

    return { code, user };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ================================================================
// verifyOTP(email, code)
//
// 1. Récupère l'utilisateur
// 2. Vérifie le blocage, l'expiration, puis le hash
// 3. Si correct  → purge les champs OTP, met à jour derniere_connexion
// 4. Si incorrect → incrémente les tentatives, bloque si max atteint
// Retourne : { user } — l'objet utilisateur authentifié
// ================================================================
async function verifyOTP(email, code) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // --- Étape 1 : Récupérer l'utilisateur ---
    const result = await client.query(
      `SELECT id, email, role, commerce_id, actif,
              otp_hash, otp_expire_le,
              otp_tentatives, otp_bloque_jusqu_au
       FROM utilisateurs
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Réponse volontairement vague pour ne pas énumérer les emails
      throw new Error('INVALID_CODE');
    }

    const user = result.rows[0];

    // --- Étape 2a : Compte actif ? ---
    if (!user.actif) {
      throw new Error('ACCOUNT_DISABLED');
    }

    // --- Étape 2b : Compte bloqué ? ---
    if (user.otp_bloque_jusqu_au && new Date(user.otp_bloque_jusqu_au) > new Date()) {
      const unblockAt = new Date(user.otp_bloque_jusqu_au);
      throw Object.assign(new Error('ACCOUNT_BLOCKED'), { unblockAt });
    }

    // --- Étape 2c : Code OTP existe ? ---
    if (!user.otp_hash || !user.otp_expire_le) {
      throw new Error('NO_PENDING_OTP');
    }

    // --- Étape 2d : Code expiré ? ---
    if (new Date(user.otp_expire_le) < new Date()) {
      // Purger le code expiré pour ne pas polluer la base
      await client.query(
        `UPDATE utilisateurs
         SET otp_hash = NULL, otp_expire_le = NULL, otp_tentatives = 0
         WHERE id = $1`,
        [user.id]
      );
      await client.query('COMMIT');
      throw new Error('OTP_EXPIRED');
    }

    // --- Étape 2e : Code correct ? (comparaison des hashes) ---
    const inputHash = hashOTP(code);
    const isValid   = crypto.timingSafeEqual(
      Buffer.from(user.otp_hash, 'hex'),
      Buffer.from(inputHash,     'hex')
    );

    if (!isValid) {
      // Incrémenter les tentatives ratées
      const newAttempts = user.otp_tentatives + 1;

      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        // Bloquer le compte temporairement
        const blockedUntil = new Date(Date.now() + OTP_BLOCK_MINUTES * 60 * 1000);
        await client.query(
          `UPDATE utilisateurs
           SET otp_tentatives      = $1,
               otp_bloque_jusqu_au = $2,
               otp_hash            = NULL,  -- invalider le code
               otp_expire_le       = NULL
           WHERE id = $3`,
          [newAttempts, blockedUntil, user.id]
        );
        await client.query('COMMIT');
        throw Object.assign(
          new Error('ACCOUNT_BLOCKED'),
          { unblockAt: blockedUntil, isNewBlock: true }
        );
      }

      // Pas encore bloqué : juste incrémenter
      await client.query(
        `UPDATE utilisateurs SET otp_tentatives = $1 WHERE id = $2`,
        [newAttempts, user.id]
      );
      await client.query('COMMIT');
      throw Object.assign(
        new Error('INVALID_CODE'),
        { remainingAttempts: OTP_MAX_ATTEMPTS - newAttempts }
      );
    }

    // ✅ Code correct — Purger les champs OTP et tracer la connexion
    await client.query(
      `UPDATE utilisateurs
       SET otp_hash            = NULL,
           otp_expire_le       = NULL,
           otp_tentatives      = 0,
           otp_bloque_jusqu_au = NULL,
           derniere_connexion  = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    // Retourner l'utilisateur propre (sans les champs OTP sensibles)
    return {
      id:         user.id,
      email:      user.email,
      role:       user.role,
      commerce_id: user.commerce_id,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { generateAndStoreOTP, verifyOTP };
