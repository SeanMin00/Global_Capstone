from psycopg import connect
from psycopg.rows import dict_row

from app.core.config import settings


def fetch_all(query: str, params: tuple | None = None) -> list[dict]:
    if not settings.supabase_db_url:
        return []

    with connect(settings.supabase_db_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return list(cur.fetchall())


def fetch_one(query: str, params: tuple | None = None) -> dict | None:
    rows = fetch_all(query, params)
    return rows[0] if rows else None


def ping_database() -> bool:
    if not settings.supabase_db_url:
        return False

    result = fetch_one("select 1 as ok")
    return bool(result and result.get("ok") == 1)

