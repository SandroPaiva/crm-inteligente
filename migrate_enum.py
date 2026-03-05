import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    try:
        # No Postgres, adicionar um valor a um Enum requer connection.execute(text) com commit do lado de fora caso nao esteja no modo auto-commit
        # porem a operacao de ALTER TYPE costuma precisar rodar isolada se o DB driver der problema. 
        with conn.execution_options(isolation_level="AUTOCOMMIT"):
            conn.execute(text("ALTER TYPE statuslead ADD VALUE 'negociacao';"))
        print("Enum 'negociacao' adicionado no Postgres com sucesso.")
    except Exception as e:
        print(f"Erro ao adicionar valor no Enum (pode já existir): {e}")
