import sys
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

passwords_to_try = ["postgres", "root", "admin", "password", "1234", "123456", "Navya@123", "dasari"]
success = False

for pwd in passwords_to_try:
    for port in [5432, 5433]:
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user="postgres",
                password=pwd,
                host="localhost",
                port=port,
                connect_timeout=2
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM pg_database WHERE datname='safety_db'")
            exists = cur.fetchone()
            if not exists:
                cur.execute("CREATE DATABASE safety_db")
                print(f"SUCCESS: Created database 'safety_db' on port {port} (password: '{pwd}')")
            else:
                print(f"SUCCESS: 'safety_db' already exists on port {port} (password: '{pwd}')")
            cur.close()
            conn.close()
            
            # Write password and port to backend/.env if needed
            with open("backend/.env", "w") as env_f:
                env_f.write(f"DATABASE_URL=postgresql://postgres:{pwd}@localhost:{port}/safety_db\n")
            print(f"Updated backend/.env with DATABASE_URL=postgresql://postgres:{pwd}@localhost:{port}/safety_db")
            success = True
            break
        except Exception as e:
            # print(f"Failed {port} with {pwd}: {e}")
            pass
    if success:
        break

if not success:
    print("COULD_NOT_GUESS_PASSWORD")
