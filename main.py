
# O fastapi é um framework web moderno e de alto desempenho para construir APIs com Python 3.6+ 
# baseado em padrões como OpenAPI e JSON Schema. Ele é projetado para ser fácil de usar, rápido e eficiente, 
# permitindo que os desenvolvedores criem APIs robustas e escaláveis com menos código.
from fastapi import FastAPI

# Inicializa a aplicação FastAPI
app = FastAPI(title="CRM Inteligente API", version="0.1.0")

@app.get("/")
def read_root():
    return {"mensagem": "API do CRM Inteligente está rodando!", "status": "online"}