/**
 * Offline Page
 *
 * Shown when a claimed tunnel subdomain is not currently connected.
 * Uses the same theming as the OTP page.
 */

export function generateOfflinePage(subdomain: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light dark">
<title>Eclosion - Offline</title>
<link rel="icon" type="image/svg+xml" href="https://eclosion.app/icons/icon-192.svg">
<style>
:root{--bg-page:#f5f5f4;--bg-card:#ffffff;--border:#e8e6e3;--text:#22201d;--text-muted:#5f5c59;--primary:#ff692d;--shadow:0 8px 32px rgba(0,0,0,.08)}
@media(prefers-color-scheme:dark){:root{--bg-page:#1a1918;--bg-card:#262524;--border:#3d3b39;--text:#f5f5f4;--text-muted:#a8a5a0;--primary:#ff8050;--shadow:0 8px 32px rgba(0,0,0,.3)}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-page);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:var(--bg-card);border-radius:12px;padding:40px;max-width:400px;width:100%;box-shadow:var(--shadow);border:1px solid var(--border);text-align:center}
.icon{width:64px;height:64px;background:var(--text-muted);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;opacity:.6}
h1{color:var(--primary);font-size:24px;font-weight:700;margin-bottom:4px}
.sub{color:var(--text-muted);margin-bottom:24px;font-size:15px}
.detail{color:var(--text-muted);font-size:14px;line-height:1.5;margin-bottom:24px}
.subdomain{color:var(--text);font-weight:600}
.retry{display:inline-block;padding:12px 24px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .15s}
.retry:hover{opacity:.85}
</style>
</head>
<body>
<div class="card">
<div class="icon">
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
</div>
<h1>Eclosion</h1>
<p class="sub">Tunnel Offline</p>
<p class="detail">
<span class="subdomain">${subdomain}.eclosion.me</span> is currently unreachable.<br>
The desktop app may be closed or disconnected.
</p>
<a class="retry" href="javascript:location.reload()">Retry</a>
</div>
</body>
</html>`;
}
