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
from .nfce import router as nfce_router
from .relatorios import router as relatorios_router
from .fornecedores import router as fornecedores_router
from .insumos import router as insumos_router
from .compras import router as compras_router
from .dashboard import router as dashboard_router
from .nf_entrada import router as nf_entrada_router

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
api_router.include_router(nfce_router)
api_router.include_router(relatorios_router)
api_router.include_router(fornecedores_router)
api_router.include_router(insumos_router)
api_router.include_router(compras_router)
api_router.include_router(dashboard_router)
api_router.include_router(nf_entrada_router)
