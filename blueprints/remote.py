"""
Remote Management Blueprint
/remote/* endpoints for tunnel-based remote management.

These endpoints are accessible to OTP-authenticated remote users
(protected by enforce_tunnel_auth middleware requiring session['remote_unlocked']).

Provides:
- Log file viewing (reads from STATE_DIR/logs/)
- Update status and control (via in-memory command queue to Electron)
- HTML dashboard at /remote/ for browser access
"""

import logging
import os
import re

from flask import Blueprint, Response, jsonify, make_response, request

from core import config
from core.middleware import get_update_status, queue_remote_command

logger = logging.getLogger(__name__)

remote_bp = Blueprint("remote", __name__, url_prefix="/remote")

# Allowed log file patterns — prevents path traversal
_LOG_FILENAME_RE = re.compile(r"^(debug|redacted|backend)\.log(\.\d+)?$")


def _get_log_dir() -> str:
    """Get the log directory path."""
    return str(config.STATE_DIR / "logs")


# ---- HTML Dashboard ----


@remote_bp.route("/", methods=["GET"])
def dashboard() -> Response:
    """Serve the remote management HTML dashboard."""
    response = make_response(_render_dashboard())
    response.headers["Content-Type"] = "text/html; charset=utf-8"
    # Override CSP for this standalone page
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; connect-src 'self'"
    )
    return response


