from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from app.config import settings
from services.rate_limit_service import (
    consume_rate_limit,
    clear_rate_limit,
)
from app.auth.csrf import generate_csrf_token, validate_csrf_token
from app.auth.service import login, logout, signup
from app.auth.dependencies import get_current_user
from observability.security_audit import (
    hash_audit_identifier,
    log_security_event,
)


router = APIRouter(prefix="/auth")


class SignupRequest(BaseModel):
    email: str
    password: str
    company_name: str
    company_slug: str


@router.post("/signup")
async def signup_user(
    payload: SignupRequest,
    http_request: Request,
):
    client_ip = (
        http_request.client.host
        if http_request.client
        else "unknown"
    )

    signup_limit = await consume_rate_limit(
        "signup_ip",
        client_ip,
        limit=5,
        window_seconds=3600,
    )

    if not signup_limit.allowed:

        log_security_event(
            action="signup",
            outcome="blocked",
            reason_code="SIGNUP_IP_RATE_LIMIT_EXCEEDED",
            client_ip_hash=hash_audit_identifier(
                client_ip
            ),
        )

        raise HTTPException(
            status_code=429,
            detail="RATE_LIMIT_EXCEEDED",
            headers={
                "Retry-After": str(
                    signup_limit.retry_after
                )
            },
        )

    result = await signup(
        email=payload.email,
        password=payload.password,
        company_name=payload.company_name,
        company_slug=payload.company_slug,
    )

    log_security_event(
        action="signup",
        outcome="success",
        reason_code="ACCOUNT_CREATED",
        subject_hash=hash_audit_identifier(
            payload.email
        ),
        client_ip_hash=hash_audit_identifier(
            client_ip
        ),
    )

    return result


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login_user(
    payload: LoginRequest,
    http_request: Request,
    response: Response,
):
    client_ip = (
        http_request.client.host
        if http_request.client
        else "unknown"
    )

    email_limit = await consume_rate_limit(
        "login_email",
        payload.email,
        limit=5,
        window_seconds=300,
    )

    if not email_limit.allowed:

        log_security_event(
            action="login",
            outcome="blocked",
            reason_code="LOGIN_EMAIL_RATE_LIMIT_EXCEEDED",
            subject_hash=hash_audit_identifier(
                payload.email
            ),
            client_ip_hash=hash_audit_identifier(
                client_ip
            ),
        )

        raise HTTPException(
            status_code=429,
            detail="RATE_LIMIT_EXCEEDED",
            headers={
                "Retry-After": str(
                    email_limit.retry_after
                )
            },
        )

    ip_limit = await consume_rate_limit(
        "login_ip",
        client_ip,
        limit=20,
        window_seconds=300,
    )

    if not ip_limit.allowed:

        log_security_event(
            action="login",
            outcome="blocked",
            reason_code="LOGIN_IP_RATE_LIMIT_EXCEEDED",
            subject_hash=hash_audit_identifier(
                payload.email
            ),
            client_ip_hash=hash_audit_identifier(
                client_ip
            ),
        )

        raise HTTPException(
            status_code=429,
            detail="RATE_LIMIT_EXCEEDED",
            headers={
                "Retry-After": str(
                    ip_limit.retry_after
                )
            },
        )

    try:
        result = await login(
            email=payload.email,
            password=payload.password,
        )

    except ValueError as exc:
        if str(exc) == "INVALID_CREDENTIALS":

            log_security_event(
                action="login",
                outcome="failure",
                reason_code="INVALID_CREDENTIALS",
                subject_hash=hash_audit_identifier(
                    payload.email
                ),
                client_ip_hash=hash_audit_identifier(
                    client_ip
                ),
            )

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            ) from exc

        raise

    await clear_rate_limit(
        "login_email",
        payload.email,
    )

    log_security_event(
        action="login",
        outcome="success",
        reason_code="AUTHENTICATED",
        user_id=str(result["user_id"]),
        tenant_id=str(result["company_id"]),
        resource_type="auth_session",
        subject_hash=hash_audit_identifier(
            payload.email
        ),
        client_ip_hash=hash_audit_identifier(
            client_ip
        ),
    )

    response.set_cookie(
        key="eda_session",
        value=result["session_id"],
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )

    csrf_token = generate_csrf_token()

    response.set_cookie(
        key="eda_csrf",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )

    return {
        "user_id": result["user_id"],
        "company_id": result["company_id"],
        "email": result["email"],
        "role": result["role"],
    }


@router.post("/logout")
async def logout_user(
    request: Request,
    response: Response,
):
    client_ip = (
        request.client.host
        if request.client
        else "unknown"
    )

    csrf_cookie = request.cookies.get(
        "eda_csrf"
    )

    csrf_header = request.headers.get(
        "X-CSRF-Token"
    )

    if not validate_csrf_token(
        csrf_cookie,
        csrf_header,
    ):

        log_security_event(
            action="logout",
            outcome="denied",
            reason_code="CSRF_VALIDATION_FAILED",
            client_ip_hash=hash_audit_identifier(
                client_ip
            ),
        )

        raise HTTPException(
            status_code=403,
            detail="CSRF validation failed",
        )

    session_id = request.cookies.get(
        "eda_session"
    )

    if session_id:
        await logout(session_id)

    log_security_event(
        action="logout",
        outcome="success",
        reason_code="SESSION_TERMINATED",
        resource_type="auth_session",
        client_ip_hash=hash_audit_identifier(
            client_ip
        ),
    )

    response.delete_cookie(
        key="eda_session",
        path="/",
    )

    response.delete_cookie(
        key="eda_csrf",
        path="/",
    )

    return {
        "status": "success",
        "message": "Logged out",
    }


@router.get("/me")
async def get_me(
    current_user=Depends(get_current_user)
):
    return current_user