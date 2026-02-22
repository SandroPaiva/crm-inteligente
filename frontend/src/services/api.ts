// frontend/src/services/api.ts
import axios from "axios";

// Criamos uma instância do axios apontando para o seu FastAPI
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 5000, // Se demorar mais de 5 segundos, cancela a requisição
});

export default api;
