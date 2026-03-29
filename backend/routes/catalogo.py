"""
Catálogo público routes - sem autenticação
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime, timezone

from database import db

router = APIRouter(prefix="/catalogo", tags=["catalogo"])


@router.get("/produtos")
async def listar_produtos_catalogo(categoria: Optional[str] = None):
    """Lista produtos disponíveis para o catálogo público"""
    query = {"ativo": {"$ne": False}}  # Apenas produtos ativos
    
    if categoria:
        query["categoria"] = categoria
    
    produtos = await db.produtos.find(query, {"_id": 0}).to_list(500)
    
    # Processar dados
    for p in produtos:
        if p.get('data_cadastro') and isinstance(p['data_cadastro'], str):
            p['data_cadastro'] = datetime.fromisoformat(p['data_cadastro'])
        elif not p.get('data_cadastro'):
            p['data_cadastro'] = datetime.now(timezone.utc)
    
    return produtos


@router.get("/categorias")
async def listar_categorias():
    """Lista categorias de produtos disponíveis"""
    categorias = await db.produtos.distinct("categoria", {"ativo": {"$ne": False}})
    return [c for c in categorias if c]  # Remove None/vazios


@router.get("/empresa")
async def obter_dados_empresa():
    """Retorna dados públicos da empresa para o catálogo"""
    empresa = await db.empresa.find_one({}, {"_id": 0})
    if not empresa:
        return {
            "nome_fantasia": "Sussu Chocolates",
            "telefone": "",
            "whatsapp": "",
            "endereco": "",
            "logo": None
        }
    
    # Montar endereço completo
    endereco_parts = [
        empresa.get("endereco", ""),
        empresa.get("numero", ""),
    ]
    if empresa.get("complemento"):
        endereco_parts.append(empresa.get("complemento"))
    endereco_parts.extend([
        empresa.get("bairro", ""),
        f"{empresa.get('cidade', '')}/{empresa.get('estado', '')}"
    ])
    endereco_completo = ", ".join([p for p in endereco_parts if p])
    
    return {
        "nome_fantasia": empresa.get("nome", "Sussu Chocolates"),
        "telefone": empresa.get("telefone", ""),
        "whatsapp": empresa.get("whatsapp") or empresa.get("telefone", ""),
        "endereco": endereco_completo,
        "logo": empresa.get("logo")
    }
