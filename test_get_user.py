from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(models.Usuario).filter(models.Usuario.email == 'admin@crm.com').first()
print("User papel:", repr(user.papel))
print("User papel type:", type(user.papel))
print("Is it equal to models.PapelUsuario.admin?", user.papel == models.PapelUsuario.admin)
print("Is it equal to 'admin'?", user.papel == "admin")
