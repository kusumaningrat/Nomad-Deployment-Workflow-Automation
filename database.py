import psycopg2
from psycopg2 import sql


def create_database(db_name):
    conn = psycopg2.connect(
        host="localhost",
        user="root",
        password="password",
        dbname="postgres",
        port=5432
    )

    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        sql.SQL("CREATE DATABASE {}").format(
            sql.Identifier(db_name)
        )
    )


    cur.close()
    conn.close()    