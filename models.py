import uuid
# 1. Adicionamos o 'timezone' na importação
from datetime import datetime, timezone 
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship # <-- Importante!
from sqlalchemy.dialects.postgresql import UUID, JSONB
from database import Base
import enum

class StatusLead(str, enum.Enum):
    novo = "novo"
    em_atendimento = "em_atendimento"
    proposta = "proposta"
    ganho = "ganho"
    perdido = "perdido"
    

# 2. Criamos uma função auxiliar para gerar a data/hora atual em UTC
def get_utc_now():
    return datetime.now(timezone.utc)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    status = Column(Enum(StatusLead), default=StatusLead.novo, index=True)
    
    nome = Column(String(100), nullable=False)
    email_primario = Column(String(150), unique=True, index=True, nullable=False)
    email_secundario = Column(String(150), nullable=True)
    celular_primario = Column(String(20), nullable=False)
    celular_secundario = Column(String(20), nullable=True)
    
    endereco = Column(String(255), nullable=True)
    cep = Column(String(20), nullable=True)
    cidade = Column(String(100), nullable=True)
    estado = Column(String(2), nullable=True)
    
    origem = Column(String(100), nullable=True)
    interesse = Column(Text, nullable=True)
    
    utms = Column(JSONB, nullable=True) 
    
    permite_contato_email = Column(Boolean, default=True)
    permite_contato_ligacao = Column(Boolean, default=True)
    permite_contato_whatsapp = Column(Boolean, default=True)
    
    # 3. Atualizamos as colunas usando a nova função e timezone=True
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)
    atualizado_em = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
    
    # Isso diz ao SQLAlchemy que um Lead tem uma lista de "interacoes"
    interacoes = relationship("Interacao", back_populates="lead", cascade="all, delete-orphan")
    
class Interacao(Base):
    __tablename__ = "interacoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # A "Chave Estrangeira" que liga esta anotação ao Lead correto
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    
    # Pode ser: 'nota', 'email_enviado', 'ligacao'
    tipo = Column(String(50), nullable=False) 
    
    # O texto do e-mail ou da nota
    conteudo = Column(Text, nullable=False) 
    
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)

    # Diz ao SQLAlchemy a quem essa interação pertence
    lead = relationship("Lead", back_populates="interacoes")