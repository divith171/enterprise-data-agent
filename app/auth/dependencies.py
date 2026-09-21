from fastapi import HTTPException, Request, status

from app.auth.repository import get_user_by_id
from app.auth.sessions import get_auth_session


AUTH_COOKIE_NAME = "eda_session"


async def get_current_user(request: Request):
    session_id = request.cookies.get(AUTH_COOKIE_NAME)

    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    session = await get_auth_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    user = await get_user_by_id(session["user_id"])

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    user_id, company_id, email, role, is_active = user

    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="AUTHENTICATION_REQUIRED",
        )

    return {
        "id": user_id,
        "company_id": company_id,
        "email": email,
        "role": role,
    }