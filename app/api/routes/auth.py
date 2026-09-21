from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from app.auth.csrf import generate_csrf_token, validate_csrf_token
from app.auth.service import login, logout, signup
from app.auth.dependencies import get_current_user


router = APIRouter(prefix="/auth")


class SignupRequest(BaseModel):
    email: str
    password: str
    company_name: str
    company_slug: str


@router.post("/signup")
async def signup_user(request: SignupRequest):
    result = await signup(
        email=request.email,
        password=request.password,
        company_name=request.company_name,
        company_slug=request.company_slug,
    )

    return result


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login_user(
    request: LoginRequest,
    response: Response,
):
    try:
        result = await login(
            email=request.email,
            password=request.password,
        )
    except ValueError as exc:
        if str(exc) == "INVALID_CREDENTIALS":
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            ) from exc
        raise

    response.set_cookie(
        key="eda_session",
        value=result["session_id"],
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )

    csrf_token = generate_csrf_token()

    response.set_cookie(
        key="eda_csrf",
        value=csrf_token,
        httponly=False,
        samesite="lax",
        secure=False,
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
    csrf_cookie = request.cookies.get("eda_csrf")
    csrf_header = request.headers.get("X-CSRF-Token")

    if not validate_csrf_token(csrf_cookie, csrf_header):
        raise HTTPException(
            status_code=403,
            detail="CSRF validation failed",
        )

    session_id = request.cookies.get("eda_session")

    if session_id:
        await logout(session_id)

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
async def get_me(current_user=Depends(get_current_user)):
    return current_user