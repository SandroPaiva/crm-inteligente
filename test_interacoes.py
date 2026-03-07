from sqlalchemy import create_engine, text
engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, tipo, criado_em, lead_id FROM interacoes")).fetchall()
    print("Found", len(rows), "interacoes.")
