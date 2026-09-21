from uuid import uuid4

from app.auth.passwords import hash_password, verify_password
from app.auth.repository import create_company_with_user, get_user_by_email
from app.auth.sessions import create_auth_session, delete_auth_session


MIN_PASSWORD_LENGTH = 15
MAX_PASSWORD_LENGTH = 64


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_signup_input(
    email: str,
    password: str,
    company_name: str,
    company_slug: str,
) -> None:
    if not email.strip():
        raise ValueError("EMAIL_REQUIRED")

    if not password:
        raise ValueError("PASSWORD_REQUIRED")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError("PASSWORD_TOO_SHORT")

    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError("PASSWORD_TOO_LONG")

    if not company_name.strip():
        raise ValueError("COMPANY_NAME_REQUIRED")

    if not company_slug.strip():
        raise ValueError("COMPANY_SLUG_REQUIRED")


def prepare_password(password: str) -> str:
    return hash_password(password)


async def signup(
    email: str,
    password: str,
    company_name: str,
    company_slug: str,
):
    validate_signup_input(
        email=email,
        password=password,
        company_name=company_name,
        company_slug=company_slug,
    )

    email = normalize_email(email)
    company_slug = company_slug.strip()
    company_name = company_name.strip()

    company_id = uuid4()
    user_id = uuid4()

    password_hash = prepare_password(password)

    await create_company_with_user(
        company_id=company_id,
        company_name=company_name,
        company_slug=company_slug,
        user_id=user_id,
        email=email,
        password_hash=password_hash,
        role="admin",
    )

    return {
        "user_id": user_id,
        "company_id": company_id,
        "email": email,
        "role": "admin",
    }


async def login(
    email: str,
    password: str,
):
    email = normalize_email(email)

    user = await get_user_by_email(email)

    if user is None:
        raise ValueError("INVALID_CREDENTIALS")

    user_id, company_id, user_email, password_hash, role, is_active = user

    if not is_active:
        raise ValueError("INVALID_CREDENTIALS")

    if not verify_password(password, password_hash):
        raise ValueError("INVALID_CREDENTIALS")

    session_id = await create_auth_session(str(user_id))

    return {
        "session_id": session_id,
        "user_id": user_id,
        "company_id": company_id,
        "email": user_email,
        "role": role,
    }


async def logout(session_id: str) -> None:
    await delete_auth_session(session_id)