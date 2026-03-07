from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import models

engine = create_engine("postgresql://admin:p41v4351522@localhost:5432/crm_db")
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = db.query(models.Usuario).filter(models.Usuario.email == 'sandrogestor@teste.com.br').first()
print("Gerente found:", user.nome)

user_papel = user.papel.value if isinstance(user.papel, models.PapelUsuario) else user.papel

print("User papel:", user_papel)
if user_papel == models.PapelUsuario.admin.value:
    leads = db.query(models.Lead).all()
elif user_papel == models.PapelUsuario.gerente.value:
    subordinados = db.query(models.Usuario.id).filter(models.Usuario.gerente_id == user.id).all()
    ids_permitidos = [sub[0] for sub in subordinados] + [user.id]
    leads = db.query(models.Lead).filter(models.Lead.corretor_id.in_(ids_permitidos)).all()
    print("Gerente leads:", len(leads))
else:
    print("Corretor")
