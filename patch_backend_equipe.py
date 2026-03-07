import re

# 1. Ajuste no schemas.py
with open("schemas.py", "r", encoding="utf-8") as f:
    sch_content = f.read()

sch_update = """class UsuarioResponse(UsuarioBase):
    id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    papel: Optional[models.PapelUsuario] = None
    gerente_id: Optional[UUID] = None

class UsuarioUpdateGerente(BaseModel):"""

sch_content = sch_content.replace("""class UsuarioResponse(UsuarioBase):
    id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True

class UsuarioUpdateGerente(BaseModel):""", sch_update)

with open("schemas.py", "w", encoding="utf-8") as f:
    f.write(sch_content)

# 2. Ajuste no main.py
with open("main.py", "r", encoding="utf-8") as f:
    main_content = f.read()

main_patch = """@app.patch("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def atualizar_usuario_completo(usuario_id: str, update_data: schemas.UsuarioUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    \"\"\"
    Atualiza as informações cadastradas de um usuário.
    Admin edita todos. Gerente edita apenas corretores.
    \"\"\"
    usuario_db = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Controle de permissões
    if current_user.papel == models.PapelUsuario.corretor:
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if current_user.papel == models.PapelUsuario.gerente:
        if usuario_db.papel != models.PapelUsuario.corretor:
            raise HTTPException(status_code=403, detail="Gerentes só podem editar corretores.")
        update_data.papel = None # Gerente não pode promover ninguém
        update_data.gerente_id = None # Gerente não pode mudar o chefe do corretor (que é ele mesmo)

    if update_data.nome is not None:
        usuario_db.nome = update_data.nome
    if update_data.email is not None:
        # Verifica duplicidade
        existente = db.query(models.Usuario).filter(models.Usuario.email == update_data.email).first()
        if existente and str(existente.id) != str(usuario_id):
            raise HTTPException(status_code=400, detail="Este e-mail já pertence a outro usuário.")
        usuario_db.email = update_data.email
    if update_data.senha is not None and update_data.senha.strip() != "":
        usuario_db.senha_hash = auth.get_password_hash(update_data.senha)
    if update_data.papel is not None:
        usuario_db.papel = update_data.papel
    if update_data.gerente_id is not None:
        # null representation fix if sent as empty string or zero uuid sometimes
        if str(update_data.gerente_id) == str(UUID(int=0)):
             usuario_db.gerente_id = None
        else:
             usuario_db.gerente_id = update_data.gerente_id

    db.commit()
    db.refresh(usuario_db)
    return usuario_db

@app.post("/usuarios/importar-json", response_model=dict, status_code=201)
def importar_usuarios_json(payload: dict, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    \"\"\"
    Importa um lote de usuários do CSV. Apenas Admin e Gerentes (para corretores).
    \"\"\"
    if current_user.papel == models.PapelUsuario.corretor:
        raise HTTPException(status_code=403, detail="Sem permissão.")

    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="O payload deve conter uma lista chamada 'rows'.")

    importados = 0
    ignorados_duplicados = 0
    erros = []

    for i, row in enumerate(rows, start=2):
        nome = row.get("nome", "").strip()
        email = row.get("email_primario", "").strip() or row.get("email", "").strip()
        senha = row.get("senha", "").strip()
        papel_str = row.get("papel", "").strip().lower()

        if not nome or not email:
            erros.append(f"Linha {i}: O nome e o e-mail são obrigatórios.")
            continue

        if db.query(models.Usuario).filter(models.Usuario.email == email).first():
            ignorados_duplicados += 1
            continue

        papel_atribuido = models.PapelUsuario.corretor
        ger_id = None
        
        # Gerente forçosamente cadastra como corretor e se auto-atribui gerente
        if current_user.papel == models.PapelUsuario.gerente:
            papel_atribuido = models.PapelUsuario.corretor
            ger_id = current_user.id
        elif current_user.papel == models.PapelUsuario.admin:
            if papel_str == "admin":
                 papel_atribuido = models.PapelUsuario.admin
            elif papel_str == "gerente":
                 papel_atribuido = models.PapelUsuario.gerente
            else:
                 papel_atribuido = models.PapelUsuario.corretor

        if not senha:
             senha = "senha" + email.split("@")[0] # default provisória

        try:
            n_usr = models.Usuario(
                nome=nome,
                email=email,
                senha_hash=auth.get_password_hash(senha),
                papel=papel_atribuido,
                gerente_id=ger_id
            )
            db.add(n_usr)
            db.commit()
            importados += 1
        except Exception as e:
            db.rollback()
            erros.append(f"Linha {i} ({nome}): {str(e)}")

    return {
        "importados": importados,
        "ignorados_duplicados": ignorados_duplicados,
        "erros": erros,
    }

@app.patch("/usuarios/{usuario_id}/gerente", response_model=schemas.UsuarioResponse)"""

main_content = main_content.replace("""@app.patch("/usuarios/{usuario_id}/gerente", response_model=schemas.UsuarioResponse)""", main_patch)

with open("main.py", "w", encoding="utf-8") as f:
    f.write(main_content)

print("Backend de Equipe atualizado com schemas e endpoints PATCH/Import.")
