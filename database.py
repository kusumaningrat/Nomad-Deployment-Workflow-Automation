import psycopg2, os, re
from psycopg2 import sql
from dotenv import load_dotenv

env = load_dotenv('.env')

def db_name_normalizer(name: str) -> str:

    name = name.lower()
    name = name.replace("-", "_")
    name = re.sub(r"[^a-z0-9_]", "", name)

    return name


def db_connection():
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        dbname=os.getenv('DB_NAME'),
        port=5432
    )
    conn.autocommit = True

    return conn

def db_preparation(db_name):
    conn = db_connection()

    db_identifier = db_name_normalizer(db_name)
    print("DB Identifier", db_identifier)
    cur = conn.cursor()

    # create database
    cur.execute(
        sql.SQL(
            "CREATE DATABASE {}"
            ).format(
            sql.Identifier(db_identifier + "_db")
        )
    )

    # create user
    cur.execute(
        sql.SQL(
            "CREATE USER {} WITH ENCRYPTED PASSWORD {}"
        ).format(
            sql.Identifier((db_identifier)),
            sql.Literal(db_identifier + "_pass")
        )
    )

    # Grant privileges on database
    cur.execute(
        sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}")
        .format(
            sql.Identifier(db_identifier)
        )
    )

    cur.execute(
        sql.SQL("GRANT USAGE, CREATE ON SCHEMA public TO {}")
        .format(
            sql.Identifier(db_identifier)
        )
    )

    cur.close()
    conn.close()

    grant_privileges(db_name=db_identifier)

def grant_privileges(db_name):
    conn = db_connection()
    identifier_name = db_name_normalizer(db_name)
    cur = conn.cursor()

    # Grant table privileges
    cur.execute(
        sql.SQL(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {}"
        ).format(sql.Identifier((identifier_name)))
    )

    # Grant schema privileges
    cur.execute(
        sql.SQL(
            "GRANT USAGE, CREATE ON SCHEMA public TO {}"
        ).format(sql.Identifier(identifier_name))
    )

    cur.close()
    conn.close()

if __name__ == "__main":
    db_preparation()