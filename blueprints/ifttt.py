"""
IFTTT Blueprint
/ifttt/* endpoints for IFTTT service integration.

Handles:
- Action execution (proxied from IFTTT worker)
- Dynamic field options for IFTTT action fields
- Queue management for offline action catch-up
"""

import logging
from typing import Any

from flask import Blueprint, make_response, request

from blueprints import get_services
from core import api_handler, sanitize_id
from core.exceptions import ValidationError
from core.middleware import sanitize_api_result

logger = logging.getLogger(__name__)

ifttt_bp = Blueprint("ifttt", __name__, url_prefix="/ifttt")


# ---- HEALTH CHECK ----
# Simple ping endpoint to verify tunnel connectivity.


@ifttt_bp.route("/ping", methods=["GET", "POST"])
def ifttt_ping() -> dict:
    """Health check for IFTTT tunnel connectivity testing."""
    return sanitize_api_result(
        {"success": True, "pong": True, "timestamp": __import__("time").time()}
    )


# ---- ACTION ENDPOINTS ----
# Called by the IFTTT worker when proxying actions to this instance.
# Authenticated via X-IFTTT-Action-Secret header (checked in middleware).


def _parse_category_or_group_id(value: str) -> tuple[str, str]:
    """
    Parse a prefixed ID into (type, id) tuple.

    Supports:
    - "group:<uuid>" -> ("group", "<uuid>")
    - "cat:<uuid>" -> ("category", "<uuid>")

    Raises ValidationError if prefix is missing or invalid.
    """
    if value.startswith("group:"):
        return ("group", value[6:])
    elif value.startswith("cat:"):
        return ("category", value[4:])
    else:
        raise ValidationError(
            f"Invalid ID format: expected 'cat:' or 'group:' prefix, got '{value}'"
        )


@ifttt_bp.route("/actions/budget-to", methods=["POST"])
@api_handler(handle_mfa=True)
async def budget_to():
    """
    Add funds to a Monarch budget category or group.

    Request body:
    - category_id: Prefixed ID (cat:<uuid> or group:<uuid>) or raw category ID
    - amount: Dollar amount to add to the current budget
    """
    services = get_services()
    data = request.get_json()

    raw_id = data.get("category_id")
    amount = data.get("amount")

    if not raw_id:
        raise ValidationError("Missing 'category_id'")
    if amount is None or float(amount) <= 0:
        raise ValidationError("'amount' must be a positive number")

    id_type, entity_id = _parse_category_or_group_id(raw_id)
    # Sanitize the extracted ID (without prefix)
    sanitized_id = sanitize_id(entity_id)
    if not sanitized_id:
        raise ValidationError("Invalid 'category_id' format")
    entity_id = sanitized_id
    cm = services.sync_service.category_manager

    if id_type == "group":
        result = await cm.allocate_to_group(entity_id, float(amount))
    else:
        result = await cm.allocate_to_category(entity_id, float(amount))

    return sanitize_api_result(result, "Failed to allocate budget.")


@ifttt_bp.route("/actions/budget-to-goal", methods=["POST"])
@api_handler(handle_mfa=True)
async def budget_to_goal():
    """
    Add funds to a goal item's category budget.

    Request body:
    - goal_id: Goal item ID
    - amount: Dollar amount to set as budget
    """
    from services.stash_service import StashService

    data = request.get_json()

    goal_id = sanitize_id(data.get("goal_id"))
    amount = data.get("amount")

    if not goal_id:
        raise ValidationError("Missing 'goal_id'")
    if amount is None or int(float(amount)) <= 0:
        raise ValidationError("'amount' must be a positive number")

    service = StashService()
    result = await service.allocate_funds(goal_id, int(float(amount)))
    return sanitize_api_result(result, "Failed to allocate to goal.")


@ifttt_bp.route("/actions/move-funds", methods=["POST"])
@api_handler(handle_mfa=True)
async def move_funds():
    """
    Move funds between two budget categories or groups.

    Request body:
    - source_category_id: Prefixed ID (cat:<uuid> or group:<uuid>) or raw category ID
    - destination_category_id: Prefixed ID (cat:<uuid> or group:<uuid>) or raw category ID
    - amount: Dollar amount to move
    """
    services = get_services()
    data = request.get_json()

    raw_source_id = data.get("source_category_id")
    raw_dest_id = data.get("destination_category_id")
    amount = data.get("amount")

    if not raw_source_id:
        raise ValidationError("Missing 'source_category_id'")
    if not raw_dest_id:
        raise ValidationError("Missing 'destination_category_id'")
    if raw_source_id == raw_dest_id:
        raise ValidationError("Source and destination must be different")
    if amount is None or float(amount) <= 0:
        raise ValidationError("'amount' must be a positive number")

    source_type, source_id = _parse_category_or_group_id(raw_source_id)
    dest_type, dest_id = _parse_category_or_group_id(raw_dest_id)

    # Sanitize the extracted IDs (without prefix)
    sanitized_source = sanitize_id(source_id)
    sanitized_dest = sanitize_id(dest_id)
    if not sanitized_source:
        raise ValidationError("Invalid 'source_category_id' format")
    if not sanitized_dest:
        raise ValidationError("Invalid 'destination_category_id' format")
    source_id = sanitized_source
    dest_id = sanitized_dest

    cm = services.sync_service.category_manager

    # Use mixed method to handle any combination of categories/groups
    result = await cm.move_funds_mixed(source_id, source_type, dest_id, dest_type, float(amount))
    return sanitize_api_result(result, "Failed to move funds.")


