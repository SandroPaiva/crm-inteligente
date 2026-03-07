from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(models.Usuario).filter(models.Usuario.email == 'admin@crm.com').first()
print("Role:", user.papel)
if user.papel == models.PapelUsuario.admin:
    leads = db.query(models.Lead).all()
    print("Admin: found", len(leads), "leads")
else:
    print("Not admin!")
