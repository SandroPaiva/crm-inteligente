from sqlalchemy import create_engine, text
engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, nome, email, papel FROM usuarios WHERE email = 'sandropaiva@gmail.com' OR nome LIKE '%dmin%'")).fetchall()
    for row in rows:
        print(row)
