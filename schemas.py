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
    
    # Recebendo qualquer estrutura JSON para UTMs
    utms: Optional[Dict[str, Any]] = None
    
    # Schema para DADOS DE SAÍDA (O que a API devolve para o Frontend)
class LeadResponse(BaseModel):
    id: UUID
    nome: str
    email_primario: EmailStr
    celular_primario: str
    status: models.StatusLead
    origem: Optional[str] = None
    interesse: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True
        
        # Schema para ATUALIZAR O STATUS (Quando arrastar no Kanban)
class LeadUpdateStatus(BaseModel):
    status: models.StatusLead = Field(..., description="Novo status do lead no funil")
    
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