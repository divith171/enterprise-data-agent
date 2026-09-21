import os
from dotenv import load_dotenv
load_dotenv()
class SecretResolutionError(Exception):
    pass


def resolve_database_credentials(secret_ref: str) -> dict:
    if not secret_ref:
        raise SecretResolutionError("SECRET_REF_MISSING")

    password = os.getenv(secret_ref)

    if not password:
        raise SecretResolutionError(
            f"SECRET_NOT_CONFIGURED: {secret_ref}"
        )

    return {
        "password": password,
    }