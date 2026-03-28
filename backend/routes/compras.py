"""
Compras routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import Compra, CompraCreate, StatusCompra

router = APIRouter(prefix="/compras", tags=["compras"])


@router.get("", response_model=List[Compra])
async def listar_compras(current_user: dict = Depends(get_current_user)):
    compras = await db.compras.find({}, {"_id": 0}).sort("data_pedido", -1).to_list(1000)
    for c in compras:
        if isinstance(c.get('data_pedido'), str):
            c['data_pedido'] = datetime.fromisoformat(c['data_pedido'])
        if c.get('data_entrega_prevista') and isinstance(c['data_entrega_prevista'], str):
            c['data_entrega_prevista'] = datetime.fromisoformat(c['data_entrega_prevista'])
        if c.get('data_recebimento') and isinstance(c['data_recebimento'], str):
            c['data_recebimento'] = datetime.fromisoformat(c['data_recebimento'])
    return compras


@router.post("", response_model=Compra)
async def criar_compra(compra_data: CompraCreate, current_user: dict = Depends(get_current_user)):
    fornecedor = await db.fornecedores.find_one({"id": compra_data.fornecedor_id}, {"_id": 0})
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    
    count = await db.compras.count_documents({})
    numero = f"CMP-{count + 1:06d}"
    
    valor_total = sum(item.subtotal for item in compra_data.items)
    
    compra = Compra(
        numero=numero,
        fornecedor_id=compra_data.fornecedor_id,
        fornecedor_nome=fornecedor['nome'],
        items=compra_data.items,
        valor_total=valor_total,
        observacoes=compra_data.observacoes
    )
    
    if compra_data.data_entrega_prevista:
        compra.data_entrega_prevista = datetime.fromisoformat(compra_data.data_entrega_prevista)
    
    doc = compra.model_dump()
    doc['data_pedido'] = doc['data_pedido'].isoformat()
    if doc.get('data_entrega_prevista'):
        doc['data_entrega_prevista'] = doc['data_entrega_prevista'].isoformat()
    
    await db.compras.insert_one(doc)
    return compra


@router.patch("/{compra_id}/status")
async def atualizar_status_compra(compra_id: str, status: StatusCompra, current_user: dict = Depends(get_current_user)):
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    
    update_data = {"status": status}
    
    if status == StatusCompra.RECEBIDA:
        update_data["data_recebimento"] = datetime.now(timezone.utc).isoformat()
        
        for item in compra['items']:
            await db.insumos.update_one(
                {"id": item['insumo_id']},
                {"$inc": {"estoque_atual": item['quantidade']}}
            )
    
    await db.compras.update_one({"id": compra_id}, {"$set": update_data})
    return {"message": f"Status da compra atualizado para {status}"}


@router.delete("/{compra_id}")
async def deletar_compra(compra_id: str, current_user: dict = Depends(get_current_user)):
    compra = await db.compras.find_one({"id": compra_id}, {"_id": 0})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    
    if compra['status'] == StatusCompra.RECEBIDA:
        raise HTTPException(status_code=400, detail="Não é possível excluir uma compra já recebida")
    
    await db.compras.delete_one({"id": compra_id})
    return {"message": "Compra removida com sucesso"}
