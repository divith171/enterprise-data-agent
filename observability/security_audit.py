import hashlib
import time
from typing import Optional

from observability.context import get_request_context
from observability.logger import log_event


# ---------------------------------
# SECURITY AUDIT CONFIGURATION
# ---------------------------------

_ALLOWED_OUTCOMES = {
    "success",
    "failure",
    "denied",
    "blocked",
}


# ---------------------------------
# IDENTIFIER PROTECTION
# ---------------------------------

def hash_audit_identifier(
    value: Optional[str],
) -> Optional[str]:

    if not value:
        return None

    normalized = value.strip().lower()

    return hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()


# ---------------------------------
# SECURITY AUDIT LOGGER
# ---------------------------------

def log_security_event(
    action: str,
    outcome: str,
    *,
    reason_code: Optional[str] = None,
    user_id: Optional[str] = None,
    tenant_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    subject_hash: Optional[str] = None,
    client_ip_hash: Optional[str] = None,
):

    if not action:
        raise ValueError(
            "SECURITY_AUDIT_ACTION_REQUIRED"
        )

    if outcome not in _ALLOWED_OUTCOMES:
        raise ValueError(
            "SECURITY_AUDIT_OUTCOME_INVALID"
        )

    context = get_request_context()

    event = {
        "event_type": "security_audit",
        "category": "security",
        "action": action,
        "outcome": outcome,
        "timestamp": time.time(),
    }

    if context is not None:
        event["request_id"] = context.request_id
        event["trace_id"] = context.trace_id
        event["session_id"] = context.session_id

    if reason_code is not None:
        event["reason_code"] = reason_code

    if user_id is not None:
        event["user_id"] = user_id

    if tenant_id is not None:
        event["tenant_id"] = tenant_id

    if resource_type is not None:
        event["resource_type"] = resource_type

    if resource_id is not None:
        event["resource_id"] = resource_id

    if subject_hash is not None:
        event["subject_hash"] = subject_hash

    if client_ip_hash is not None:
        event["client_ip_hash"] = client_ip_hash

    log_event(event)