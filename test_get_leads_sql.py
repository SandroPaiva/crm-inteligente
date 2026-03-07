from sqlalchemy import create_engine
engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
with engine.connect() as conn:
    from sqlalchemy import text
    try:
        rows = conn.execute(text("SELECT id, nome, email, papel FROM usuarios WHERE email='admin@crm.com'")).fetchall()
        print("Raw DB:", rows[0])
        import enum
        class PapelUsuario(str, enum.Enum):
            admin = "admin"
            gerente = "gerente"
            corretor = "corretor"
        
        db_papel = rows[0][3]
        print("DB papel:", repr(db_papel), type(db_papel))
        print("Is equal to PapelUsuario.admin?", db_papel == PapelUsuario.admin)
        print("Is equal to 'admin'?", db_papel == "admin")
        print("Is equal to PapelUsuario.admin.value?", db_papel == PapelUsuario.admin.value)
    except Exception as e:
        print(e)
