#database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# URL de conexão com o PorstgreSQL que está rodando no Docker
# Formato: postgresql://usuario:senha@host:porta/nome_do_banco
SQLALCHEMY_DATABASE_URL = "postgresql://admin:p41v4351522@localhost:5432/crm_db"

# O "engine" é o objeto que gerencia a conexão com o banco de dados
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# A Sessão é usada para interagir com o banco de dados, permitindo criar, ler, atualizar e deletar registros
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para criação dos modelos de dados (tabelas)
Base = declarative_base()

# Função auxiliar para injetar a sessão do Banco nas Rotas da API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()