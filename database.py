import psycopg2, os, re
from psycopg2 import sql
from dotenv import load_dotenv

env = load_dotenv('.env')

def db_name_normalizer(name: str) -> str:

    name = name.lower()
    name = name.replace("-", "_")
    name = re.sub(r"[^a-z0-9_]", "", name)

    return name


def db_connection(db_name=None):
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        dbname=db_name or os.getenv('DB_NAME'),
        port=5432
    )
    conn.autocommit = True

    return conn

def database_exists(cur, db_name):
    cur.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s",
        (db_name,)
    )
    return cur.fetchone() is not None


def role_exists(cur, role_name):
    cur.execute(
        "SELECT 1 FROM pg_roles WHERE rolname = %s",
        (role_name,)
    )
    return cur.fetchone() is not None

def db_preparation(db_name):
    conn = db_connection() 
    cur = conn.cursor()

    db_identifier = db_name_normalizer(db_name)
    db_fullname = f"{db_identifier}_db"

    print("DB Identifier:", db_identifier)

    # Create database if not exists
    if not database_exists(cur, db_fullname):
        cur.execute(
            sql.SQL("CREATE DATABASE {}")
            .format(sql.Identifier(db_fullname))
        )

    # Create user if not exists
    if not role_exists(cur, db_identifier):
        cur.execute(
            sql.SQL(
                "CREATE USER {} WITH ENCRYPTED PASSWORD {}"
            ).format(
                sql.Identifier(db_identifier),
                sql.Literal(db_identifier + "_pass")
            )
        )

    # Grant database privileges (safe to re-run)
    cur.execute(
        sql.SQL("GRANT ALL PRIVILEGES ON DATABASE {} TO {}")
        .format(
            sql.Identifier(db_fullname),
            sql.Identifier(db_identifier)
        )
    )

    cur.close()
    conn.close()

    # IMPORTANT: connect to the correct database
    grant_privileges(
        db_name=db_fullname,
        role_name=db_identifier
    )


def grant_privileges(db_name, role_name):
    conn = db_connection(db_name=db_name)
    cur = conn.cursor()

    # Existing tables
    cur.execute(
        sql.SQL(
            "GRANT SELECT, INSERT, UPDATE, DELETE "
            "ON ALL TABLES IN SCHEMA public TO {}"
        ).format(sql.Identifier(role_name))
    )

    # Schema privileges
    cur.execute(
        sql.SQL(
            "GRANT USAGE, CREATE ON SCHEMA public TO {}"
        ).format(sql.Identifier(role_name))
    )


    cur.close()
    conn.close()

