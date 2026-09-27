from typing import Any

from app.config import settings


def debug_print(
    *values: Any,
    **kwargs: Any,
) -> None:
    if not settings.verbose_debug_logging:
        return

    print(
        *values,
        **kwargs,
    )