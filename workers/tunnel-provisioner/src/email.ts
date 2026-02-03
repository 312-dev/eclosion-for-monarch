/**
 * Email Service
 *
 * Sends OTP verification emails via the Resend API.
 * Light-mode default with dark mode via prefers-color-scheme for supporting
 * clients (Apple Mail, iOS Mail, Outlook.com). Table-based layout with
 * padding on <td> for broad email client compatibility.
 */

/**
 * Send an OTP verification email via Resend.
 *
 * @param apiKey - Resend API key
 * @param toEmail - Recipient email address
 * @param code - 6-digit OTP code
 * @param city - City from Cloudflare request geo (optional)
 * @param country - Country from Cloudflare request geo (optional)
 */
export async function sendOtpEmail(
  apiKey: string,
  toEmail: string,
  code: string,
  city?: string,
  country?: string,
): Promise<void> {
  const locationLine =
    city && country
      ? `<p class="ec-muted" style="color: #5f5c59; font-size: 13px; margin: 0 0 24px 0;">Requested from ${escapeHtml(city)}, ${escapeHtml(country)}</p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Eclosion Verification Code</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
  <![endif]-->
  <style>
    @media (prefers-color-scheme: dark) {
      .ec-body { background-color: #1a1918 !important; }
      .ec-card { background-color: #262524 !important; }
      .ec-heading { color: #ff8050 !important; }
      .ec-text { color: #f5f5f4 !important; }
      .ec-muted { color: #a8a5a0 !important; }
      .ec-dim { color: #706e6b !important; }
      .ec-code-bg { background-color: #1f1e1d !important; }
      .ec-code { color: #f5f5f4 !important; }
      .ec-divider { border-top-color: #3d3b39 !important; }
    }
  </style>
</head>
<body class="ec-body" style="margin: 0; padding: 0; background-color: #f5f5f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ec-body" style="background-color: #f5f5f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%;">
          <tr>
            <td class="ec-card" align="center" style="background-color: #ffffff; border-radius: 12px; padding: 40px 32px;">
              <h1 class="ec-heading" style="color: #ff692d; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">Eclosion</h1>
              <p class="ec-text" style="color: #22201d; font-size: 16px; margin: 0 0 32px 0;">Remote access verification</p>
              <p class="ec-muted" style="color: #5f5c59; font-size: 14px; margin: 0 0 16px 0;">Your verification code is:</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="ec-code-bg" align="center" style="background-color: #f5f5f4; border-radius: 8px; padding: 20px 32px;">
                    <span class="ec-code" style="color: #22201d; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'SF Mono', 'Fira Code', Menlo, Consolas, monospace;">${escapeHtml(code)}</span>
                  </td>
                </tr>
              </table>
              <p class="ec-muted" style="color: #5f5c59; font-size: 13px; margin: 16px 0 8px 0;">This code expires in 10 minutes.</p>
              ${locationLine}
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="ec-divider" style="border-top: 1px solid #e8e6e3; padding-top: 24px; padding-bottom: 0;">
                    <p class="ec-dim" style="color: #888888; font-size: 12px; margin: 0;">If you didn't request this code, someone may be trying to access your Eclosion instance. No action is needed &mdash; the code will expire on its own.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Eclosion Security <security@eclosion.app>',
      to: [toEmail],
      subject: `${code} is your Eclosion verification code`,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error (${response.status}): ${error}`);
  }
}

/**
 * Mask an email address for display (e.g., "g*****@b****.com").
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.***';

  const parts = domain.split('.');
  const domainName = parts.slice(0, -1).join('.');
  const tld = parts[parts.length - 1];

  const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 1));
  const maskedDomain = domainName[0] + '*'.repeat(Math.max(1, domainName.length - 1));

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
