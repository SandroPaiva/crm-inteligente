from sqlalchemy import text
from database import engine
import uuid

def migrate_empreendimentos():
    with engine.begin() as conn:
        try:
            # Add columns
            conn.execute(text('ALTER TABLE empreendimentos ADD COLUMN codigo VARCHAR(50);'))
            conn.execute(text('ALTER TABLE empreendimentos ADD COLUMN disponivel BOOLEAN DEFAULT TRUE;'))
            print("Added array columns.")
        except Exception as e:
            print("Columns might exist:", e)

        # Populate existing 'codigo' with random uuid substrings to avoid unique constraint violations
        empreendimentos = conn.execute(text('SELECT id FROM empreendimentos;')).fetchall()
        
        counter = 1
        for emp_row in empreendimentos:
            emp_id = emp_row[0]
            temp_code = f"EMP-{str(uuid.uuid4())[:8].upper()}"
            conn.execute(text("UPDATE empreendimentos SET codigo = :code, disponivel = TRUE WHERE id = :id"), {"code": temp_code, "id": emp_id})
            counter += 1
            
        print(f"Update finished! Updated {counter - 1} empreendimentos.")
        
        # Add constraints after populating
        try:
            conn.execute(text('ALTER TABLE empreendimentos ALTER COLUMN codigo SET NOT NULL;'))
            conn.execute(text('ALTER TABLE empreendimentos ADD CONSTRAINT unique_empreendimento_codigo UNIQUE (codigo);'))
            print("Added constraints.")
        except BaseException as e:
            print("Constraint might exist:", e)

if __name__ == "__main__":
    migrate_empreendimentos()
