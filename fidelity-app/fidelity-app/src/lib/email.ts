import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "noreply@example.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FidélitéApp";

export async function sendOTPEmail(
  email: string,
  code: string,
  restaurantName?: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${code} — Votre code de connexion`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code de connexion</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;">
    <tr>
      <td style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:linear-gradient(135deg,#ea580c,#f97316);padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🎟️</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${restaurantName ?? APP_NAME}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Carte de fidélité numérique</p>
            </td>
          </tr>
        </table>
        
        <!-- Body -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;">Votre code de connexion</p>
              <div style="background:#f9fafb;border:2px dashed #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin:16px 0;">
                <span style="font-size:48px;font-weight:700;letter-spacing:12px;color:#111827;font-family:monospace;">${code}</span>
              </div>
              <p style="margin:16px 0 0;color:#6b7280;font-size:14px;text-align:center;">
                ⏱️ Ce code est valable <strong>10 minutes</strong>
              </p>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Si vous n'avez pas demandé ce code, ignorez cet email.<br>
                Aucun mot de passe ne vous sera jamais demandé.
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }
}
