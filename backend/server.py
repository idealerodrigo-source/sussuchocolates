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

# Configurar CORS — deve vir ANTES de include_router
cors_origins_raw = os.environ.get('CORS_ORIGINS', '')
if cors_origins_raw and cors_origins_raw.strip() not in ('', '*'):
    cors_origins = [o.strip() for o in cors_origins_raw.split(',') if o.strip()]
else:
    cors_origins = [
        "https://www.sussuchocolates.com.br",
        "https://sussuchocolates.com.br",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Middleware extra para garantir que OPTIONS preflight retorna 200
from fastapi import Request
from fastapi.responses import Response as FastAPIResponse

@app.middleware("http")
async def preflight_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        origin = request.headers.get("origin", "")
        if not origin or origin in cors_origins:
            return FastAPIResponse(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin or "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                    "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-Requested-With",
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Max-Age": "3600",
                }
            )
    return await call_next(request)

# Incluir rotas
app.include_router(api_router)

# Evento de shutdown
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}
