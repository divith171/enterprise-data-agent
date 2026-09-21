import secrets


CSRF_TOKEN_BYTES = 32


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(CSRF_TOKEN_BYTES)


def validate_csrf_token(
    cookie_token: str | None,
    header_token: str | None,
) -> bool:
    if not cookie_token or not header_token:
        return False

    return secrets.compare_digest(
        cookie_token,
        header_token,
    )