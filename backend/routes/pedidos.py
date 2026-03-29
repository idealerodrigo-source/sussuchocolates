"""
Pedidos routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import Pedido, PedidoCreate, PedidoUpdate, PedidoStatus, ItemPedido

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.post("", response_model=Pedido)
async def criar_pedido(pedido_data: PedidoCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    valor_total = sum(item.subtotal for item in pedido_data.items)
    
    count = await db.pedidos.count_documents({})
    numero_pedido = f"PED-{count + 1:06d}"
    
    pedido = Pedido(
        numero=numero_pedido,
        cliente_id=pedido_data.cliente_id,
        cliente_nome=cliente['nome'],
        cliente_telefone=cliente.get('telefone'),
        items=pedido_data.items,
        valor_total=valor_total,
        forma_pagamento=pedido_data.forma_pagamento,
        observacoes=pedido_data.observacoes,
        data_entrega=datetime.fromisoformat(pedido_data.data_entrega) if pedido_data.data_entrega else None
    )
    
    doc = pedido.model_dump()
    doc['data_pedido'] = doc['data_pedido'].isoformat()
    if doc.get('data_entrega'):
        doc['data_entrega'] = doc['data_entrega'].isoformat()
    await db.pedidos.insert_one(doc)
    return pedido


@router.get("", response_model=List[Pedido])
async def listar_pedidos(current_user: dict = Depends(get_current_user)):
    pedidos = await db.pedidos.find({}, {"_id": 0}).sort("data_pedido", -1).to_list(1000)
    for p in pedidos:
        if isinstance(p['data_pedido'], str):
            p['data_pedido'] = datetime.fromisoformat(p['data_pedido'])
        if p.get('data_entrega') and isinstance(p['data_entrega'], str):
            p['data_entrega'] = datetime.fromisoformat(p['data_entrega'])
    return pedidos


@router.get("/{pedido_id}", response_model=Pedido)
async def obter_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if isinstance(pedido['data_pedido'], str):
        pedido['data_pedido'] = datetime.fromisoformat(pedido['data_pedido'])
    if pedido.get('data_entrega') and isinstance(pedido['data_entrega'], str):
        pedido['data_entrega'] = datetime.fromisoformat(pedido['data_entrega'])
    return pedido


@router.patch("/{pedido_id}/status")
async def atualizar_status_pedido(pedido_id: str, status: PedidoStatus, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {"status": status}
    if status == PedidoStatus.ENTREGUE:
        update_data["data_entrega"] = datetime.now(timezone.utc).isoformat()
    
    await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    return {"message": "Status atualizado com sucesso"}


@router.put("/{pedido_id}", response_model=Pedido)
async def atualizar_pedido(pedido_id: str, pedido_data: PedidoUpdate, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {}
    
    if pedido_data.cliente_id:
        cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        update_data["cliente_id"] = pedido_data.cliente_id
        update_data["cliente_nome"] = cliente['nome']
    
    if pedido_data.items is not None:
        items_dict = [item.model_dump() for item in pedido_data.items]
        update_data["items"] = items_dict
        update_data["valor_total"] = sum(item.subtotal for item in pedido_data.items)
    
    if pedido_data.observacoes is not None:
        update_data["observacoes"] = pedido_data.observacoes
    
    if pedido_data.data_entrega is not None:
        update_data["data_entrega"] = pedido_data.data_entrega if pedido_data.data_entrega else None
    
    if update_data:
        await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    
    updated = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if isinstance(updated['data_pedido'], str):
        updated['data_pedido'] = datetime.fromisoformat(updated['data_pedido'])
    if updated.get('data_entrega') and isinstance(updated['data_entrega'], str):
        updated['data_entrega'] = datetime.fromisoformat(updated['data_entrega'])
    return updated
