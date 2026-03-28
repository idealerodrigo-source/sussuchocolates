"""
Insumos routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import Insumo, InsumoCreate

router = APIRouter(prefix="/insumos", tags=["insumos"])


@router.get("", response_model=List[Insumo])
async def listar_insumos(current_user: dict = Depends(get_current_user)):
    insumos = await db.insumos.find({}, {"_id": 0}).sort("nome", 1).to_list(1000)
    for i in insumos:
        if i.get('data_cadastro') and isinstance(i['data_cadastro'], str):
            i['data_cadastro'] = datetime.fromisoformat(i['data_cadastro'])
        elif not i.get('data_cadastro'):
            i['data_cadastro'] = datetime.now(timezone.utc)
    return insumos


@router.post("", response_model=Insumo)
async def criar_insumo(insumo_data: InsumoCreate, current_user: dict = Depends(get_current_user)):
    fornecedor_nome = None
    if insumo_data.fornecedor_id:
        fornecedor = await db.fornecedores.find_one({"id": insumo_data.fornecedor_id}, {"_id": 0})
        if fornecedor:
            fornecedor_nome = fornecedor['nome']
    
    insumo = Insumo(**insumo_data.model_dump(), fornecedor_nome=fornecedor_nome)
    doc = insumo.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.insumos.insert_one(doc)
    return insumo


@router.put("/{insumo_id}", response_model=Insumo)
async def atualizar_insumo(insumo_id: str, insumo_data: InsumoCreate, current_user: dict = Depends(get_current_user)):
    insumo = await db.insumos.find_one({"id": insumo_id}, {"_id": 0})
    if not insumo:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    
    fornecedor_nome = None
    if insumo_data.fornecedor_id:
        fornecedor = await db.fornecedores.find_one({"id": insumo_data.fornecedor_id}, {"_id": 0})
        if fornecedor:
            fornecedor_nome = fornecedor['nome']
    
    update_data = insumo_data.model_dump()
    update_data['fornecedor_nome'] = fornecedor_nome
    await db.insumos.update_one({"id": insumo_id}, {"$set": update_data})
    
    updated = await db.insumos.find_one({"id": insumo_id}, {"_id": 0})
    if updated.get('data_cadastro') and isinstance(updated['data_cadastro'], str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    elif not updated.get('data_cadastro'):
        updated['data_cadastro'] = datetime.now(timezone.utc)
    return updated


@router.delete("/{insumo_id}")
async def deletar_insumo(insumo_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.insumos.delete_one({"id": insumo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Insumo não encontrado")
    return {"message": "Insumo removido com sucesso"}
