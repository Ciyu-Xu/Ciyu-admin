"""启动时自动检查并补齐缺失的数据库列"""
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine


COLUMN_MIGRATIONS: dict[str, list[tuple[str, str]]] = {
    "sys_user": [
        ("sso_id", "VARCHAR(100)"),
        ("sso_provider", "VARCHAR(50)"),
    ],
    "sys_task": [
        ("retry_count", "INTEGER DEFAULT 0"),
        ("retry_interval", "INTEGER DEFAULT 60"),
        ("is_async", "BOOLEAN DEFAULT TRUE"),
        ("remark", "TEXT"),
        ("create_user", "BIGINT"),
        ("update_user", "BIGINT"),
    ],
    "sys_task_log": [
        ("job_id", "BIGINT"),
        ("job_name", "VARCHAR(100)"),
        ("job_code", "VARCHAR(100)"),
        ("trigger_type", "VARCHAR(20)"),
        ("execution_time", "INTEGER"),
        ("response_data", "TEXT"),
        ("error_msg", "TEXT"),
        ("request_data", "TEXT"),
    ],
    "sys_notice": [
        ("is_popup", "SMALLINT DEFAULT 0"),
    ],
    "sys_menu": [
        ("is_frame", "SMALLINT DEFAULT 0"),
        ("is_cache", "SMALLINT DEFAULT 0"),
        ("visible", "SMALLINT DEFAULT 1"),
    ],
}


async def auto_migrate(engine: AsyncEngine):
    """自动补齐缺失的列"""
    try:
        async with engine.connect() as conn:
            tables_raw = await conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
            )
            existing_tables = {row[0] for row in tables_raw.fetchall()}

            for table, columns in COLUMN_MIGRATIONS.items():
                if table not in existing_tables:
                    continue

                cols_raw = await conn.execute(
                    text("SELECT column_name FROM information_schema.columns WHERE table_name=:t"),
                    {"t": table}
                )
                existing_cols = {row[0] for row in cols_raw.fetchall()}

                for col_name, col_type in columns:
                    if col_name not in existing_cols:
                        await conn.execute(
                            text(f'ALTER TABLE "{table}" ADD COLUMN {col_name} {col_type}')
                        )
                        print(f"  ✓ 添加列 {table}.{col_name}")
    except Exception as e:
        print(f"  ⚠ 自动迁移跳过: {e}")
