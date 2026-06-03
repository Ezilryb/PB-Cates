// ================================================================
// config/database.js
// Pool de connexions PostgreSQL (Supabase)
// ================================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL obligatoire pour Supabase en production
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  // Optimisation Free Tier Supabase : limiter les connexions simultanées
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test de connexion au démarrage
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✅ Connexion PostgreSQL établie');
  }
});

pool.on('error', (err) => {
  console.error('❌ Erreur pool PostgreSQL :', err.message);
});

module.exports = pool;
