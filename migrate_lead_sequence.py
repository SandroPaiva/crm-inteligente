from sqlalchemy import text
from database import engine

def migrate_sequence():
    with engine.begin() as conn:
        try:
            # Add column if not exists
            conn.execute(text('ALTER TABLE leads ADD COLUMN numero_sequencial INTEGER;'))
            print("Added array column.")
        except Exception as e:
            print("Column might exist:", e)

        # Let's populate the numbering based on created_at or id
        # First check if there's any null values to fix
        leads = conn.execute(text('SELECT id FROM leads ORDER BY criado_em ASC;')).fetchall()
        
        counter = 1
        for lead_row in leads:
            lead_id = lead_row[0]
            conn.execute(text("UPDATE leads SET numero_sequencial = :num WHERE id = :id"), {"num": counter, "id": lead_id})
            counter += 1
            
        print(f"Update finished! Updated {counter - 1} leads.")
        
        # Finally array unique constraint (ignoring errors if exists)
        try:
            conn.execute(text('ALTER TABLE leads ADD CONSTRAINT unique_numero_sequencial UNIQUE (numero_sequencial);'))
            print("Added unique constraint.")
        except BaseException:
            pass

if __name__ == "__main__":
    migrate_sequence()
