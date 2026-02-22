# main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware # <-- IMPORTANTE: Adicione esta linha
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRM Inteligente API", version="0.1.0")

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

    # 2. Converte os dados recebidos (Pydantic) para o formato do Banco (SQLAlchemy)
    novo_lead = models.Lead(
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
  
  # ... (código anterior do main.py) ...

@app.get("/leads/", response_model=list[schemas.LeadResponse])
def listar_leads(db: Session = Depends(get_db)):
    """
    Retorna todos os leads cadastrados. Será usado para popular a Fila e o Kanban.
    """
    # Busca todos os leads no banco de dados
    leads = db.query(models.Lead).all()
    return leads


@app.patch("/leads/{lead_id}/status", response_model=schemas.LeadResponse)
def atualizar_status_lead(lead_id: str, lead_update: schemas.LeadUpdateStatus, db: Session = Depends(get_db)):
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
def buscar_lead_detalhes(lead_id: str, db: Session = Depends(get_db)):
    """
    Busca um lead específico e traz todo o histórico de interações dele.
    """
    lead_db = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead_db:
        raise HTTPException(status_code=404, detail="Lead não encontrado.")
    return lead_db


@app.post("/leads/{lead_id}/interacoes", response_model=schemas.InteracaoResponse, status_code=201)
def adicionar_interacao(lead_id: str, interacao_in: schemas.InteracaoCreate, db: Session = Depends(get_db)):
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