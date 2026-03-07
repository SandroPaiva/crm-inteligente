import sqlite3

def add_col_numero():
    conn = sqlite3.connect('crm_database.db')
    cursor = conn.cursor()
    try:
        cursor.execute('ALTER TABLE leads ADD COLUMN numero_sequencial INTEGER UNIQUE;')
        print("Column numero_sequencial added successfully.")
    except Exception as e:
        print(f"Error (column might already exist): {e}")
        
    try:
        # Povoando sequencia para leads existentes (iniciando em 1)
        cursor.execute('SELECT id FROM leads ORDER BY criado_em ASC;')
        leads = cursor.fetchall()
        for i, lead in enumerate(leads, start=1):
            cursor.execute('UPDATE leads SET numero_sequencial = ? WHERE id = ?;', (i, lead[0]))
        print(f"Populated numero_sequencial for {len(leads)} existing leads.")
            
        conn.commit()
    except Exception as e:
        print(f"Error populating: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_col_numero()
