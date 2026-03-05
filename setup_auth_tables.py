import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import Usuario, PapelUsuario, Empreendimento
from auth import get_password_hash

def setup_db_and_admin():
    print("Iniciando migração do Banco de Dados...")
    # 1. Cria todas as tabelas novas que faltavam (Usuario e Empreendimento) e colunas na memória (Embora SQLite aplique automático, no PG precisa ver depois as colunas do Lead).
    # Vamos gerar Create_All para as novas tabelas:
    Base.metadata.create_all(bind=engine)
    print("Tabelas garantidas via create_all.")
    
    # Adicionando explicitamente a FK pra leads caso o alembic nao exista.
    with engine.connect() as conn:
        try:
            # Como Leads já estava criada, o create_all pode não adicionar colunas novas.
            # Vamos garantir fazendo um ALTER manualmente.
            with conn.execution_options(isolation_level="AUTOCOMMIT"):
                conn.execute(text("ALTER TABLE leads ADD COLUMN corretor_id UUID REFERENCES usuarios(id)"))
                conn.execute(text("ALTER TABLE leads ADD COLUMN empreendimento_id UUID REFERENCES empreendimentos(id)"))
            print("Novas Colunas adicionadas em Leads.")
        except Exception as e:
            # Se já existir, vai errar de boa.
            print(f"Nota: Tabela Leads já estava com DB schema ok ou requereu erro alternativo: {e}")

    db = SessionLocal()
    try:
        # Se nao houver admin, criamos um
        admin = db.query(Usuario).filter(Usuario.email == "admin@crm.com").first()
        if not admin:
            print("Nenhum ADMIN encontrado. Criando Administrador Padrão...")
            admin = Usuario(
                nome="Administrador Geral",
                email="admin@crm.com",
                senha_hash=get_password_hash("admin123"), # Senha Inicial
                papel=PapelUsuario.admin
            )
            db.add(admin)
            db.commit()
            print("Admin criado: admin@crm.com // admin123")
        else:
            print("O Admin já existe no sistema.")

        # Criar Empreendimento inicial caso não exista
        emp = db.query(Empreendimento).first()
        if not emp:
            print("Nenhum empreendimento. Criando 'Lançamento Principal'...")
            emp = Empreendimento(nome="Lançamento Principal", descricao="Empreendimento Imobiliário Padrão")
            db.add(emp)
            db.commit()
            print("Empreendimento criado.")

    finally:
        db.close()

if __name__ == "__main__":
    from sqlalchemy import text # import for raw sql execution
    setup_db_and_admin()