def _render_dashboard() -> str:
    """Render the remote management dashboard HTML."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eclosion - Remote Management</title>
<style>
  :root { --bg: #1a1a2e; --surface: #252540; --border: #333; --text: #e0e0e0;
    --muted: #888; --accent: #ff692d; --accent-hover: #e55a1f; --success: #4caf50;
    --error: #f44336; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg);
    color: var(--text); min-height: 100vh; padding: 1rem; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { color: var(--accent); margin-bottom: 0.25rem; font-size: 1.5rem; }
  .subtitle { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.9rem; }
  .card { background: var(--surface); border: 1px solid var(--border);
    border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
  .card h2 { font-size: 1.1rem; margin-bottom: 0.75rem; display: flex;
    align-items: center; gap: 0.5rem; }
  .row { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
  select, input[type="text"] { padding: 0.4rem 0.6rem; border: 1px solid var(--border);
    border-radius: 0.25rem; background: var(--bg); color: var(--text);
    font-size: 0.85rem; }
  select { min-width: 160px; }
  input[type="text"] { flex: 1; min-width: 120px; }
  button { padding: 0.4rem 0.8rem; border: none; border-radius: 0.25rem;
    background: var(--accent); color: #fff; cursor: pointer; font-size: 0.85rem;
    white-space: nowrap; }
  button:hover { background: var(--accent-hover); }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button.secondary { background: var(--border); }
  button.secondary:hover { background: #444; }
  button.danger { background: var(--error); }
  button.danger:hover { background: #d32f2f; }
  .log-viewer { background: #111; border: 1px solid var(--border);
    border-radius: 0.25rem; padding: 0.75rem; font-family: 'SF Mono', Monaco,
    'Cascadia Code', monospace; font-size: 0.75rem; line-height: 1.4;
    max-height: 60vh; overflow: auto; white-space: pre-wrap; word-break: break-all;
    color: #ccc; margin-top: 0.5rem; }
  .status { display: inline-flex; align-items: center; gap: 0.25rem;
    font-size: 0.85rem; padding: 0.2rem 0.5rem; border-radius: 0.25rem; }
  .status.ok { background: rgba(76,175,80,0.15); color: var(--success); }
  .status.warn { background: rgba(255,105,45,0.15); color: var(--accent); }
  .status.info { background: rgba(100,100,100,0.15); color: var(--muted); }
  .meta { font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem; }
  .grid { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem;
    font-size: 0.85rem; }
  .grid dt { color: var(--muted); }
  .grid dd { color: var(--text); }
  .spinner { display: inline-block; width: 14px; height: 14px;
    border: 2px solid var(--border); border-top-color: var(--accent);
    border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tabs { display: flex; gap: 0; margin-bottom: 1rem; border-bottom: 1px solid var(--border); }
  .tab { padding: 0.5rem 1rem; cursor: pointer; color: var(--muted); border-bottom: 2px solid transparent;
    font-size: 0.9rem; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="container">
  <h1>Eclosion Remote</h1>
  <p class="subtitle">Remote management via tunnel</p>

  <div class="tabs">
    <div class="tab active" data-tab="logs" onclick="switchTab('logs')">Logs</div>
    <div class="tab" data-tab="updates" onclick="switchTab('updates')">Updates</div>
  </div>

  <!-- Logs Tab -->
  <div id="tab-logs">
    <div class="card">
      <h2>Log Viewer</h2>
      <div class="row">
        <select id="log-file" onchange="loadLog()">
          <option value="">Loading files...</option>
        </select>
        <input type="text" id="log-search" placeholder="Search..." oninput="debounceLoad()">
        <button onclick="loadLog()">Refresh</button>
        <label style="font-size:0.8rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem">
          <input type="checkbox" id="auto-refresh" onchange="toggleAutoRefresh()"> Auto
        </label>
        <label style="font-size:0.8rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem">
          <input type="checkbox" id="include-debug" onchange="loadFiles()"> Debug
        </label>
      </div>
      <div id="log-content" class="log-viewer">Select a log file to view.</div>
      <div id="log-meta" class="meta"></div>
    </div>
  </div>

  <!-- Updates Tab -->
  <div id="tab-updates" class="hidden">
    <div class="card">
      <h2>Update Management</h2>
      <div id="update-info">
        <div class="grid">
          <dt>Version</dt><dd id="u-version">—</dd>
          <dt>Channel</dt><dd id="u-channel">—</dd>
          <dt>Status</dt><dd id="u-status"><span class="status info">Loading...</span></dd>
        </div>
      </div>
      <div class="row" style="margin-top:0.75rem">
        <button id="btn-check" onclick="checkUpdate()">Check for Update</button>
        <button id="btn-install" class="danger" onclick="installUpdate()" disabled>
          Install &amp; Restart</button>
      </div>
      <div id="update-msg" class="meta"></div>
    </div>
  </div>
</div>

<script>
var autoTimer = null;
var debounceTimer = null;

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.getElementById('tab-logs').classList.toggle('hidden', name !== 'logs');
  document.getElementById('tab-updates').classList.toggle('hidden', name !== 'updates');
  if (name === 'updates') loadUpdateStatus();
}

// ---- Logs ----

function loadFiles() {
  var debug = document.getElementById('include-debug').checked;
  var url = '/remote/logs' + (debug ? '?include_debug=true' : '');
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    var sel = document.getElementById('log-file');
    var prev = sel.value;
    sel.innerHTML = '';
    if (!data.files || data.files.length === 0) {
      sel.innerHTML = '<option value="">No log files found</option>';
      return;
    }
    data.files.forEach(function(f) {
      var opt = document.createElement('option');
      opt.value = f.name;
      var kb = (f.size / 1024).toFixed(0);
      opt.textContent = f.name + ' (' + kb + ' KB)';
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
    if (!sel.value && data.files.length > 0) sel.value = data.files[0].name;
    loadLog();
  });
}

function loadLog() {
  var file = document.getElementById('log-file').value;
  if (!file) return;
  var search = document.getElementById('log-search').value;
  var url = '/remote/logs/' + encodeURIComponent(file) + '?lines=1000';
  if (search) url += '&search=' + encodeURIComponent(search);
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    if (data.error) {
      document.getElementById('log-content').textContent = 'Error: ' + data.error;
      document.getElementById('log-meta').textContent = '';
      return;
    }
    var viewer = document.getElementById('log-content');
    viewer.textContent = data.content || '(empty)';
    viewer.scrollTop = viewer.scrollHeight;
    var meta = 'Showing ' + data.displayed_lines + ' of ' + data.total_lines + ' lines';
    if (data.truncated) meta += ' (truncated)';
    document.getElementById('log-meta').textContent = meta;
  }).catch(function(e) {
    document.getElementById('log-content').textContent = 'Fetch error: ' + e.message;
  });
}

function debounceLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadLog, 300);
}

function toggleAutoRefresh() {
  if (document.getElementById('auto-refresh').checked) {
    autoTimer = setInterval(loadLog, 5000);
  } else {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

// ---- Updates ----

function loadUpdateStatus() {
  fetch('/remote/updates/status').then(function(r) { return r.json(); }).then(function(s) {
    document.getElementById('u-version').textContent = s.current_version || '—';
    document.getElementById('u-channel').textContent = s.channel || '—';
    var statusEl = document.getElementById('u-status');
    var btn = document.getElementById('btn-install');
    if (s.update_downloaded) {
      var v = (s.update_info && s.update_info.version) || 'new version';
      statusEl.innerHTML = '<span class="status warn">v' + v + ' ready to install</span>';
      btn.disabled = false;
    } else if (s.update_available) {
      var v2 = (s.update_info && s.update_info.version) || '';
      statusEl.innerHTML = '<span class="status warn">v' + v2 + ' downloading...</span>';
      btn.disabled = true;
    } else if (s.current_version) {
      statusEl.innerHTML = '<span class="status ok">Up to date</span>';
      btn.disabled = true;
    } else {
      statusEl.innerHTML = '<span class="status info">Not yet synced</span>';
      btn.disabled = true;
    }
  });
}

function checkUpdate() {
  var btn = document.getElementById('btn-check');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Checking...';
  document.getElementById('update-msg').textContent = '';
  fetch('/remote/updates/check', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      document.getElementById('update-msg').textContent =
        'Check queued. Status will update in a few seconds.';
      btn.disabled = false;
      btn.textContent = 'Check for Update';
      setTimeout(loadUpdateStatus, 6000);
    })
    .catch(function(e) {
      document.getElementById('update-msg').textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = 'Check for Update';
    });
}

function installUpdate() {
  if (!confirm('This will restart the app and disconnect remote access. Continue?')) return;
  var btn = document.getElementById('btn-install');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Installing...';
  fetch('/remote/updates/install', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      document.getElementById('update-msg').textContent =
        d.warning || 'Install queued. App will restart shortly.';
    })
    .catch(function(e) {
      document.getElementById('update-msg').textContent = 'Error: ' + e.message;
      btn.disabled = false;
      btn.textContent = 'Install & Restart';
    });
}

// Init
loadFiles();
</script>
</body>
</html>"""


