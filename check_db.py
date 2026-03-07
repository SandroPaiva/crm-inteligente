from sqlalchemy import create_engine, text
engine = create_engine("sqlite:///crm_database.db")
with engine.connect() as conn:
    rows = conn.execute(text("SELECT id, nome, email, papel FROM usuarios")).fetchall()
    for row in rows:
        print(row)
