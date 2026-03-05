import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE leads ADD COLUMN genero VARCHAR(20);"))
        conn.commit()
        print("Coluna 'genero' adicionada com sucesso.")
    except Exception as e:
        print(f"Erro ao adicionar coluna (pode já existir): {e}")
