// ================================================================
// index.js
// Point d'entrée de l'application Express.
// ================================================================
require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

// ----------------------------------------------------------------
// VALIDATION DES VARIABLES D'ENVIRONNEMENT CRITIQUES
// Bloque le démarrage si une variable manque — mieux qu'un crash silencieux.
// ----------------------------------------------------------------
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'RESEND_API_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    console.error('   Copiez .env.example en .env et remplissez les valeurs.');
    process.exit(1);
  }
}

const app = express();

// ----------------------------------------------------------------
// SÉCURITÉ — Headers HTTP
// ----------------------------------------------------------------
app.use(helmet());

// ----------------------------------------------------------------
// CORS — Autoriser les origines définies dans .env
// ----------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (ex: curl, Postman en dev)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS : origine non autorisée → ${origin}`));
  },
  methods:     ['GET', 'POST'],
  credentials: true,
}));

// ----------------------------------------------------------------
// PARSING JSON — Limiter la taille pour éviter les attaques
// ----------------------------------------------------------------
app.use(express.json({ limit: '10kb' }));

// ----------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));

// Health check — utile pour les monitors (UptimeRobot, etc.)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route inconnue → 404 propre
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, _next) => {
  console.error('Erreur non capturée :', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// ----------------------------------------------------------------
// DÉMARRAGE
// ----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
});
