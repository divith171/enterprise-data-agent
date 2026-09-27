from fastapi import HTTPException, Request, status

from observability.context import get_request_context
from observability.security_audit import log_security_event

from app.auth.repository import get_user_by_id
from app.auth.sessions import get_auth_session


AUTH_COOKIE_NAME = "eda_session"


async def get_current_user(request: Request):
    session_id = request.cookies.get(
        AUTH_COOKIE_NAME
    )

    # -------------------------------
    # Missing authentication cookie
    # -------------------------------

    if not session_id:

        log_security_event(
            action="authentication",
            outcome="denied",
            reason_code="AUTH_SESSION_MISSING",
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    # -------------------------------
    # Validate authentication session
    # -------------------------------

    session = await get_auth_session(
        session_id
    )

    if session is None:

        log_security_event(
            action="authentication",
            outcome="denied",
            reason_code="AUTH_SESSION_INVALID_OR_EXPIRED",
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    # -------------------------------
    # Load user
    # -------------------------------

    user = await get_user_by_id(
        session["user_id"]
    )

    if user is None:

        log_security_event(
            action="authentication",
            outcome="denied",
            reason_code="AUTH_USER_NOT_FOUND",
            user_id=str(
                session["user_id"]
            ),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    (
        user_id,
        company_id,
        email,
        role,
        is_active,
    ) = user

    # -------------------------------
    # Inactive user
    # -------------------------------

    if not is_active:

        log_security_event(
            action="authentication",
            outcome="denied",
            reason_code="AUTH_USER_INACTIVE",
            user_id=str(user_id),
            tenant_id=str(company_id),
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    # -------------------------------
    # Attach authenticated identity
    # -------------------------------

    context = get_request_context()

    if context is not None:
        context.user_id = str(user_id)
        context.tenant_id = str(company_id)

    return {
        "id": user_id,
        "company_id": company_id,
        "email": email,
        "role": role,
    }