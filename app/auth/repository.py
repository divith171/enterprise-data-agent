from uuid import UUID

from psycopg.errors import ForeignKeyViolation, UniqueViolation

from db.connection import get_pool


class AuthRepositoryError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


async def create_company(
    company_id: UUID,
    name: str,
    slug: str,
) -> None:
    pool = get_pool()

    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO companies (
                        id,
                        name,
                        slug
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (company_id, name, slug),
                )

            await conn.commit()

    except UniqueViolation as exc:
        raise AuthRepositoryError("COMPANY_SLUG_ALREADY_EXISTS") from exc


async def create_user(
    user_id: UUID,
    company_id: UUID,
    email: str,
    password_hash: str,
    role: str,
) -> None:
    pool = get_pool()

    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO users (
                        id,
                        company_id,
                        email,
                        password_hash,
                        role
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        company_id,
                        email,
                        password_hash,
                        role,
                    ),
                )

            await conn.commit()

    except UniqueViolation as exc:
        raise AuthRepositoryError("EMAIL_ALREADY_EXISTS") from exc

    except ForeignKeyViolation as exc:
        raise AuthRepositoryError("COMPANY_NOT_FOUND") from exc


async def get_user_by_email(email: str):
    pool = get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    id,
                    company_id,
                    email,
                    password_hash,
                    role,
                    is_active
                FROM users
                WHERE email = %s
                """,
                (email,),
            )

            return await cur.fetchone()

async def get_user_by_id(user_id: UUID):
    pool = get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    id,
                    company_id,
                    email,
                    role,
                    is_active
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )

            return await cur.fetchone()

async def create_data_source(
    data_source_id: UUID,
    company_id: UUID,
    name: str,
    source_type: str,
    host: str,
    port: int,
    database_name: str,
    username: str,
    secret_ref: str,
    ssl_mode: str,
) -> None:
    pool = get_pool()

    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO data_sources (
                        id,
                        company_id,
                        name,
                        type,
                        host,
                        port,
                        database_name,
                        username,
                        secret_ref,
                        ssl_mode
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        data_source_id,
                        company_id,
                        name,
                        source_type,
                        host,
                        port,
                        database_name,
                        username,
                        secret_ref,
                        ssl_mode,
                    ),
                )

            await conn.commit()

    except ForeignKeyViolation as exc:
        raise AuthRepositoryError("COMPANY_NOT_FOUND") from exc


async def get_data_sources_by_company(
    company_id: UUID,
):
    pool = get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    id,
                    company_id,
                    name,
                    type,
                    host,
                    port,
                    database_name,
                    username,
                    secret_ref,
                    ssl_mode,
                    is_active,
                    created_at,
                    updated_at
                FROM data_sources
                WHERE company_id = %s
                ORDER BY created_at
                """,
                (company_id,),
            )

            return await cur.fetchall()


async def get_data_source_by_id(
    data_source_id: UUID,
):
    pool = get_pool()

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    id,
                    company_id,
                    name,
                    type,
                    host,
                    port,
                    database_name,
                    username,
                    secret_ref,
                    ssl_mode,
                    is_active,
                    created_at,
                    updated_at
                FROM data_sources
                WHERE id = %s
                """,
                (data_source_id,),
            )

            return await cur.fetchone()

async def create_company_with_user(
    company_id: UUID,
    company_name: str,
    company_slug: str,
    user_id: UUID,
    email: str,
    password_hash: str,
    role: str,
) -> None:
    pool = get_pool()

    async with pool.connection() as conn:
        try:
            async with conn.cursor() as cur:
                await cur.execute(
                    """
                    INSERT INTO companies (
                        id,
                        name,
                        slug
                    )
                    VALUES (%s, %s, %s)
                    """,
                    (
                        company_id,
                        company_name,
                        company_slug,
                    ),
                )

                await cur.execute(
                    """
                    INSERT INTO users (
                        id,
                        company_id,
                        email,
                        password_hash,
                        role
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        company_id,
                        email,
                        password_hash,
                        role,
                    ),
                )

            await conn.commit()

        except Exception:
            await conn.rollback()
            raise