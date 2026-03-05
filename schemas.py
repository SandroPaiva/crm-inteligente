# schemas.py
import models # Importamos para usar o Enum de status
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any

# O que esperamos receber do Webhook/Formulário
class LeadCreateWebhook(BaseModel):
    nome: str = Field(..., example="Maria Silva", description="Nome completo do Lead")
    email_primario: EmailStr = Field(..., example="maria@email.com")
    celular_primario: str = Field(..., example="11999999999")
    
    # Campos Opcionais
    origem: Optional[str] = "Landing Page Principal"
    interesse: Optional[str] = None
    genero: Optional[models.EnumGenero] = models.EnumGenero.outros
    
    # FKs Opcionais
    corretor_id: Optional[UUID] = None
    empreendimento_id: Optional[UUID] = None
    
    # Recebendo qualquer estrutura JSON para UTMs
    utms: Optional[Dict[str, Any]] = None
    
# --- SCHEMAS DE AUTENTICAÇÃO E USUÁRIOS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    papel: models.PapelUsuario = models.PapelUsuario.corretor
    gerente_id: Optional[UUID] = None

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioResponse(UsuarioBase):
    id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True

class UsuarioUpdateGerente(BaseModel):
    gerente_id: Optional[UUID] = None

    class Config:
        from_attributes = True

# --- SCHEMAS DE EMPREENDIMENTO ---
class EmpreendimentoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None

class EmpreendimentoCreate(EmpreendimentoBase):
    pass

class EmpreendimentoResponse(EmpreendimentoBase):
    id: UUID
    criado_em: datetime

    class Config:
        from_attributes = True

    # Schema para DADOS DE SAÍDA (O que a API devolve para o Frontend)
class LeadResponse(BaseModel):
    id: UUID
    nome: str
    email_primario: EmailStr
    celular_primario: str
    status: models.StatusLead
    origem: Optional[str] = None
    interesse: Optional[str] = None
    corretor_id: Optional[UUID] = None
    empreendimento_id: Optional[UUID] = None
    criado_em: datetime

    class Config:
        from_attributes = True
        
# Schema para ATUALIZAR O STATUS (Quando arrastar no Kanban)
class LeadUpdateStatus(BaseModel):
    status: models.StatusLead = Field(..., description="Novo status do lead no funil")

# Schema para Atualização Completa (PUT)
class LeadUpdate(BaseModel):
    nome: Optional[str] = None
    email_primario: Optional[EmailStr] = None
    email_secundario: Optional[EmailStr] = None
    celular_primario: Optional[str] = None
    celular_secundario: Optional[str] = None
    genero: Optional[models.EnumGenero] = None
    status: Optional[models.StatusLead] = None
    corretor_id: Optional[UUID] = None
    empreendimento_id: Optional[UUID] = None
    
    origem: Optional[str] = None
    interesse: Optional[str] = None
    
    endereco: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None

    
# O que o Frontend vai enviar para criar uma anotação/e-mail
class InteracaoCreate(BaseModel):
    tipo: str = Field(..., example="email", description="Tipo de interação (nota, email, ligacao)")
    conteudo: str = Field(..., example="Enviei a proposta comercial atualizada.")
    novo_status: models.StatusLead = Field(..., description="Obrigatório confirmar ou alterar o status do lead na interação")

# O que a API vai devolver para o Frontend mostrar no histórico
class InteracaoResponse(BaseModel):
    id: UUID
    tipo: str
    conteudo: str
    criado_em: datetime

    class Config:
        from_attributes = True

# Opcional, mas muito útil: Atualizar o LeadResponse para incluir o histórico
class LeadComHistoricoResponse(LeadResponse):
    interacoes: list[InteracaoResponse] = []
    tarefas: list['TarefaResponse'] = []
    contatos: list['ContatoResponse'] = []
    corretor: Optional[UsuarioResponse] = None
    empreendimento: Optional[EmpreendimentoResponse] = None

# --- SCHEMAS DE TAREFA ---

class TarefaCreate(BaseModel):
    titulo: str = Field(..., description="Título da Tarefa")
    descricao: Optional[str] = None
    data_vencimento: Optional[datetime] = None

class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[models.StatusTarefa] = None
    data_vencimento: Optional[datetime] = None

class TarefaResponse(BaseModel):
    id: UUID
    lead_id: UUID
    titulo: str
    descricao: Optional[str] = None
    status: models.StatusTarefa
    data_vencimento: Optional[datetime] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS DE CONTATO ---

class ContatoCreate(BaseModel):
    nome: str = Field(..., description="Nome do Contato")
    cargo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None

class ContatoResponse(BaseModel):
    id: UUID
    lead_id: UUID
    nome: str
    cargo: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True