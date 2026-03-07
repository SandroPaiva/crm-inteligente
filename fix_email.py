from sqlalchemy import create_engine, text
engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
with engine.connect() as conn:
    conn.execute(text("UPDATE leads SET email_primario = 'teste015@teste.com.br' WHERE email_primario = 'teste015@teste,com.br'"))
    conn.commit()
    print("Fixed bad email in DB!")