# ---- QUERY ENDPOINTS ----
# Called by the IFTTT worker to serve live budget data for queries.
# Authenticated via X-IFTTT-Action-Secret header (checked in middleware).


@ifttt_bp.route("/queries/category-budgets", methods=["POST"])
@api_handler(handle_mfa=True)
async def query_category_budgets():
    """
    Return budget status for all categories.
    Used by the list_category_budgets IFTTT query.
    """
    services = get_services()
    cm = services.sync_service.category_manager

    budget_data = await cm.get_all_category_budget_data()
    category_info = await cm.get_all_category_info()

    data = []
    for cat_id, budget in budget_data.items():
        info = category_info.get(cat_id, {})
        budgeted = budget.get("budgeted", 0)
        actual = abs(budget.get("actual", 0))

        if budgeted > 0 and actual < budgeted:
            status = "under_budget"
        elif budgeted > 0 and actual > budgeted:
            status = "over_budget"
        else:
            status = "on_track"

        data.append(
            {
                "category_name": info.get("name", "Unknown"),
                "group_name": info.get("group_name", ""),
                "budget_amount": str(int(budgeted)),
                "actual_spending": str(int(actual)),
                "remaining": str(int(budget.get("remaining", 0))),
                "rollover": str(int(budget.get("rollover", 0))),
                "status": status,
            }
        )

    # Sort by group then category name
    data.sort(key=lambda x: (x["group_name"], x["category_name"]))

    # Handle pagination
    req_data = request.get_json() or {}
    limit = req_data.get("limit", 50)
    cursor = req_data.get("cursor")

    start_idx = 0
    if cursor and cursor.startswith("offset-"):
        try:
            start_idx = int(cursor.split("-")[1])
        except (ValueError, IndexError):
            raise ValidationError("Invalid cursor format")

    page = data[start_idx : start_idx + limit]
    result: dict = {"data": page}

    if start_idx + limit < len(data):
        result["cursor"] = f"offset-{start_idx + limit}"

    return result


@ifttt_bp.route("/queries/under-budget-categories", methods=["POST"])
@api_handler(handle_mfa=True)
async def query_under_budget_categories():
    """
    Return categories where spending is below budget.
    Used by the list_under_budget_categories IFTTT query.
    """
    services = get_services()
    cm = services.sync_service.category_manager

    budget_data = await cm.get_all_category_budget_data()
    category_info = await cm.get_all_category_info()

    data = []
    for cat_id, budget in budget_data.items():
        info = category_info.get(cat_id, {})
        budgeted = budget.get("budgeted", 0)
        actual = abs(budget.get("actual", 0))

        if budgeted > 0 and actual < budgeted:
            amount_saved = int(budgeted - actual)
            percent_saved = int((amount_saved / budgeted) * 100) if budgeted else 0
            data.append(
                {
                    "category_name": info.get("name", "Unknown"),
                    "budget_amount": str(int(budgeted)),
                    "actual_spending": str(int(actual)),
                    "amount_saved": str(amount_saved),
                    "percent_saved": str(percent_saved),
                }
            )

    # Sort by amount saved descending
    data.sort(key=lambda x: int(x["amount_saved"]), reverse=True)

    req_data = request.get_json() or {}
    limit = req_data.get("limit", 50)
    cursor = req_data.get("cursor")

    start_idx = 0
    if cursor and cursor.startswith("offset-"):
        try:
            start_idx = int(cursor.split("-")[1])
        except (ValueError, IndexError):
            raise ValidationError("Invalid cursor format")

    page = data[start_idx : start_idx + limit]
    result: dict = {"data": page}

    if start_idx + limit < len(data):
        result["cursor"] = f"offset-{start_idx + limit}"

    return result


@ifttt_bp.route("/queries/budget-summary", methods=["POST"])
@api_handler(handle_mfa=True)
async def query_budget_summary():
    """
    Return monthly budget summary.
    Used by the budget_summary IFTTT query.
    """
    from datetime import datetime

    services = get_services()
    cm = services.sync_service.category_manager

    summary = await cm.get_ready_to_assign()
    month_name = datetime.now().strftime("%B %Y")

    planned_expenses = abs(summary.get("planned_expenses", 0))
    actual_expenses = abs(summary.get("actual_expenses", 0))
    surplus = int(planned_expenses - actual_expenses) if planned_expenses > actual_expenses else 0

    return {
        "data": [
            {
                "month": month_name,
                "planned_income": str(int(summary.get("planned_income", 0))),
                "actual_income": str(int(summary.get("actual_income", 0))),
                "planned_expenses": str(int(planned_expenses)),
                "actual_expenses": str(int(actual_expenses)),
                "surplus": str(surplus),
                "ready_to_assign": str(int(summary.get("ready_to_assign", 0))),
            }
        ],
    }


# ---- IFTTT OAUTH APPROVAL PAGE ----
# Served through the user's tunnel after OTP verification.
# The user sees this page to approve/deny the IFTTT connection.


