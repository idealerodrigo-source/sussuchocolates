"""
Producao routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import Producao, ProducaoCreate, PedidoStatus

router = APIRouter(prefix="/producao", tags=["producao"])


@router.post("", response_model=Producao)
async def criar_producao(producao_data: ProducaoCreate, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": producao_data.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    pedido_numero = None
    pedido_id = None
    tipo_producao = "estoque"
    
    if producao_data.pedido_id:
        pedido = await db.pedidos.find_one({"id": producao_data.pedido_id}, {"_id": 0})
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        pedido_numero = pedido['numero']
        pedido_id = producao_data.pedido_id
        tipo_producao = "pedido"
        
        await db.pedidos.update_one(
            {"id": producao_data.pedido_id},
            {"$set": {"status": PedidoStatus.EM_PRODUCAO}}
        )
    else:
        count = await db.producao.count_documents({"tipo_producao": "estoque"})
        pedido_numero = f"EST-{count + 1:06d}"
    
    # Preparar sabores para salvar
    sabores_data = None
    if producao_data.sabores:
        sabores_data = [s.model_dump() for s in producao_data.sabores]
    
    producao = Producao(
        pedido_id=pedido_id,
        pedido_numero=pedido_numero,
        produto_id=producao_data.produto_id,
        produto_nome=produto['nome'],
        quantidade=producao_data.quantidade,
        sabores=producao_data.sabores,
        responsavel=producao_data.responsavel,
        observacoes=producao_data.observacoes,
        tipo_producao=tipo_producao
    )
    
    doc = producao.model_dump()
    doc['data_inicio'] = doc['data_inicio'].isoformat()
    await db.producao.insert_one(doc)
    
    return producao


@router.get("", response_model=List[Producao])
async def listar_producao(current_user: dict = Depends(get_current_user)):
    producoes = await db.producao.find({}, {"_id": 0}).sort("data_inicio", -1).to_list(1000)
    for p in producoes:
        if isinstance(p['data_inicio'], str):
            p['data_inicio'] = datetime.fromisoformat(p['data_inicio'])
        if p.get('data_conclusao') and isinstance(p['data_conclusao'], str):
            p['data_conclusao'] = datetime.fromisoformat(p['data_conclusao'])
    return producoes


@router.patch("/{producao_id}/concluir")
async def concluir_producao(producao_id: str, current_user: dict = Depends(get_current_user)):
    producao = await db.producao.find_one({"id": producao_id}, {"_id": 0})
    if not producao:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    
    await db.producao.update_one(
        {"id": producao_id},
        {"$set": {"data_conclusao": datetime.now(timezone.utc).isoformat()}}
    )
    
    pedido_numero = None
    cliente_nome = None
    if producao.get('pedido_id'):
        pedido = await db.pedidos.find_one({"id": producao['pedido_id']}, {"_id": 0})
        if pedido:
            pedido_numero = pedido.get('numero')
            cliente_nome = pedido.get('cliente_nome')
    
    embalagem = {
        "id": str(uuid.uuid4()),
        "producao_id": producao_id,
        "pedido_id": producao.get('pedido_id'),
        "pedido_numero": pedido_numero or producao.get('pedido_numero'),
        "cliente_nome": cliente_nome,
        "produto_nome": producao['produto_nome'],
        "quantidade": producao['quantidade'],
        "data_inicio": datetime.now(timezone.utc).isoformat(),
        "data_conclusao": None,
        "responsavel": producao.get('responsavel'),
        "tipo_embalagem": None
    }
    await db.embalagem.insert_one(embalagem)
    
    if producao.get('pedido_id'):
        await db.pedidos.update_one(
            {"id": producao['pedido_id']},
            {"$set": {"status": PedidoStatus.EM_EMBALAGEM}}
        )
    
    return {"message": "Produção concluída e enviada para embalagem"}
