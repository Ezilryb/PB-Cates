// ================================================================
// services/emailService.js
// Envoi d'emails via Resend (forfait gratuit : 3 000 emails/mois)
// ================================================================
const { Resend } = require('resend');
const { buildOTPEmailHTML, buildOTPEmailText } = require('../templates/otpEmail');

// Initialisation du client Resend avec la clé API
const resend = new Resend(process.env.RESEND_API_KEY);

// ================================================================
// sendOTPEmail(email, code, options)
//
// Envoie le Magic Code par email.
// options.commerceName : nom du restaurant (ex. "Pizzeria Mario")
//                        → personnalise le sujet et le corps
// ================================================================
async function sendOTPEmail(email, code, options = {}) {
  const { commerceName = 'votre espace fidélité' } = options;

  const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 5;

  try {
    const result = await resend.emails.send({
      from:    process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to:      [email],
      subject: `${code} — Votre code de connexion`,
      html:    buildOTPEmailHTML({ code, commerceName, expiresMinutes }),
      text:    buildOTPEmailText({ code, commerceName, expiresMinutes }),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 Email OTP envoyé à ${email} | ID: ${result.data?.id}`);
    }

    return { success: true, messageId: result.data?.id };

  } catch (err) {
    console.error('❌ Erreur envoi email Resend :', err.message);
    throw new Error('EMAIL_SEND_FAILED');
  }
}

module.exports = { sendOTPEmail };
