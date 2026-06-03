// ================================================================
// routes/auth.js
// Routes d'authentification OTP :
//   POST /api/auth/send-code    → Génère et envoie le Magic Code
//   POST /api/auth/verify-code  → Vérifie le code et retourne un JWT
//   GET  /api/auth/me           → Profil de l'utilisateur connecté
// ================================================================
const express         = require('express');
const rateLimit       = require('express-rate-limit');
const { generateAndStoreOTP, verifyOTP } = require('../services/otpService');
const { sendOTPEmail }                   = require('../services/emailService');
const { generateToken }                  = require('../services/jwtService');
const { authenticate }                   = require('../middleware/authenticate');

const router = express.Router();

// ----------------------------------------------------------------
// RATE LIMITERS
// Indispensable pour une API passwordless exposée sur internet.
// ----------------------------------------------------------------

// /send-code : max 3 demandes par IP toutes les 15 minutes
const sendCodeLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              3,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Trop de demandes de code. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: false,
});

// /verify-code : max 10 tentatives par IP par 15 minutes
// (la logique applicative bloque après 3 tentatives incorrectes)
const verifyCodeLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// ----------------------------------------------------------------
// VALIDATION D'EMAIL BASIQUE (sans librairie externe)
// ----------------------------------------------------------------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// ================================================================
// POST /api/auth/send-code
//
// Body JSON : { email, commerce_name? }
//   email         : adresse email du client ou du staff
//   commerce_name : optionnel, pour personnaliser le mail
//
// Réponse 200 : { message }
// Réponse 400 : { error }
// Réponse 429 : { error } (rate limit)
// ================================================================
router.post('/send-code', sendCodeLimiter, async (req, res) => {
  const { email, commerce_name } = req.body;

  // --- Validation ---
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide ou manquante.' });
  }

  try {
    // 1. Générer + stocker le code haché en base
    const { code } = await generateAndStoreOTP(email);

    // 2. Envoyer le code par email
    await sendOTPEmail(email, code, { commerceName: commerce_name });

    // ⚠️ Ne jamais retourner le code dans la réponse API !
    return res.status(200).json({
      message: 'Code envoyé. Vérifiez votre email.',
      // expires_in : information UX pour afficher un compte à rebours côté client
      expires_in_seconds: (parseInt(process.env.OTP_EXPIRES_MINUTES) || 5) * 60,
    });

  } catch (err) {
    // Gestion des erreurs métier
    if (err.message === 'ACCOUNT_DISABLED') {
      return res.status(403).json({ error: 'Ce compte est désactivé.' });
    }
    if (err.message === 'ACCOUNT_BLOCKED') {
      const waitUntil = err.unblockAt?.toISOString();
      return res.status(429).json({
        error:      'Compte temporairement bloqué suite à trop de tentatives.',
        blocked_until: waitUntil,
      });
    }
    if (err.message === 'EMAIL_SEND_FAILED') {
      return res.status(503).json({ error: "L'envoi d'email a échoué. Réessayez dans quelques instants." });
    }

    console.error('[send-code] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur. Réessayez.' });
  }
});

// ================================================================
// POST /api/auth/verify-code
//
// Body JSON : { email, code }
//
// Réponse 200 : { token, user: { id, email, role, commerce_id } }
// Réponse 400 : { error, remaining_attempts? }
// Réponse 401 : { error }
// ================================================================
router.post('/verify-code', verifyCodeLimiter, async (req, res) => {
  const { email, code } = req.body;

  // --- Validation ---
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email invalide.' });
  }
  if (!code || !/^\d{6}$/.test(String(code))) {
    return res.status(400).json({ error: 'Le code doit être composé de 6 chiffres.' });
  }

  try {
    // 1. Vérifier le code et récupérer l'utilisateur authentifié
    const user = await verifyOTP(email, String(code));

    // 2. Générer le JWT de session
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Connexion réussie.',
      token,
      user: {
        id:          user.id,
        email:       user.email,
        role:        user.role,
        commerce_id: user.commerce_id,
      },
    });

  } catch (err) {
    if (err.message === 'INVALID_CODE') {
      return res.status(401).json({
        error:              'Code incorrect.',
        remaining_attempts: err.remainingAttempts ?? null,
      });
    }
    if (err.message === 'OTP_EXPIRED') {
      return res.status(401).json({
        error: 'Ce code a expiré. Demandez-en un nouveau.',
      });
    }
    if (err.message === 'NO_PENDING_OTP') {
      return res.status(401).json({
        error: 'Aucun code en attente pour cet email. Commencez par demander un code.',
      });
    }
    if (err.message === 'ACCOUNT_BLOCKED') {
      return res.status(429).json({
        error:         err.isNewBlock
          ? `Trop de tentatives. Compte bloqué pendant ${process.env.OTP_BLOCK_DURATION_MINUTES || 15} minutes.`
          : 'Compte temporairement bloqué.',
        blocked_until: err.unblockAt?.toISOString(),
      });
    }
    if (err.message === 'ACCOUNT_DISABLED') {
      return res.status(403).json({ error: 'Ce compte est désactivé.' });
    }

    console.error('[verify-code] Erreur inattendue :', err);
    return res.status(500).json({ error: 'Erreur serveur. Réessayez.' });
  }
});

// ================================================================
// GET /api/auth/me
// Route protégée : retourne le profil de l'utilisateur connecté.
// Exemple d'utilisation du middleware authenticate.
// ================================================================
router.get('/me', authenticate, (req, res) => {
  // req.user est injecté par le middleware authenticate
  return res.status(200).json({ user: req.user });
});

module.exports = router;
