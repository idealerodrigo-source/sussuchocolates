"""
Fornecedores routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import Fornecedor, FornecedorCreate

router = APIRouter(prefix="/fornecedores", tags=["fornecedores"])


@router.get("", response_model=List[Fornecedor])
async def listar_fornecedores(current_user: dict = Depends(get_current_user)):
    fornecedores = await db.fornecedores.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    for f in fornecedores:
        if f.get('data_cadastro') and isinstance(f['data_cadastro'], str):
            f['data_cadastro'] = datetime.fromisoformat(f['data_cadastro'])
        elif not f.get('data_cadastro'):
            f['data_cadastro'] = datetime.now(timezone.utc)
    return fornecedores


@router.post("", response_model=Fornecedor)
async def criar_fornecedor(fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = Fornecedor(**fornecedor_data.model_dump())
    doc = fornecedor.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.fornecedores.insert_one(doc)
    return fornecedor


@router.put("/{fornecedor_id}", response_model=Fornecedor)
async def atualizar_fornecedor(fornecedor_id: str, fornecedor_data: FornecedorCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    update_data = fornecedor_data.model_dump()
    await db.fornecedores.update_one({"id": fornecedor_id}, {"$set": update_data})
    
    updated = await db.fornecedores.find_one({"id": fornecedor_id}, {"_id": 0})
    if updated.get('data_cadastro') and isinstance(updated['data_cadastro'], str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    elif not updated.get('data_cadastro'):
        updated['data_cadastro'] = datetime.now(timezone.utc)
    return updated


@router.delete("/{fornecedor_id}")
async def deletar_fornecedor(fornecedor_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.fornecedores.delete_one({"id": fornecedor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return {"message": "Fornecedor removido com sucesso"}
