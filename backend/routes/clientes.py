"""
Clientes routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone, timezone

from database import db
from auth import get_current_user
from models import Cliente, ClienteCreate

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.post("", response_model=Cliente)
async def criar_cliente(cliente: ClienteCreate, current_user: dict = Depends(get_current_user)):
    cliente_doc = Cliente(**cliente.model_dump())
    doc = cliente_doc.model_dump()
    doc['data_cadastro'] = doc['data_cadastro'].isoformat()
    await db.clientes.insert_one(doc)
    return cliente_doc


@router.get("", response_model=List[Cliente])
async def listar_clientes(current_user: dict = Depends(get_current_user)):
    clientes = await db.clientes.find({}, {"_id": 0}).to_list(1000)
    for c in clientes:
        if c.get('data_cadastro') and isinstance(c['data_cadastro'], str):
            c['data_cadastro'] = datetime.fromisoformat(c['data_cadastro'])
        elif not c.get('data_cadastro'):
            c['data_cadastro'] = datetime.now(timezone.utc)
    return clientes


@router.get("/{cliente_id}", response_model=Cliente)
async def obter_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    if cliente.get('data_cadastro') and isinstance(cliente['data_cadastro'], str):
        cliente['data_cadastro'] = datetime.fromisoformat(cliente['data_cadastro'])
    elif not cliente.get('data_cadastro'):
        cliente['data_cadastro'] = datetime.now(timezone.utc)
    return cliente


@router.put("/{cliente_id}", response_model=Cliente)
async def atualizar_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    update_data = cliente_data.model_dump()
    await db.clientes.update_one(
        {"id": cliente_id},
        {"$set": update_data}
    )
    updated = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
    if updated.get('data_cadastro') and isinstance(updated['data_cadastro'], str):
        updated['data_cadastro'] = datetime.fromisoformat(updated['data_cadastro'])
    elif not updated.get('data_cadastro'):
        updated['data_cadastro'] = datetime.now(timezone.utc)
    return updated


@router.delete("/{cliente_id}")
async def deletar_cliente(cliente_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clientes.delete_one({"id": cliente_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return {"message": "Cliente deletado com sucesso"}
