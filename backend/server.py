"""
Sussu Chocolates - Backend API Server (Modular)
Sistema de gestão para fábrica de chocolates artesanais
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from database import client
from routes import api_router

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Criar aplicação FastAPI
app = FastAPI(
    title="Sussu Chocolates API",
    description="Sistema de gestão para fábrica de chocolates artesanais",
    version="2.0.0"
)

# Incluir rotas
app.include_router(api_router)

# Configurar CORS
cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if cors_origins_raw and cors_origins_raw != '*':
    cors_origins = cors_origins_raw.split(',')
else:
    cors_origins = [
        "https://www.sussuchocolates.com.br",
        "https://sussuchocolates.com.br",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Evento de shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
