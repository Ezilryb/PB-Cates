// ================================================================
// services/jwtService.js
// Génération et vérification des tokens de session JWT.
// ================================================================
const jwt = require('jsonwebtoken');

// ================================================================
// generateToken(user)
//
// Génère un JWT signé contenant les claims nécessaires.
// Le payload est minimaliste pour réduire la taille du token
// et ne contient aucune donnée sensible.
// ================================================================
function generateToken(user) {
  const payload = {
    sub:         user.id,           // "subject" = identifiant unique
    email:       user.email,
    role:        user.role,
    // commerce_id est dans le payload pour les policies RLS Supabase
    // (auth.jwt() ->> 'commerce_id')
    commerce_id: user.commerce_id || null,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer:    'fidelite-platform',
    audience:  'fidelite-app',
  });
}

// ================================================================
// verifyToken(token)
// Retourne le payload décodé ou lève une erreur JWT standard.
// ================================================================
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer:   'fidelite-platform',
    audience: 'fidelite-app',
  });
}

module.exports = { generateToken, verifyToken };
