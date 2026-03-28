"""
Routes package initialization
"""
from fastapi import APIRouter

from .auth import router as auth_router
from .clientes import router as clientes_router
from .produtos import router as produtos_router
from .pedidos import router as pedidos_router
from .producao import router as producao_router
from .embalagem import router as embalagem_router
from .estoque import router as estoque_router
from .vendas import router as vendas_router

# Create main API router
api_router = APIRouter(prefix="/api")

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(clientes_router)
api_router.include_router(produtos_router)
api_router.include_router(pedidos_router)
api_router.include_router(producao_router)
api_router.include_router(embalagem_router)
api_router.include_router(estoque_router)
api_router.include_router(vendas_router)
