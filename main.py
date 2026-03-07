# main.py
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from typing import List, Optional, Any
import models
import schemas
from uuid import UUID
import auth
from jose import jwt, JWTError
import csv
import io

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRM Inteligente API", version="0.1.0")

# --- AUTH SECURITY ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- AUTH ROUTES ---
@app.post("/auth/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"email": user.email, "sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/usuarios/me", response_model=schemas.UsuarioResponse)
def read_users_me(current_user: models.Usuario = Depends(get_current_user)):
    return current_user

@app.post("/usuarios/", response_model=schemas.UsuarioResponse, status_code=201)
def criar_usuario(usuario_in: schemas.UsuarioCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Cadastra um novo usuário no sistema. 
    Regras:
    - Admin cria quem quiser (Pode definir o gerente do novo usuário se for corretor).
    - Gerente só cria corretor. O gerente dele será o gerente logado automaticamente.
    - Corretor não cria ninguém.
    """
    if current_user.papel == models.PapelUsuario.corretor:
        raise HTTPException(status_code=403, detail="Corretores não têm permissão para criar usuários.")

    # Verifica se e-mail já existe
    if db.query(models.Usuario).filter(models.Usuario.email == usuario_in.email).first():
        raise HTTPException(status_code=400, detail="Este e-mail já está em uso.")

    novo_usuario = models.Usuario(
        nome=usuario_in.nome,
        email=usuario_in.email,
        senha_hash=auth.get_password_hash(usuario_in.senha),
        papel=usuario_in.papel
    )

    if current_user.papel == models.PapelUsuario.gerente:
        # Se for gerente, forçamos o novo user a ser corretor e a ele ser o gerente.
        novo_usuario.papel = models.PapelUsuario.corretor
        novo_usuario.gerente_id = current_user.id
    elif current_user.papel == models.PapelUsuario.admin:
        # Se for admin, a gente aceita o gerente_id que veio no form (mesmo se null)
        novo_usuario.gerente_id = usuario_in.gerente_id

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.patch("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def atualizar_usuario_completo(usuario_id: str, update_data: schemas.UsuarioUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atualiza as informações cadastradas de um usuário.
    Admin edita todos. Gerente edita apenas corretores.
    """
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
    """
    Importa um lote de usuários do CSV. Apenas Admin e Gerentes (para corretores).
    """
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

@app.patch("/usuarios/{usuario_id}/gerente", response_model=schemas.UsuarioResponse)
def atualizar_gerente_usuario(usuario_id: str, update_data: schemas.UsuarioUpdateGerente, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atualiza o gerente de um usuário (Apenas Admin).
    """
    if current_user.papel != models.PapelUsuario.admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem trocar a liderança de um membro.")

    usuario_db = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    usuario_db.gerente_id = update_data.gerente_id
    db.commit()
    db.refresh(usuario_db)
    return usuario_db

# --- CONFIGURAÇÃO DO CORS ---
# Permite que o frontend React (que rodará na porta 5173) converse com esta API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # URL do nosso Frontend Vite
    allow_credentials=True,
    allow_methods=["*"], # Permite todos os verbos (GET, POST, PATCH, etc)
    allow_headers=["*"], # Permite todos os cabeçalhos
)
# ----------------------------

@app.post("/webhook/leads/", response_model=dict, status_code=201)
def receber_lead_webhook(lead_in: schemas.LeadCreateWebhook, db: Session = Depends(get_db)):
    """
    Endpoint (Webhook) para receber novos leads de Landing Pages ou Sites.
    """
    # 1. Verifica se o e-mail já existe na base
    lead_existente = db.query(models.Lead).filter(models.Lead.email_primario == lead_in.email_primario).first()
    if lead_existente:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado como lead.")

    from sqlalchemy import func
    max_num = db.query(func.max(models.Lead.numero_sequencial)).scalar() or 0
    novo_numero = max_num + 1

    # 2. Converte os dados recebidos (Pydantic) para o formato do Banco (SQLAlchemy)
    novo_lead = models.Lead(
        numero_sequencial=novo_numero,
        nome=lead_in.nome,
        email_primario=lead_in.email_primario,
        celular_primario=lead_in.celular_primario,
        origem=lead_in.origem,
        interesse=lead_in.interesse,
        utms=lead_in.utms
    )

    # 3. Salva no banco de dados
    db.add(novo_lead)
    db.commit()
    db.refresh(novo_lead) # Pega o ID gerado pelo banco

    return {"mensagem": "Lead recebido e cadastrado com sucesso!", "lead_id": novo_lead.id}
  
@app.post("/leads/", response_model=schemas.LeadResponse, status_code=201)
def criar_lead_manual(lead_in: schemas.LeadCreateWebhook, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Endpoint para Cadastro Manual via Sistema. Aplica regras de negócio.
    """
    if db.query(models.Lead).filter(models.Lead.email_primario == lead_in.email_primario).first():
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado.")

    from sqlalchemy import func
    max_num = db.query(func.max(models.Lead.numero_sequencial)).scalar() or 0
    novo_numero = max_num + 1

    novo_lead = models.Lead(
        numero_sequencial=novo_numero,
        nome=lead_in.nome,
        email_primario=lead_in.email_primario,
        celular_primario=lead_in.celular_primario,
        origem=lead_in.origem,
        interesse=lead_in.interesse,
        genero=lead_in.genero,
        utms=lead_in.utms,
        empreendimento_id=lead_in.empreendimento_id
    )

    # Regras de Atribuição de Corretor
    if current_user.papel == models.PapelUsuario.corretor:
        novo_lead.corretor_id = current_user.id # Força o lead para ele mesmo
    else:
        # Admin ou Gerente pode atribuir para quem quiser (ou deixar null)
        novo_lead.corretor_id = lead_in.corretor_id

    db.add(novo_lead)
    db.commit()
    db.refresh(novo_lead)
    return novo_lead

@app.get("/contatos/", response_model=List[schemas.ContatoResponse])
def get_contatos(
    skip: int = 0, 
    limit: int = 10000, 
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Retorna todos os contatos do BD para relatórios
    """
    if current_user.papel == models.PapelUsuario.corretor:
        return db.query(models.Contato).join(models.Lead).filter(models.Lead.corretor_id == current_user.id).offset(skip).limit(limit).all()
    else:
        return db.query(models.Contato).offset(skip).limit(limit).all()

@app.post("/leads/importar-csv")
async def importar_leads_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Importa leads em massa a partir de um arquivo CSV.
    Somente admins podem usar este endpoint.
    Colunas esperadas (case-insensitive, qualquer separador , ou ;):
      nome, email_primario, celular_primario, origem, interesse, genero
    """
    if current_user.papel != models.PapelUsuario.admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem importar leads.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # Handle BOM from Excel
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
    # Normalize headers to lowercase stripped
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV sem cabeçalho ou arquivo inválido.")

    from sqlalchemy import func
    importados = 0
    ignorados = 0
    erros = []

    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        # Normalize keys
        row_norm = {k.strip().lower(): (v.strip() if v else '') for k, v in row.items()}
        nome = row_norm.get('nome') or row_norm.get('name', '')
        email = row_norm.get('email_primario') or row_norm.get('email', '')
        celular = row_norm.get('celular_primario') or row_norm.get('celular') or row_norm.get('phone', '')
        origem = row_norm.get('origem') or row_norm.get('source', '')
        interesse = row_norm.get('interesse') or row_norm.get('interest', '')
        genero = row_norm.get('genero') or row_norm.get('gender', '')

        if not nome or not email or not celular:
            erros.append(f"Linha {i}: nome, email e celular são obrigatórios.")
            continue

        # Skip duplicates by email
        if db.query(models.Lead).filter(models.Lead.email_primario == email).first():
            ignorados += 1
            continue

        try:
            max_num = db.query(func.max(models.Lead.numero_sequencial)).scalar() or 0
            novo_lead = models.Lead(
                numero_sequencial=max_num + 1,
                nome=nome,
                email_primario=email,
                celular_primario=celular,
                origem=origem or None,
                interesse=interesse or None,
                genero=genero or None,
                status=models.StatusLead.novo,
            )
            db.add(novo_lead)
            db.commit()
            db.refresh(novo_lead)
            importados += 1
        except Exception as e:
            db.rollback()
            erros.append(f"Linha {i}: {str(e)}")

    return JSONResponse({
        "importados": importados,
        "ignorados_duplicados": ignorados,
        "erros": erros,
        "total_processado": importados + ignorados + len(erros),
    })


@app.post("/leads/importar-json")
async def importar_leads_json(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Importa leads a partir de dados já mapeados pelo frontend (wizard).
    Busca corretor e empreendimento pelo nome.
    Campos não encontrados são ignorados (não impedem a importação da linha).
    Somente admins.
    """
    if current_user.papel != models.PapelUsuario.admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem importar leads.")

    rows = payload.get("rows", [])
    from sqlalchemy import func

    importados = 0
    ignorados_duplicados = 0
    avisos_corretor: list[str] = []
    avisos_empreendimento: list[str] = []
    erros: list[str] = []

    for i, row in enumerate(rows, start=1):
        nome = (row.get("nome") or "").strip()
        email = (row.get("email_primario") or "").strip()
        celular = (row.get("celular_primario") or "").strip()

        if not nome or not email or not celular:
            erros.append(f"Linha {i}: nome, e-mail e celular são obrigatórios.")
            continue

        if db.query(models.Lead).filter(models.Lead.email_primario == email).first():
            ignorados_duplicados += 1
            continue

        # Resolve corretor by name
        corretor_id = None
        corretor_nome = (row.get("corretor") or "").strip()
        if corretor_nome:
            corretor = db.query(models.Usuario).filter(
                models.Usuario.nome.ilike(f"%{corretor_nome}%")
            ).first()
            if corretor:
                corretor_id = corretor.id
            else:
                avisos_corretor.append(
                    f'Linha {i} ({nome}): Corretor "{corretor_nome}" não encontrado. Campo ignorado.'
                )

        # Resolve empreendimento by name
        empreendimento_id = None
        emp_nome = (row.get("empreendimento") or "").strip()
        if emp_nome:
            emp = db.query(models.Empreendimento).filter(
                models.Empreendimento.nome.ilike(f"%{emp_nome}%")
            ).first()
            if emp:
                empreendimento_id = emp.id
            else:
                avisos_empreendimento.append(
                    f'Linha {i} ({nome}): Empreendimento "{emp_nome}" não encontrado. Campo ignorado.'
                )

        try:
            max_num = db.query(func.max(models.Lead.numero_sequencial)).scalar() or 0
            novo_lead = models.Lead(
                numero_sequencial=max_num + 1,
                nome=nome,
                email_primario=email,
                celular_primario=celular,
                origem=row.get("origem") or None,
                interesse=row.get("interesse") or None,
                genero=row.get("genero") or None,
                corretor_id=corretor_id,
                empreendimento_id=empreendimento_id,
                status=models.StatusLead.novo,
            )
            db.add(novo_lead)
            db.commit()
            db.refresh(novo_lead)
            importados += 1
        except Exception as e:
            db.rollback()
            erros.append(f"Linha {i} ({nome}): {str(e)}")

    return JSONResponse({
        "importados": importados,
        "ignorados_duplicados": ignorados_duplicados,
        "avisos_corretor": avisos_corretor,
        "avisos_empreendimento": avisos_empreendimento,
        "erros": erros,
    })


@app.get("/leads/", response_model=list[schemas.LeadResponse])
def listar_leads(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Retorna leads filtrados pela hierarquia de acessos.
    """
    user_papel = current_user.papel.value if isinstance(current_user.papel, models.PapelUsuario) else current_user.papel
    print(f"[DEBUG LISTAR LEADS] Email: {current_user.email} | Papel: {user_papel} | Type: {type(user_papel)}")

    if user_papel == models.PapelUsuario.admin.value:
        leads = db.query(models.Lead).all()
        print(f"[DEBUG LISTAR LEADS] ADMIN: Retornou {len(leads)} leads")
    elif user_papel == models.PapelUsuario.gerente.value:
        subordinados = db.query(models.Usuario.id).filter(models.Usuario.gerente_id == current_user.id).all()
        ids_permitidos = [sub[0] for sub in subordinados] + [current_user.id]
        leads = db.query(models.Lead).filter(models.Lead.corretor_id.in_(ids_permitidos)).all()
    else:
        # Corretor
        leads = db.query(models.Lead).filter(models.Lead.corretor_id == current_user.id).all()
    return leads


@app.patch("/leads/{lead_id}/status", response_model=schemas.LeadResponse)
def atualizar_status_lead(lead_id: str, lead_update: schemas.LeadUpdateStatus, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atualiza apenas o status de um lead específico. 
    Será acionado toda vez que um card for "solto" em uma nova coluna do Kanban.
    """
    # 1. Tenta encontrar o lead pelo ID
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    # 2. Atualiza o status
    lead_db.status = lead_update.status
    
    # 3. Salva a alteração
    db.commit()
    db.refresh(lead_db)

    return lead_db
  
@app.get("/leads/{lead_id}", response_model=schemas.LeadComHistoricoResponse)
def buscar_lead_detalhes(lead_id: str, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Busca um lead específico e traz todo o histórico de interações dele.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return lead_db


@app.post("/leads/{lead_id}/interacoes", response_model=schemas.InteracaoResponse, status_code=201)
def adicionar_interacao(lead_id: str, interacao_in: schemas.InteracaoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Adiciona uma nova interação e ATUALIZA O STATUS do Lead obrigatoriamente.
    """
    # 1. Busca o lead
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    # 2. Cria a nova interação
    nova_interacao = models.Interacao(
        lead_id=lead_db.id,
        tipo=interacao_in.tipo,
        conteudo=interacao_in.conteudo
    )
    db.add(nova_interacao)

    # 3. REGRA DE NEGÓCIO: Atualiza o status do Lead com o valor recebido
    lead_db.status = interacao_in.novo_status

    # 4. Salva TUDO em uma única transação no banco (se falhar um, falha tudo - garante integridade)
    db.commit()
    db.refresh(nova_interacao)

    return nova_interacao


@app.put("/leads/{lead_id}", response_model=schemas.LeadResponse)
def atualizar_lead(lead_id: str, lead_update: schemas.LeadUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atualiza todas as informações de perfil de um lead. Corretores não alteram telefone_primario.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    # Atualiza apenas os campos fornecidos
    update_data = lead_update.model_dump(exclude_unset=True)
    
    # Regra: Corretor não edita celular_primario nem email_primario
    if current_user.papel == models.PapelUsuario.corretor:
        if "celular_primario" in update_data:
            del update_data["celular_primario"]
        if "email_primario" in update_data:
            del update_data["email_primario"]

    for key, value in update_data.items():
        setattr(lead_db, key, value)

    db.commit()
    db.refresh(lead_db)
    return lead_db


@app.patch("/leads/{lead_id}/empreendimento", response_model=schemas.LeadResponse)
def atribuir_empreendimento(lead_id: str, body: schemas.AtribuirEmpreendimento, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atribui (ou remove) um empreendimento a um lead.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    lead_db.empreendimento_id = body.empreendimento_id
    db.commit()
    db.refresh(lead_db)
    return lead_db


@app.patch("/leads/{lead_id}/corretor", response_model=schemas.LeadResponse)
def atribuir_corretor(lead_id: str, body: schemas.AtribuirCorretor, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atribui um corretor a um lead.
    """
    if current_user.papel == models.PapelUsuario.corretor:
        raise HTTPException(status_code=403, detail="Corretores não podem reatribuir leads.")
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    lead_db.corretor_id = body.corretor_id
    db.commit()
    db.refresh(lead_db)
    return lead_db


@app.delete("/leads/{lead_id}", status_code=204)
def deletar_lead(lead_id: str, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Exclui permanentemente um lead e suas interações (devido ao cascade). Restrito ao admin e gerente.
    """
    if current_user.papel == models.PapelUsuario.corretor:
        raise HTTPException(status_code=403, detail="Corretores não podem deletar leads.")
        
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    db.delete(lead_db)
    db.commit()
    return None

# --- ROTAS DE TAREFA ---

@app.post("/leads/{lead_id}/tarefas", response_model=schemas.TarefaResponse, status_code=201)
def adicionar_tarefa(lead_id: str, tarefa_in: schemas.TarefaCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Cria uma nova tarefa associada a um lead.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    nova_tarefa = models.Tarefa(
        lead_id=lead_db.id,
        titulo=tarefa_in.titulo,
        descricao=tarefa_in.descricao,
        data_vencimento=tarefa_in.data_vencimento
    )
    db.add(nova_tarefa)
    db.commit()
    db.refresh(nova_tarefa)
    return nova_tarefa

@app.get("/tarefas/", response_model=list[schemas.TarefaResponse])
def listar_tarefas(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Retorna todas as tarefas (para a tela geral de Tarefas).
    """
    tarefas = db.query(models.Tarefa).all()
    return tarefas

@app.patch("/tarefas/{tarefa_id}", response_model=schemas.TarefaResponse)
def atualizar_tarefa(tarefa_id: str, tarefa_update: schemas.TarefaUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Atualiza dados de uma tarefa (ex: marcar como concluída).
    """
    tarefa_db = db.query(models.Tarefa).filter(models.Tarefa.id == tarefa_id).first()
    if not tarefa_db:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")

    update_data = tarefa_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tarefa_db, key, value)

    db.commit()
    db.refresh(tarefa_db)
    return tarefa_db

# --- ROTAS DE CONTATO ---

@app.post("/leads/{lead_id}/contatos", response_model=schemas.ContatoResponse, status_code=201)
def adicionar_contato(lead_id: str, contato_in: schemas.ContatoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Associa um novo contato a um lead.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")

    novo_contato = models.Contato(
        lead_id=lead_db.id,
        nome=contato_in.nome,
        cargo=contato_in.cargo,
        email=contato_in.email,
        telefone=contato_in.telefone
    )
    db.add(novo_contato)
    db.commit()
    db.refresh(novo_contato)
    return novo_contato

# --- ROTAS DE UTILIDADES ---

@app.get("/empreendimentos/", response_model=list[schemas.EmpreendimentoResponse])
def listar_empreendimentos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """Lista todos os empreendimentos para o select no frontend."""
    return db.query(models.Empreendimento).all()

@app.post("/empreendimentos/", response_model=schemas.EmpreendimentoResponse, status_code=201)
def criar_empreendimento(empreendimento_in: schemas.EmpreendimentoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """
    Cria um novo empreendimento. Apenas Admin possui permissão.
    """
    if current_user.papel != models.PapelUsuario.admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem cadastrar novos empreendimentos.")

    novo_empreendimento = models.Empreendimento(
        codigo=empreendimento_in.codigo,
        nome=empreendimento_in.nome,
        descricao=empreendimento_in.descricao,
        disponivel=empreendimento_in.disponivel
    )

    db.add(novo_empreendimento)
    db.commit()
    db.refresh(novo_empreendimento)
    return novo_empreendimento

@app.put("/empreendimentos/{empreendimento_id}", response_model=schemas.EmpreendimentoResponse)
def atualizar_empreendimento(
    empreendimento_id: str, 
    empreendimento_in: schemas.EmpreendimentoBase, 
    db: Session = Depends(get_db), 
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Atualiza um empreendimento existente. Apenas Admin possui permissão.
    """
    if current_user.papel != models.PapelUsuario.admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem editar empreendimentos.")

    empreendimento_db = db.query(models.Empreendimento).filter(models.Empreendimento.id == empreendimento_id).first()
    if not empreendimento_db:
        raise HTTPException(status_code=404, detail="Empreendimento não encontrado.")

    # Check for unique constraints if they changed
    if empreendimento_in.codigo != empreendimento_db.codigo:
        if db.query(models.Empreendimento).filter(models.Empreendimento.codigo == empreendimento_in.codigo).first():
            raise HTTPException(status_code=400, detail="Este código já está em uso.")
            
    if empreendimento_in.nome != empreendimento_db.nome:
        if db.query(models.Empreendimento).filter(models.Empreendimento.nome == empreendimento_in.nome).first():
            raise HTTPException(status_code=400, detail="Este nome já está em uso por outro empreendimento.")

    empreendimento_db.codigo = empreendimento_in.codigo
    empreendimento_db.nome = empreendimento_in.nome
    empreendimento_db.descricao = empreendimento_in.descricao
    empreendimento_db.disponivel = empreendimento_in.disponivel

    db.commit()
    db.refresh(empreendimento_db)
    return empreendimento_db

@app.get("/usuarios/", response_model=list[schemas.UsuarioResponse])
def listar_usuarios(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    """Lista usuários da hierarquia (Admin vê todos, Gerente vê si e corretores)."""
    if current_user.papel == models.PapelUsuario.admin:
        return db.query(models.Usuario).all()
    elif current_user.papel == models.PapelUsuario.gerente:
        return db.query(models.Usuario).filter(
            (models.Usuario.id == current_user.id) | (models.Usuario.gerente_id == current_user.id)
        ).all()
    else:
        return [current_user]