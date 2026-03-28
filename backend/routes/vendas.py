"""
Vendas routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import Venda, VendaCreate, CancelarVendaRequest, MovimentoEstoque, PedidoStatus, ItemPedido

router = APIRouter(prefix="/vendas", tags=["vendas"])


@router.post("", response_model=Venda)
async def criar_venda(venda_data: VendaCreate, current_user: dict = Depends(get_current_user)):
    if venda_data.tipo_venda == "pedido":
        if not venda_data.pedido_id:
            raise HTTPException(status_code=400, detail="pedido_id é obrigatório para vendas de pedido")
        
        pedido = await db.pedidos.find_one({"id": venda_data.pedido_id}, {"_id": 0})
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        venda = Venda(
            pedido_id=venda_data.pedido_id,
            cliente_id=pedido['cliente_id'],
            cliente_nome=pedido['cliente_nome'],
            items=[ItemPedido(**item) if isinstance(item, dict) else item for item in pedido['items']],
            valor_total=pedido['valor_total'],
            forma_pagamento=venda_data.forma_pagamento,
            tipo_venda="pedido",
            entrega_posterior=venda_data.entrega_posterior,
            status_pagamento=venda_data.status_pagamento,
            data_previsao_pagamento=venda_data.data_previsao_pagamento,
            observacoes_pagamento=venda_data.observacoes_pagamento
        )
        
        await db.pedidos.update_one(
            {"id": venda_data.pedido_id},
            {"$set": {"status": PedidoStatus.CONCLUIDO}}
        )
    else:
        if not venda_data.cliente_id or not venda_data.items:
            raise HTTPException(status_code=400, detail="cliente_id e items são obrigatórios para vendas diretas")
        
        cliente = await db.clientes.find_one({"id": venda_data.cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        valor_total = sum(item.subtotal for item in venda_data.items)
        
        venda = Venda(
            pedido_id=None,
            cliente_id=venda_data.cliente_id,
            cliente_nome=cliente['nome'],
            items=venda_data.items,
            valor_total=valor_total,
            forma_pagamento=venda_data.forma_pagamento,
            tipo_venda="direta",
            entrega_posterior=venda_data.entrega_posterior,
            status_pagamento=venda_data.status_pagamento,
            data_previsao_pagamento=venda_data.data_previsao_pagamento,
            observacoes_pagamento=venda_data.observacoes_pagamento
        )
    
    doc = venda.model_dump()
    doc['data_venda'] = doc['data_venda'].isoformat()
    if doc.get('data_pagamento'):
        doc['data_pagamento'] = doc['data_pagamento'].isoformat()
    await db.vendas.insert_one(doc)
    
    for item in venda.items:
        item_dict = item if isinstance(item, dict) else item.model_dump()
        await db.estoque.insert_one({
            "id": str(uuid.uuid4()),
            "produto_id": item_dict['produto_id'],
            "produto_nome": item_dict['produto_nome'],
            "quantidade": item_dict['quantidade'],
            "tipo_movimento": MovimentoEstoque.SAIDA,
            "data_movimento": datetime.now(timezone.utc).isoformat(),
            "responsavel": current_user['nome'],
            "observacoes": f"Venda {venda.tipo_venda} - ID: {venda.id}"
        })
    
    return venda


@router.get("", response_model=List[Venda])
async def listar_vendas(current_user: dict = Depends(get_current_user)):
    vendas = await db.vendas.find({}, {"_id": 0}).sort("data_venda", -1).to_list(1000)
    for v in vendas:
        if isinstance(v['data_venda'], str):
            v['data_venda'] = datetime.fromisoformat(v['data_venda'])
        if isinstance(v.get('data_pagamento'), str):
            v['data_pagamento'] = datetime.fromisoformat(v['data_pagamento'])
    return vendas


@router.put("/{venda_id}/confirmar-pagamento")
async def confirmar_pagamento_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get('status_pagamento') == 'pago':
        raise HTTPException(status_code=400, detail="Esta venda já está paga")
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "status_pagamento": "pago",
            "data_pagamento": datetime.now(timezone.utc).isoformat(),
            "entrega_posterior": False
        }}
    )
    
    return {"message": "Pagamento confirmado com sucesso"}


@router.put("/{venda_id}/restaurar")
async def restaurar_venda(venda_id: str, current_user: dict = Depends(get_current_user)):
    """Restaura uma venda cancelada"""
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get('status_venda') != 'cancelada':
        raise HTTPException(status_code=400, detail="Esta venda não está cancelada")
    
    # Restaurar a venda
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "status_venda": "ativa",
            "data_cancelamento": None,
            "motivo_cancelamento": None
        }}
    )
    
    # Remover os itens do estoque novamente (saída)
    for item in venda.get('items', []):
        produto_id = item.get('produto_id')
        produto_nome = item.get('produto_nome', 'Produto')
        quantidade = item.get('quantidade', 0)
        
        if produto_id and quantidade > 0:
            await db.estoque.insert_one({
                "id": str(uuid.uuid4()),
                "produto_id": produto_id,
                "produto_nome": produto_nome,
                "quantidade": quantidade,
                "tipo_movimento": MovimentoEstoque.SAIDA,
                "data_movimento": datetime.now(timezone.utc).isoformat(),
                "responsavel": current_user['nome'],
                "observacoes": f"Saída por restauração de venda - ID: {venda_id}"
            })
    
    return {"message": "Venda restaurada com sucesso."}


@router.put("/{venda_id}/cancelar")
async def cancelar_venda(venda_id: str, request: CancelarVendaRequest = None, current_user: dict = Depends(get_current_user)):
    """Cancela uma venda e devolve os itens ao estoque"""
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    if venda.get('status_venda') == 'cancelada':
        raise HTTPException(status_code=400, detail="Esta venda já está cancelada")
    
    if venda.get('nfce_emitida'):
        raise HTTPException(status_code=400, detail="Não é possível cancelar uma venda com NFC-e emitida. Cancele a NFC-e primeiro.")
    
    motivo = request.motivo if request else None
    
    await db.vendas.update_one(
        {"id": venda_id},
        {"$set": {
            "status_venda": "cancelada",
            "data_cancelamento": datetime.now(timezone.utc).isoformat(),
            "motivo_cancelamento": motivo
        }}
    )
    
    for item in venda.get('items', []):
        produto_id = item.get('produto_id')
        produto_nome = item.get('produto_nome', 'Produto')
        quantidade = item.get('quantidade', 0)
        
        if produto_id and quantidade > 0:
            await db.estoque.insert_one({
                "id": str(uuid.uuid4()),
                "produto_id": produto_id,
                "produto_nome": produto_nome,
                "quantidade": quantidade,
                "tipo_movimento": MovimentoEstoque.ENTRADA,
                "data_movimento": datetime.now(timezone.utc).isoformat(),
                "responsavel": current_user['nome'],
                "observacoes": f"Devolução por cancelamento de venda - ID: {venda_id}"
            })
    
    if venda.get('pedido_id'):
        await db.pedidos.update_one(
            {"id": venda['pedido_id']},
            {"$set": {"status": PedidoStatus.CONCLUIDO}}
        )
    
    return {"message": "Venda cancelada com sucesso. Itens devolvidos ao estoque."}
