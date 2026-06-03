// ================================================================
// templates/otpEmail.js
// Template email Magic Code — épuré, accessible, mobile-first.
// Design sobre pour maximiser la délivrabilité (pas d'images).
// ================================================================

// ----------------------------------------------------------------
// VERSION HTML — rendu dans les clients email modernes
// ----------------------------------------------------------------
function buildOTPEmailHTML({ code, commerceName, expiresMinutes }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre code de connexion</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- EN-TÊTE -->
          <tr>
            <td style="background:#111827;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                ✦ Carte de fidélité
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:14px;">
                ${escapeHtml(commerceName)}
              </p>
            </td>
          </tr>

          <!-- CORPS -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#374151;font-size:16px;">Bonjour,</p>
              <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
                Voici votre code de connexion pour accéder à
                <strong style="color:#111827;">${escapeHtml(commerceName)}</strong>.
                Il est valable <strong>${expiresMinutes} minutes</strong>.
              </p>

              <!-- CODE OTP -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:10px;padding:28px 0;">
                    <p style="margin:0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">
                      Votre code
                    </p>
                    <p style="margin:0;color:#111827;font-size:42px;font-weight:800;letter-spacing:10px;font-variant-numeric:tabular-nums;">
                      ${escapeHtml(code)}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#9ca3af;font-size:13px;line-height:1.5;">
                Si vous n'avez pas demandé ce code, ignorez simplement cet email.
                Votre compte reste sécurisé.
              </p>
            </td>
          </tr>

          <!-- PIED DE PAGE -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;color:#d1d5db;font-size:12px;text-align:center;">
                Ce code est à usage unique et expire dans ${expiresMinutes} minutes.
                <br>Ne le partagez jamais.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ----------------------------------------------------------------
// VERSION TEXTE BRUT — fallback pour clients sans HTML
// ----------------------------------------------------------------
function buildOTPEmailText({ code, commerceName, expiresMinutes }) {
  return `Votre code de connexion — ${commerceName}

Code : ${code}

Ce code est valable ${expiresMinutes} minutes.
Il est à usage unique — ne le partagez jamais.

Si vous n'avez pas demandé ce code, ignorez cet email.`;
}

// ----------------------------------------------------------------
// Échappement HTML basique pour éviter les injections dans le template
// ----------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { buildOTPEmailHTML, buildOTPEmailText };