@ifttt_bp.route("/authorize", methods=["GET"])
def ifttt_authorize_page():
    """
    Render the IFTTT OAuth approval page.

    Accessed via the user's tunnel after OTP verification (tunnel-gate handles OTP).
    The link_token query param ties this back to the OAuth flow on the IFTTT worker.
    User clicks Approve → form POSTs to ifttt-api.eclosion.app/oauth/approve.
    """
    link_token = request.args.get("link_token", "")
    if not link_token:
        return "Missing link_token parameter", 400

    response = make_response(_render_approval_page(link_token))
    # Override CSP for this page: needs to POST to ifttt-api.eclosion.app
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "script-src 'unsafe-inline'; "
        "style-src 'unsafe-inline'; "
        "connect-src https://ifttt-api.eclosion.app; "
        "frame-ancestors 'none'"
    )
    return response


def _render_approval_page(link_token: str) -> str:
    """Render a self-contained HTML approval page."""
    import json

    from markupsafe import escape

    # Use json.dumps for JS string literal (handles escaping properly)
    # escape() for any HTML context, json.dumps() for JS context
    safe_token = escape(link_token)
    js_token = json.dumps(str(safe_token))
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light dark">
<title>Eclosion - Authorize IFTTT</title>
<style>
:root{{--bg-page:#f5f5f4;--bg-card:#ffffff;--border:#e8e6e3;--text:#22201d;--text-muted:#5f5c59;--primary:#ff692d;--primary-hover:#eb5519;--success:#22a06b;--success-bg:rgba(34,160,107,.1);--error:#dc2626;--error-bg:rgba(220,38,38,.1);--shadow:0 8px 32px rgba(0,0,0,.08)}}
@media(prefers-color-scheme:dark){{:root{{--bg-page:#1a1918;--bg-card:#262524;--border:#3d3b39;--text:#f5f5f4;--text-muted:#a8a5a0;--primary:#ff8050;--primary-hover:#ff6a30;--success:#34d399;--success-bg:rgba(34,211,153,.15);--error:#f87171;--error-bg:rgba(248,113,113,.15);--shadow:0 8px 32px rgba(0,0,0,.3)}}}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:var(--bg-page);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}}
.card{{background:var(--bg-card);border-radius:12px;padding:40px;max-width:420px;width:100%;box-shadow:var(--shadow);border:1px solid var(--border)}}
.logos{{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:24px}}
.logo-icon{{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center}}
.logo-eclosion{{background:var(--primary)}}
.logo-ifttt{{background:#000}}
.connect-arrow{{color:var(--text-muted);font-size:24px}}
h1{{font-size:20px;font-weight:700;text-align:center;margin-bottom:8px}}
.desc{{color:var(--text-muted);text-align:center;margin-bottom:24px;font-size:14px;line-height:1.5}}
.permissions{{margin-bottom:24px;padding:16px;border-radius:8px;border:1px solid var(--border)}}
.permissions h2{{font-size:14px;font-weight:600;margin-bottom:12px}}
.perm-item{{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-muted);margin-bottom:8px}}
.perm-item:last-child{{margin-bottom:0}}
.perm-icon{{color:var(--primary);flex-shrink:0}}
.btn{{width:100%;padding:14px;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}}
.btn-approve{{background:var(--primary);color:#fff;margin-bottom:10px}}
.btn-approve:hover{{background:var(--primary-hover)}}
.btn-deny{{background:transparent;color:var(--text-muted);border:1px solid var(--border)}}
.btn-deny:hover{{background:var(--bg-page)}}
.btn:disabled{{opacity:.5;cursor:not-allowed}}
.error-msg{{color:var(--error);background:var(--error-bg);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;display:none}}
.result-view{{display:none;text-align:center}}
.result-icon{{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}}
.result-icon.success{{background:var(--success-bg)}}
.result-icon.error{{background:var(--error-bg)}}
.result-title{{font-size:18px;font-weight:700;margin-bottom:8px}}
.result-desc{{color:var(--text-muted);font-size:14px}}
</style>
</head>
<body>
<div class="card">
  <div id="approval-view">
    <div class="logos">
      <div class="logo-icon logo-eclosion">
        <svg width="32" height="32" viewBox="22 8 58 88" fill="none"><g fill="#fff"><path d="M32.527 56.156c.8.438 1.426 1.012 2.07 1.645.063.058.133.117.196.18 2.328 2.187 4.109 5.675 5.004 8.702.128.399.292.774.457 1.16.312.778.574 1.567.843 2.356.196-.36.293-.719.383-1.117a48.947 48.947 0 0 0 .39-1.863c1.208-6.254 1.208-6.254 3.04-7.704.273-.168.476-.222.789-.214.344.078.469.164.695.43.106.269.106.269.043.538-.137.23-.137.23-.437.43-.082.016-.16.023-.25.035-.434.113-.551.45-.766.813-.75 1.437-1.125 2.984-1.484 4.55.39-.597.39-.597.668-1.253.187-.485.437-.895.718-1.325q.06-.098.125-.191c.344-.504.703-.938 1.301-1.129.285 0 .285 0 .528.11.16.19.16.19.218.472-.086.473-.36.738-.71 1.059-.176.187-.286.379-.41.61-.052.085-.099.175-.153.269l-.156.285-.16.304c-.942 1.758-1.672 3.618-2.372 5.493a17.6 17.6 0 0 0 2.235-2.211c.215-.242.437-.465.668-.688q.117-.128.246-.25a9 9 0 0 1 1.453-1.25q.247-.253.5-.5.248-.21.508-.422c.293-.234.59-.476.875-.726.718-.613 1.464-1.133 2.25-1.645q.326-.21.64-.433c.953-.633 1.961-1.082 3.028-1.477.09-.031.175-.062.27-.101.694-.235 1.398-.27 2.132-.297l.242-.016c.727-.02 1.184.18 1.711.656.305.325.336.59.367 1.028-.07 2.015-1.207 3.578-2.43 5.093-.226.278-.445.559-.667.844-.266.34-.532.676-.801 1.016a10.7 10.7 0 0 0-1.43 2.496A7.5 7.5 0 0 1 54 73.5l-.286.441c-.84 1.25-1.914 2.621-3.312 3.258h-.203q.005.083.015.164c.098 2.149-1.09 3.934-2.464 5.477-.856.922-2.38 1.8-3.657 1.879a3 3 0 0 1-.191-.02c-.336 1.281-.336 1.281-.156 2.555.175.512.187.996.191 1.527 0 .125 0 .125.004.25-.004.574-.113.902-.492 1.344-.375.312-.875.277-1.34.27-.52-.079-.797-.336-1.11-.743-.535-.765-.613-1.836-.456-2.734.18-.844.457-1.606.859-2.367-.102.011-.2.027-.305.043-.46.004-.703-.254-1.03-.563-.567-.61-.599-1.39-.63-2.183-.004-.079-.004-.157-.012-.235-.007-.187-.02-.375-.023-.562-.117.047-.117.047-.227.101-.39.14-.687.117-1.078 0-.347-.277-.507-.469-.597-.902-.047.05-.098.098-.145.156-1.027 1.063-2.062 2.05-3.273 2.91-.125.094-.254.184-.38.278-.48.355-.48.355-.702.355v.203c-.89.68-1.797.723-2.875.63-.504-.067-.903-.266-1.324-.532-.133-.078-.133-.078-.27-.152a24 24 0 0 1-1.332-.848v.176c-.047 1.023-.45 1.836-1.2 2.53-.609.524-1.124.759-1.925.735-.516-.078-.875-.312-1.21-.703-.333-.504-.333-.973-.227-1.539.203-.7.765-1.168 1.378-1.527l.204-.11c.59-.347.843-.957 1.12-1.562.157-.762.126-1.317-.288-1.985-.196-.28-.399-.55-.61-.828-.437-.578-.613-1.066-.64-1.785q-.013-.11-.02-.226c-.043-.801.23-1.477.73-2.094.41-.438.895-.754 1.391-1.082.07-.059.14-.113.219-.172.18-.129.18-.129.379-.129.152-.336.199-.523.199-.898-.164-.254-.164-.254-.375-.516a5.3 5.3 0 0 1-.824-1.586c-.035-.094-.067-.195-.106-.293-.617-1.762-.785-3.668-.004-5.41.137-.277.282-.555.422-.824.575-1.106.645-1.875.285-3.075-.421-1.492-.472-2.875.141-4.32 1.305-2.203 4.434-1.008 6.29-.12z"/><path d="M71.301 36.043c.07 0 .14-.008.215-.008.379 0 .629.063.922.297.488.496.675 1.043.683 1.727a6.3 6.3 0 0 1-.183 1.347c-.254 1.13-.235 1.875.281 2.934.45.984.45 2.21.078 3.227-.047.117-.047.117-.098.234q-.057.14-.109.281c-.234.547-.48.985-.89 1.418.14.442.32.63.687.903.476.347.906.734 1.113 1.296.121 1.055-.074 1.696-.719 2.508-.28.367-.394.617-.378 1.094.16.773.523 1.168 1.164 1.61.32.257.496.511.578.913.008.422-.024.645-.238 1.02-.387.324-.7.473-1.207.457-.637-.242-1.165-.742-1.481-1.336-.125-.383-.14-.672-.121-1.062l-.164.117c-.887.617-1.715.996-2.828.84-.633-.184-1.149-.688-1.633-1.11a11 11 0 0 0-.68-.527 6.3 6.3 0 0 1-.945-.941 6 6 0 0 0-.445-.481c-.024.059-.04.121-.059.188-.144.21-.144.21-.488.343-.356.07-.356.07-.656-.031-.012.094-.024.195-.04.293-.02.188-.02.188-.046.379l-.051.383c-.067.379-.113.633-.426.867-.516.277-.516.277-.734.277q.036.136.086.278c.32 1.039.5 1.898.011 2.921-.207.305-.207.305-.5.5-.488.094-.87.07-1.308-.167-.274-.333-.297-.606-.285-1.032l.03-.312c.01-.105.016-.207.028-.313.035-.277.035-.277.133-.574.012-.187.016-.367.016-.55v-.294c-.004-.27-.004-.27-.114-.554-.215-.094-.215-.094-.472-.164-1.461-.504-2.32-1.41-2.993-2.77-.332-.766-.453-1.433-.437-2.27q-.129-.033-.27-.074c-1.503-.574-2.449-2.808-3.097-4.187a9 9 0 0 0-1.149-1.848c-.726-.918-1.343-1.855-1.68-2.992-.054-.145-.054-.145-.1-.297-.04-.52 0-.863.296-1.3.75-.454 1.539-.403 2.375-.22.969.297 1.777.77 2.625 1.317l.293.168c.105.066.105.066.207.137v.195c.059.027.121.059.18.086.836.441 1.554 1.148 2.222 1.816.16.145.325.285.489.434.699.625 1.265 1.328 1.84 2.066.156.207.156.207.37.301-.234-.726-.5-1.441-.789-2.148q-.06-.165-.125-.328c-.414-1.11-.414-1.11-1.125-2.04-.16-.187-.16-.187-.132-.562l.07-.32c.383-.047.547-.043.851.191.52.637.875 1.234 1.149 2.004-.3-1.57-.3-1.57-1-3-.195-.102-.395-.207-.598-.297-.105-.25-.105-.25-.097-.5.101-.18.101-.18.296-.3.301-.063.5-.051.774.09 1.46 1.07 1.7 3.753 1.96 5.413q.037.253.079.5l.187 1.196c.07-.18.07-.18.145-.36.215-.547.437-1.094.656-1.64q.054-.136.11-.278c.48-1.168.984-2.27 1.691-3.324.039-.062.078-.117.121-.187 1.156-1.711 2.531-3.211 4.598-3.743.43-.074.844-.117 1.281-.125zm-10 9.86.102.195z"/><path d="M54.5 11.598c1.3.414 2.371 1.36 3.004 2.547 1.414 2.746 1.469 5.734 1.496 8.758.05-.094.105-.184.156-.278.375-.656.746-1.308 1.145-1.941q.066-.105.125-.203.55-.866 1.172-1.68l.125-.176c.359-.48.843-.859 1.375-1.125.328-.047.48-.004.804.098.196.305.196.305.188.512-.09.191-.09.191-.266.265a5 5 0 0 0-.23.051c-.969.29-1.567 1.262-2.094 2.074l-.098.301q.084-.122.18-.25c.43-.52 1.043-1.031 1.687-1.238.231-.012.231-.012.461.183q.084.099.172.204c-.125.39-.355.5-.703.68-.586.35-1.043.855-1.48 1.37-.371.422-.762.828-1.145 1.239a5 5 0 0 0-.183.195q-.078.08-.16.172c-.141.144-.141.144-.231.344l.285-.168A28 28 0 0 1 63.402 22q.152-.068.317-.136c.718-.29 1.453-.516 2.191-.735.102-.031.203-.054.305-.086 1.562-.453 3.363-.812 4.883-.043.324.22.449.457.523.832.02.543-.187.856-.523 1.266-.063.086-.13.168-.192.25-.531.633-1.097 1.031-1.808 1.453-.899.563-1.727 1.156-2.5 1.899-2.223 2.117-2.223 2.117-3.504 2.125L62.8 28.8c-.02.094-.04.195-.055.293-.289.984-1.262 1.84-2.102 2.363-.644.344-1.265.532-2 .555-.738-.012-.738-.012-1.32.367-.164.422-.203.875-.265 1.32-.102.52-.282 1.024-.657 1.399-.531.047-.875.055-1.304-.297-.301-.5-.266-1.05-.16-1.61.199-.628.64-1.101 1.062-1.593q-.117-.14-.246-.285c-.305-.364-.38-.594-.38-1.082.044-.399.185-.762.325-1.133-.074.012-.148.016-.226.027-.274-.027-.274-.027-.5-.199-.172-.223-.22-.352-.274-.625-.094.047-.195.102-.297.152a15 15 0 0 1-2.773 1.082c-.813.227-1.473.18-2.227-.234a9 9 0 0 1-.703-.703 10 10 0 0 0-.293-.29c-.066-.07-.137-.136-.207-.21q-.042.092-.078.183c-.297.547-.84.887-1.422 1.075-.32.07-.574.086-.898.047-.336-.211-.594-.415-.703-.805.015-.422.054-.695.234-1.07.355-.305.726-.383 1.168-.516.484-.18.84-.465 1.121-.899.102-.273.082-.484.047-.773-.012-.148-.012-.148-.027-.293-.028-.246-.028-.246-.141-.45-.066-.741-.059-1.382.402-2 .383-.405.75-.57 1.27-.726a8 8 0 0 0 .926-.37c-.016-.052-.024-.11-.04-.169-.312-1.285-.375-2.941.305-4.117.25-.367.5-.727.836-1.016h.203q.038-.086.086-.18c.094-.187.203-.366.313-.546.203-.406.257-.813.297-1.258.093-.93.261-1.7 1-2.312.074-.079.152-.157.226-.243.41-.238.723-.175 1.176-.062z"/></g></svg>
      </div>
      <span class="connect-arrow">&#8596;</span>
      <div class="logo-icon logo-ifttt">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M0 8.82h2.024v6.36H0zm11.566 0h-3.47v2.024h1.446v4.337h2.024v-4.337h1.446V8.82zm5.494 0h-3.47v2.024h1.446v4.337h2.024v-4.337h1.446V8.82zm5.494 0h-3.47v2.024h1.446v4.337h2.024v-4.337H24V8.82zM7.518 10.843V8.82H2.892v6.36h2.024v-1.734H6.65v-2.024H4.916v-.578z"/></svg>
      </div>
    </div>

    <h1>Authorize IFTTT</h1>
    <p class="desc">IFTTT is requesting access to your Eclosion instance.</p>

    <div id="error" class="error-msg"></div>

    <div class="permissions">
      <h2>IFTTT will be able to:</h2>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Budget funds to categories
      </div>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Budget funds to stashes
      </div>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Move funds between budget categories
      </div>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Read your category and stash names
      </div>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Read your budget status and balances
      </div>
      <div class="perm-item">
        <svg class="perm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Read your recent transactions
      </div>
    </div>

    <button id="approve-btn" class="btn btn-approve" type="button">Authorize</button>
    <button id="deny-btn" class="btn btn-deny" type="button">Deny</button>
  </div>

  <div id="result-view" class="result-view">
    <div id="result-icon" class="result-icon"></div>
    <div id="result-title" class="result-title"></div>
    <div id="result-desc" class="result-desc"></div>
  </div>
</div>

<script>
(function(){{
  var linkToken = {js_token};
  var approveBtn = document.getElementById('approve-btn');
  var denyBtn = document.getElementById('deny-btn');
  var errorEl = document.getElementById('error');
  var approvalView = document.getElementById('approval-view');
  var resultView = document.getElementById('result-view');

  function showError(msg) {{
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }}

  function showResult(icon, title, desc) {{
    approvalView.style.display = 'none';
    resultView.style.display = 'block';
    document.getElementById('result-icon').className = 'result-icon ' + icon;
    document.getElementById('result-icon').innerHTML = icon === 'success'
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-desc').textContent = desc;
  }}

  async function submitApproval(approved) {{
    approveBtn.disabled = true;
    denyBtn.disabled = true;
    errorEl.style.display = 'none';

    if (approved) {{
      approveBtn.textContent = 'Authorizing...';
    }}

    try {{
      var resp = await fetch('https://ifttt-api.eclosion.app/oauth/approve', {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ link_token: linkToken, approved: approved }})
      }});

      var data = await resp.json();

      if (!resp.ok) {{
        showError(data.error || 'Something went wrong. Please try again.');
        approveBtn.disabled = false;
        denyBtn.disabled = false;
        approveBtn.textContent = 'Authorize';
        return;
      }}

      if (approved && data.redirect_url) {{
        showResult('success', 'Connected!', 'Redirecting to IFTTT...');
        setTimeout(function() {{ window.location.href = data.redirect_url; }}, 1500);
      }} else {{
        showResult('error', 'Connection denied', 'You can close this window.');
      }}
    }} catch (err) {{
      showError('Network error. Please try again.');
      approveBtn.disabled = false;
      denyBtn.disabled = false;
      approveBtn.textContent = 'Authorize';
    }}
  }}

  approveBtn.addEventListener('click', function() {{ submitApproval(true); }});
  denyBtn.addEventListener('click', function() {{ submitApproval(false); }});
}})();
</script>
</body>
</html>"""


# ---- FIELD OPTION ENDPOINTS ----
# Called by the IFTTT worker to populate dynamic dropdowns.
# Returns data in IFTTT field options format: { data: [{ label, value }] }


def _decode_icon(icon: str | None) -> str:
    """Decode HTML entities in icon field to actual Unicode characters."""
    import html

    if not icon:
        return ""
    # Monarch stores emojis as HTML entities (e.g., &#128176; for 💰)
    return html.unescape(icon)


def _format_category_label(name: str, icon: str | None) -> str:
    """Format a category label with optional icon prefix."""
    decoded_icon = _decode_icon(icon)
    if decoded_icon:
        return f"{decoded_icon} {name}"
    return name


@ifttt_bp.route("/field-options/category", methods=["POST"])
@api_handler(handle_mfa=True)
async def field_options_category():
    """
    Return Monarch categories and flexible groups as IFTTT field options.

    For groups with group_level_budgeting_enabled=True (flexible groups),
    the GROUP is listed instead of its individual categories.
    For regular groups, individual categories are listed.

    Values are prefixed: "cat:<uuid>" for categories, "group:<uuid>" for groups.
    """
    services = get_services()
    cm = services.sync_service.category_manager

    # Get detailed group info to check group_level_budgeting_enabled
    detailed_groups = await cm.get_category_groups_detailed()
    group_level_enabled = {
        g["id"]: g.get("group_level_budgeting_enabled", False) for g in detailed_groups
    }

    # Get categories grouped
    groups = await cm.get_all_categories_grouped()

    options = []
    flexible_groups = []  # Collect flexible groups separately

    for group in groups:
        group_id = group.get("id")
        group_name = group.get("name", "Uncategorized")
        is_group_level = group_level_enabled.get(group_id, False)

        if is_group_level:
            # Flexible group: add the group itself, not its categories
            flexible_groups.append(
                {
                    "label": f"{group_name} (Flexible)",
                    "value": f"group:{group_id}",
                }
            )
        else:
            # Regular group: add individual categories
            categories = group.get("categories", [])
            if categories:
                group_options = []
                for cat in categories:
                    cat_name = cat.get("name", "Unknown")
                    cat_icon = cat.get("icon")
                    cat_id = cat.get("id", "")
                    if cat_id:
                        label = _format_category_label(cat_name, cat_icon)
                        group_options.append({"label": label, "value": f"cat:{cat_id}"})

                if group_options:
                    options.append({"label": group_name, "values": group_options})

    # Add flexible groups at the end as a separate section
    if flexible_groups:
        options.append({"label": "Flexible Groups", "values": flexible_groups})

    return {"data": options}


@ifttt_bp.route("/field-options/category-all", methods=["POST"])
@api_handler(handle_mfa=True)
async def field_options_category_all():
    """
    Return ALL Monarch categories as IFTTT field options.

    Unlike /field-options/category, this endpoint lists every individual category
    without rolling up flexible groups. Used for triggers like "new_charge" where
    we want to detect transactions in specific categories, not budget to/from them.

    Values are prefixed: "cat:<uuid>" for consistency.
    """
    services = get_services()
    cm = services.sync_service.category_manager

    # Get categories grouped
    groups = await cm.get_all_categories_grouped()

    options = []
    for group in groups:
        group_name = group.get("name", "Uncategorized")
        categories = group.get("categories", [])

        if categories:
            group_options = []
            for cat in categories:
                cat_name = cat.get("name", "Unknown")
                cat_icon = cat.get("icon")
                cat_id = cat.get("id", "")
                if cat_id:
                    label = _format_category_label(cat_name, cat_icon)
                    group_options.append({"label": label, "value": f"cat:{cat_id}"})

            if group_options:
                options.append({"label": group_name, "values": group_options})

    return {"data": options}


@ifttt_bp.route("/field-options/goal", methods=["POST"])
@api_handler(handle_mfa=True)
async def field_options_goal():
    """
    Return all goal items as IFTTT field options.
    Used for the 'goal' dropdown in the budget_to_goal action.
    """
    from services.stash_service import StashService

    service = StashService()
    dashboard = await service.get_dashboard_data()

    options = []
    for item in dashboard.get("items", []):
        item_name = item.get("name", "Unknown")
        item_emoji = item.get("emoji")
        item_id = item.get("id", "")
        if item_id:
            target = item.get("target_amount", 0)
            # Build label with emoji prefix and target amount suffix
            display_name = _format_category_label(item_name, item_emoji)
            label = f"{display_name} (${target:,.0f} target)" if target else display_name
            options.append({"label": label, "value": item_id})

    return {"data": options}


# ---- REFRESH TRIGGERS ----
# Manually trigger IFTTT event checks without a full sync.


@ifttt_bp.route("/refresh-triggers", methods=["POST"])
@api_handler(handle_mfa=True)
async def refresh_triggers():
    """
    Manually check for IFTTT trigger events and push to broker.
    This runs the same checks as full_sync but without the recurring sync overhead.

    Returns summary of what was checked and any events pushed.
    """
    from services.ifttt_service import IftttService
    from services.stash_service import StashService

    services = get_services()
    cm = services.sync_service.category_manager

    ifttt = IftttService.from_tunnel_creds()
    results: dict[str, Any] = {
        "configured": ifttt.is_configured,
        "subdomain": ifttt.subdomain,
        "events_pushed": {},
    }

    logger.info(
        f"[IFTTT Refresh] Service state: subdomain={ifttt.subdomain}, hasManagementKey={bool(ifttt.management_key)}, is_configured={ifttt.is_configured}"
    )

    if not ifttt.is_configured:
        logger.info("[IFTTT Refresh] Not configured, skipping")
        return results

    logger.info(f"[IFTTT Refresh] Starting trigger check for subdomain: {ifttt.subdomain}")

    # 1. Check stash funding completions
    try:
        stash_service = StashService()
        dashboard = await stash_service.get_dashboard_data()
        items = dashboard.get("items", [])

        stash_items = []
        for item in items:
            target = item.get("amount")
            balance = item.get("current_balance", 0)
            if target and target > 0:
                stash_items.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "balance": balance,
                        "target_amount": target,
                    }
                )

        if stash_items:
            pushed = await ifttt.check_goal_achievements(stash_items)
            results["events_pushed"]["goal_achieved"] = len(pushed)
            if pushed:
                logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} goal achieved events")
    except Exception as e:
        logger.warning(f"[IFTTT Refresh] Goal achievement check failed: {e}")
        results["events_pushed"]["goal_achieved"] = f"error: {e}"

    # 2. Check budget-based triggers
    try:
        budget_data = await cm.get_all_category_budget_data()
        category_info = await cm.get_all_category_info()

        # Fetch active subscriptions to only push events for triggers user cares about
        subscriptions = await ifttt.get_active_subscriptions()
        results["active_subscriptions"] = {k: len(v) for k, v in subscriptions.items()}

        pushed = await ifttt.check_under_budget(budget_data, category_info, subscriptions)
        results["events_pushed"]["under_budget"] = len(pushed)
        if pushed:
            logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} under-budget events")

        pushed = await ifttt.check_budget_surplus(cm)
        results["events_pushed"]["budget_surplus"] = len(pushed)
        if pushed:
            logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} budget surplus events")

        pushed = await ifttt.check_balance_thresholds(budget_data, category_info, subscriptions)
        results["events_pushed"]["balance_threshold"] = len(pushed)
        if pushed:
            logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} balance threshold events")

        pushed = await ifttt.check_under_budget_streaks(budget_data, category_info, subscriptions)
        results["events_pushed"]["under_budget_streak"] = len(pushed)
        if pushed:
            logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} under-budget streak events")

        pushed = await ifttt.check_new_charges(category_info, subscriptions)
        results["events_pushed"]["new_charge"] = len(pushed)
        if pushed:
            logger.info(f"[IFTTT Refresh] Pushed {len(pushed)} new charge events")
    except Exception as e:
        logger.warning(f"[IFTTT Refresh] Budget trigger check failed: {e}")
        results["events_pushed"]["budget_triggers"] = f"error: {e}"

    # 3. Push field options cache
    try:
        # Get detailed group info
        detailed_groups = await cm.get_category_groups_detailed()
        group_level_enabled = {
            g["id"]: g.get("group_level_budgeting_enabled", False) for g in detailed_groups
        }

        # Build two category lists:
        # 1. rolled_up_categories: for actions (flexible groups collapsed)
        # 2. all_categories: for triggers like new_charge (every individual category)
        rolled_up_categories = []
        all_categories = []
        flexible_group_options = []

        groups = await cm.get_all_categories_grouped()
        for group in groups:
            group_id = group.get("id")
            group_name = group.get("name", "")
            is_group_level = group_level_enabled.get(group_id, False)

            # Always add individual categories to all_categories
            for cat in group.get("categories", []):
                if cat.get("id"):
                    all_categories.append(
                        {
                            "label": cat["name"],
                            "value": f"cat:{cat['id']}",
                        }
                    )

            if is_group_level:
                # For rolled_up: add flexible group as single option
                if group_id:
                    flexible_group_options.append(
                        {
                            "label": f"{group_name} (Flexible)",
                            "value": f"group:{group_id}",
                        }
                    )
            else:
                # For rolled_up: add individual categories from non-flexible groups
                for cat in group.get("categories", []):
                    if cat.get("id"):
                        rolled_up_categories.append(
                            {
                                "label": cat["name"],
                                "value": f"cat:{cat['id']}",
                            }
                        )

        # Combine rolled_up with flexible groups at the end
        rolled_up_categories = rolled_up_categories + flexible_group_options

        # Get stashes
        stash_service = StashService()
        dashboard = await stash_service.get_dashboard_data()
        stash_options = [
            {"label": item.get("name", ""), "value": item.get("id", "")}
            for item in dashboard.get("items", [])
            if item.get("id")
        ]

        await ifttt.push_field_options(
            rolled_up_categories, stash_options, categories_all=all_categories
        )
        results["field_options_pushed"] = {
            "categories": len(rolled_up_categories),
            "categories_all": len(all_categories),
            "stashes": len(stash_options),
        }
        logger.info(
            f"[IFTTT Refresh] Pushed field options: {len(rolled_up_categories)} categories (rolled up), "
            f"{len(all_categories)} categories (all), {len(stash_options)} stashes"
        )
    except Exception as e:
        logger.warning(f"[IFTTT Refresh] Field options push failed: {e}")
        results["field_options_pushed"] = f"error: {e}"

    return results


# ---- PROXY ENDPOINTS ----
# These proxy broker API calls so the frontend can use fetchApi()
# instead of direct broker calls with Electron IPC credentials.
# This enables IFTTT management from the tunnel (remote web access).


@ifttt_bp.route("/connection-status", methods=["GET"])
@api_handler(handle_mfa=True)
async def connection_status():
    """Combined endpoint returning IFTTT connection status, queue, and history."""
    from services.ifttt_service import IftttService

    ifttt = IftttService.from_tunnel_creds()
    return await ifttt.get_connection_status()


@ifttt_bp.route("/disconnect", methods=["POST"])
@api_handler(handle_mfa=True)
async def disconnect():
    """Disconnect IFTTT integration via broker."""
    from services.ifttt_service import IftttService

    ifttt = IftttService.from_tunnel_creds()
    logger.info(f"[IFTTT Disconnect] configured={ifttt.is_configured}, subdomain={ifttt.subdomain}")
    result = await ifttt.disconnect()
    logger.info(f"[IFTTT Disconnect] result={result}")
    return result


@ifttt_bp.route("/test-tunnel", methods=["GET"])
@api_handler(handle_mfa=True)
async def test_tunnel():
    """Test tunnel connectivity via broker."""
    from services.ifttt_service import IftttService

    ifttt = IftttService.from_tunnel_creds()
    return await ifttt.test_tunnel()


@ifttt_bp.route("/drain-queue", methods=["POST"])
@api_handler(handle_mfa=True)
async def drain_queue():
    """Execute all pending queued IFTTT actions locally."""
    import time

    from services.ifttt_service import IftttService

    ifttt = IftttService.from_tunnel_creds()
    if not ifttt.is_configured:
        return {"processed": 0, "succeeded": 0, "failed": 0, "actions": []}

    results = await ifttt.drain_queue()

    actions = []
    succeeded = 0
    failed = 0
    for r in results:
        success = r.get("success", False)
        action_entry: dict[str, Any] = {
            "action_slug": r.get("action_slug", ""),
            "success": success,
        }
        if not success:
            action_entry["error"] = r.get("error", "Unknown error")
        actions.append(action_entry)

        # Push result to broker history
        await ifttt.push_action_result(
            {
                "action_slug": r.get("action_slug", ""),
                "fields": r.get("fields", {}),
                "executed_at": int(time.time() * 1000),
                "success": success,
                "error": r.get("error"),
                "was_queued": True,
            }
        )

        if success:
            succeeded += 1
        else:
            failed += 1

    return {
        "processed": len(results),
        "succeeded": succeeded,
        "failed": failed,
        "actions": actions,
    }
