#!/usr/bin/env python3
"""
migrate_phone_format.py
─────────────────────────────────────────────────────────────────────────────
Normaliza os números de telefone/celular existentes no banco de dados para o
formato padrão: +55 (DDD) XXXXX-XXXX

Regras:
  - Números com 11 dígitos sem DDI (ex: 11999998888) → +55 (11) 99999-8888
  - Números com 13 dígitos com DDI 55 (ex: 5511999998888) → +55 (11) 99999-8888
  - Números com 10 dígitos (ex: 1199998888) → +55 (11) 9999-8888
  - Qualquer formato já com + ou parênteses é re-parseado e re-formatado

Tabelas afetadas:
  - leads.celular_primario
  - contatos.telefone  (tabela de contatos secundários de um lead)

Uso:
  cd /home/sandropaiva/Documentos/crm-inteligente
  source venv/bin/activate
  python migrate_phone_format.py [--dry-run]
"""

import re
import sys
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def digits_only(s: str) -> str:
    return re.sub(r'\D', '', s or '')

def normalize_phone(raw: str) -> str:
    """Normaliza qualquer string de telefone para +DDI (DDD) XXXXX-XXXX."""
    if not raw or not raw.strip():
        return raw

    digits = digits_only(raw)
    if not digits:
        return raw  # não tem dígito, mantém original

    ddi = '55'
    ddd = ''
    num = ''

    if digits.startswith('55') and len(digits) >= 12:
        # Tem DDI 55 incluso
        ddi = '55'
        rest = digits[2:]
        ddd = rest[:2]
        num = rest[2:]
    elif len(digits) == 11:
        # DDD de 2 dígitos + 9 dígitos de celular (sem DDI)
        ddd = digits[:2]
        num = digits[2:]
    elif len(digits) == 10:
        # DDD de 2 dígitos + 8 dígitos de fixo (sem DDI)
        ddd = digits[:2]
        num = digits[2:]
    else:
        # Formato desconhecido — retorna o original
        return raw

    # Formata o número
    if len(num) == 9:
        formatted_num = f'{num[:5]}-{num[5:]}'
    elif len(num) == 8:
        formatted_num = f'{num[:4]}-{num[4:]}'
    else:
        formatted_num = num

    return f'+{ddi} ({ddd}) {formatted_num}'

def run(dry_run: bool = False):
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    total_leads = 0
    total_contatos = 0

    with engine.connect() as conn:
        # ── Leads: celular_primario ──────────────────────────────────────────
        rows = conn.execute(text("SELECT id, celular_primario FROM leads WHERE celular_primario IS NOT NULL AND celular_primario != ''")).fetchall()
        for row in rows:
            lead_id, current = row[0], row[1]
            normalized = normalize_phone(current)
            if normalized != current:
                print(f"  [Lead] {lead_id}: '{current}' → '{normalized}'")
                if not dry_run:
                    conn.execute(text("UPDATE leads SET celular_primario = :v WHERE id = :id"), {'v': normalized, 'id': lead_id})
                total_leads += 1

        # ── Contatos: telefone ───────────────────────────────────────────────
        try:
            rows = conn.execute(text("SELECT id, telefone FROM contatos WHERE telefone IS NOT NULL AND telefone != ''")).fetchall()
            for row in rows:
                c_id, current = row[0], row[1]
                normalized = normalize_phone(current)
                if normalized != current:
                    print(f"  [Contato] {c_id}: '{current}' → '{normalized}'")
                    if not dry_run:
                        conn.execute(text("UPDATE contatos SET telefone = :v WHERE id = :id"), {'v': normalized, 'id': c_id})
                    total_contatos += 1
        except Exception as e:
            print(f"  [Aviso] Tabela 'contatos' não encontrada ou sem coluna 'telefone': {e}")

        if not dry_run:
            conn.commit()

    mode = '(DRY RUN — nenhuma alteração salva)' if dry_run else '(alterações salvas)'
    print(f"\n✅ Migração concluída {mode}")
    print(f"   Leads atualizados:    {total_leads}")
    print(f"   Contatos atualizados: {total_contatos}")

if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        print("🔍 Modo DRY RUN — nenhuma mudança será salva.\n")
    else:
        print("⚡ Executando migração de telefones...\n")
    run(dry_run=dry_run)
