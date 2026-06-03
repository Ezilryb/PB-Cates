// ================================================================
// middleware/authenticate.js
// Middleware Express : vérifie le JWT sur les routes protégées.
// ================================================================
const { verifyToken } = require('../services/jwtService');

// ================================================================
// authenticate
// Usage : router.get('/protected', authenticate, handler)
// ================================================================
function authenticate(req, res, next) {
  // Extraire le token du header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou mal formé' });
  }

  const token = authHeader.slice(7); // Supprimer "Bearer "

  try {
    const decoded = verifyToken(token);
    // Injecter l'utilisateur décodé dans req pour les routes suivantes
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// ================================================================
// requireRole(...roles)
// Usage : router.get('/dashboard', authenticate, requireRole('manager'), handler)
// ================================================================
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Accès réservé aux rôles : ${roles.join(', ')}`
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