# ---- JSON API Endpoints ----


@remote_bp.route("/logs", methods=["GET"])
def list_log_files() -> tuple[Response, int] | Response:
    """List available log files.

    Query params:
    - include_debug: if "true", include full debug logs (contain PII)

    By default only returns redacted logs and backend.log.
    """
    log_dir = _get_log_dir()
    include_debug = request.args.get("include_debug", "false").lower() == "true"

    files = []
    if not os.path.isdir(log_dir):
        return jsonify({"files": [], "log_dir": log_dir})

    for filename in sorted(os.listdir(log_dir)):
        if not _LOG_FILENAME_RE.match(filename):
            continue

        # Skip debug logs unless explicitly requested
        if not include_debug and filename.startswith("debug"):
            continue

        filepath = os.path.join(log_dir, filename)
        if not os.path.isfile(filepath):
            continue

        try:
            stat = os.stat(filepath)
            files.append({
                "name": filename,
                "size": stat.st_size,
                "modified": stat.st_mtime,
            })
        except OSError:
            continue

    return jsonify({"files": files, "log_dir": log_dir})


@remote_bp.route("/logs/<filename>", methods=["GET"])
def read_log_file(filename: str) -> tuple[Response, int] | Response:
    """Read a log file's contents (tail).

    Path param:
    - filename: log file name (e.g. "redacted.log", "backend.log")

    Query params:
    - lines: max lines to return (default 500)
    - search: case-insensitive search filter
    """
    # Validate filename against whitelist
    if not _LOG_FILENAME_RE.match(filename):
        return jsonify({"error": "Invalid log file name"}), 400

    log_dir = _get_log_dir()
    filepath = os.path.normpath(os.path.join(log_dir, filename))

    # Verify resolved path stays within log directory
    if not filepath.startswith(os.path.normpath(log_dir)):
        return jsonify({"error": "Access denied"}), 403

    if not os.path.isfile(filepath):
        return jsonify({"error": "File not found"}), 404

    max_lines = min(int(request.args.get("lines", "500")), 5000)
    search_term = request.args.get("search", "").lower()

    try:
        with open(filepath, encoding="utf-8", errors="replace") as f:
            all_lines = f.readlines()

        total_lines = len(all_lines)

        # Filter by search term if provided
        if search_term:
            all_lines = [line for line in all_lines if search_term in line.lower()]

        # Take last N lines
        truncated = len(all_lines) > max_lines
        if truncated:
            all_lines = all_lines[-max_lines:]

        return jsonify({
            "content": "".join(all_lines),
            "total_lines": total_lines,
            "displayed_lines": len(all_lines),
            "truncated": truncated,
        })
    except OSError as e:
        logger.error(f"[Remote] Failed to read log file {filename}: {e}")
        return jsonify({"error": "Failed to read file"}), 500


@remote_bp.route("/updates/status", methods=["GET"])
def update_status() -> tuple[Response, int] | Response:
    """Get current update status (cached from Electron)."""
    status = get_update_status()
    if status.get("current_version") is None:
        return jsonify({
            **status,
            "note": "Update status not yet received from desktop app",
        })
    return jsonify(status)


@remote_bp.route("/updates/check", methods=["POST"])
def check_for_update() -> tuple[Response, int] | Response:
    """Queue a check-for-update command for the desktop app."""
    cmd = queue_remote_command("check_update")
    logger.info(f"[Remote] Update check queued: {cmd['id']}")
    return jsonify({"queued": True, "command": cmd})


@remote_bp.route("/updates/install", methods=["POST"])
def install_update() -> tuple[Response, int] | Response:
    """Queue an install-update command for the desktop app.

    Only allowed when an update has been downloaded.
    Warning: this will restart the app and disconnect remote access.
    """
    status = get_update_status()
    if not status.get("update_downloaded"):
        return jsonify({
            "error": "No update downloaded. Check for updates first.",
            "update_available": status.get("update_available", False),
            "update_downloaded": False,
        }), 400

    cmd = queue_remote_command("install_update")
    logger.info(f"[Remote] Update install queued: {cmd['id']}")
    return jsonify({
        "queued": True,
        "command": cmd,
        "warning": "This will restart the app. Remote access will be temporarily unavailable.",
    })
