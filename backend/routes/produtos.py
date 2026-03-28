"""
Produtos routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timezone

from database import db
from auth import get_current_user
from models import Produto, ProdutoCreate

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.post("", response_model=Produto)
async def criar_produto(produto: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    produto_doc = Produto(**produto.model_dump())
    doc = produto_doc.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.produtos.insert_one(doc)
    return produto_doc


@router.get("", response_model=List[Produto])
async def listar_produtos(current_user: dict = Depends(get_current_user)):
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    for p in produtos:
        if p.get('data_cadastro') and isinstance(p['data_cadastro'], str):
            p['data_cadastro'] = datetime.fromisoformat(p['data_cadastro'])
        elif not p.get('data_cadastro'):
            p['data_cadastro'] = datetime.now(timezone.utc)
    return produtos


@router.get("/{produto_id}", response_model=Produto)
async def obter_produto(produto_id: str, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if produto.get('data_cadastro') and isinstance(produto['data_cadastro'], str):
        produto['data_cadastro'] = datetime.fromisoformat(produto['data_cadastro'])
    elif not produto.get('data_cadastro'):
        produto['data_cadastro'] = datetime.now(timezone.utc)
    return produto


@router.put("/{produto_id}", response_model=Produto)
async def atualizar_produto(produto_id: str, produto_data: ProdutoCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    update_data = produto_data.model_dump()
    await db.produtos.update_one(
        {"id": produto_id},
        {"$set": update_data}
    )
    updated = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
    if updated.get('data_cadastro') and isinstance(updated['data_cadastro'], str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    elif not updated.get('data_cadastro'):
        updated['data_cadastro'] = datetime.now(timezone.utc)
    return updated


@router.delete("/{produto_id}")
async def deletar_produto(produto_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.produtos.delete_one({"id": produto_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto deletado com sucesso"}
