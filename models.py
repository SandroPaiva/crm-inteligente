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
    negociacao = "negociacao"
    ganho = "ganho"
    perdido = "perdido"

class StatusTarefa(str, enum.Enum):
    pendente = "pendente"
    concluida = "concluida"
    
class EnumGenero(str, enum.Enum):
    masculino = "masculino"
    feminino = "feminino"
    outros = "outros"

class PapelUsuario(str, enum.Enum):
    admin = "admin"
    gerente = "gerente"
    corretor = "corretor"

# 2. Criamos uma função auxiliar para gerar a data/hora atual em UTC
def get_utc_now():
    return datetime.now(timezone.utc)

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    papel = Column(Enum(PapelUsuario), default=PapelUsuario.corretor, nullable=False)
    
    # Auto-relacionamento: Um corretor tem um gerente, que também é um usuário
    gerente_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)

    # Relacionamentos Mapeados
    gerente = relationship("Usuario", remote_side=[id], backref="subordinados")
    leads_atendidos = relationship("Lead", back_populates="corretor")

class Empreendimento(Base):
    __tablename__ = "empreendimentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    nome = Column(String(150), nullable=False, unique=True)
    descricao = Column(Text, nullable=True)
    
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)

    leads = relationship("Lead", back_populates="empreendimento")
def get_utc_now():
    return datetime.now(timezone.utc)

class Lead(Base):
    __tablename__ = "leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    status = Column(Enum(StatusLead), default=StatusLead.novo, index=True)
    genero = Column(String(20), nullable=True)
    
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
    
    # Relacionamentos com Usuários e Empreendimentos
    corretor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)
    empreendimento_id = Column(UUID(as_uuid=True), ForeignKey("empreendimentos.id"), nullable=True)

    # 3. Atualizamos as colunas usando a nova função e timezone=True
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)
    atualizado_em = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)
    
    # Isso diz ao SQLAlchemy que um Lead tem listas
    interacoes = relationship("Interacao", back_populates="lead", cascade="all, delete-orphan")
    tarefas = relationship("Tarefa", back_populates="lead", cascade="all, delete-orphan")
    contatos = relationship("Contato", back_populates="lead", cascade="all, delete-orphan")

    corretor = relationship("Usuario", back_populates="leads_atendidos")
    empreendimento = relationship("Empreendimento", back_populates="leads")
    
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

class Tarefa(Base):
    __tablename__ = "tarefas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    
    titulo = Column(String(255), nullable=False)
    descricao = Column(Text, nullable=True)
    status = Column(Enum(StatusTarefa), default=StatusTarefa.pendente, index=True)
    data_vencimento = Column(DateTime(timezone=True), nullable=True)
    
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)
    atualizado_em = Column(DateTime(timezone=True), default=get_utc_now, onupdate=get_utc_now)

    lead = relationship("Lead", back_populates="tarefas")

class Contato(Base):
    __tablename__ = "contatos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=False)
    
    nome = Column(String(100), nullable=False)
    cargo = Column(String(100), nullable=True)
    email = Column(String(150), nullable=True)
    telefone = Column(String(20), nullable=True)
    
    criado_em = Column(DateTime(timezone=True), default=get_utc_now)

    lead = relationship("Lead", back_populates="contatos")