"""
Embalagem routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import Embalagem, EmbalagemCreate, ConcluirEmbalagemRequest, MovimentoEstoque, PedidoStatus

router = APIRouter(prefix="/embalagem", tags=["embalagem"])


@router.post("", response_model=Embalagem)
async def criar_embalagem(embalagem_data: EmbalagemCreate, current_user: dict = Depends(get_current_user)):
    producao = await db.producao.find_one({"id": embalagem_data.producao_id}, {"_id": 0})
    if not producao:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    
    embalagem = Embalagem(
        producao_id=embalagem_data.producao_id,
        pedido_id=embalagem_data.pedido_id,
        produto_nome=producao['produto_nome'],
        quantidade=embalagem_data.quantidade,
        responsavel=embalagem_data.responsavel,
        tipo_embalagem=embalagem_data.tipo_embalagem
    )
    
    doc = embalagem.model_dump()
    if doc.get('data_inicio'):
        doc['data_inicio'] = doc['data_inicio'].isoformat()
    await db.embalagem.insert_one(doc)
    
    await db.pedidos.update_one(
        {"id": embalagem_data.pedido_id},
        {"$set": {"status": PedidoStatus.EM_EMBALAGEM}}
    )
    
    return embalagem


@router.get("", response_model=List[Embalagem])
async def listar_embalagem(current_user: dict = Depends(get_current_user)):
    embalagens = await db.embalagem.find({}, {"_id": 0}).sort("data_inicio", -1).to_list(1000)
    for e in embalagens:
        if isinstance(e.get('data_inicio'), str):
            e['data_inicio'] = datetime.fromisoformat(e['data_inicio'])
        if e.get('data_conclusao') and isinstance(e['data_conclusao'], str):
            e['data_conclusao'] = datetime.fromisoformat(e['data_conclusao'])
        if 'data_embalagem' in e and 'data_inicio' not in e:
            e['data_inicio'] = datetime.fromisoformat(e['data_embalagem']) if isinstance(e['data_embalagem'], str) else e['data_embalagem']
        
        if not e.get('pedido_numero') and e.get('pedido_id'):
            pedido = await db.pedidos.find_one({"id": e['pedido_id']}, {"_id": 0})
            if pedido:
                e['pedido_numero'] = pedido.get('numero')
                e['cliente_nome'] = pedido.get('cliente_nome')
        elif not e.get('pedido_numero') and e.get('producao_id'):
            producao = await db.producao.find_one({"id": e['producao_id']}, {"_id": 0})
            if producao:
                e['pedido_numero'] = producao.get('pedido_numero')
                if producao.get('pedido_id'):
                    pedido = await db.pedidos.find_one({"id": producao['pedido_id']}, {"_id": 0})
                    if pedido:
                        e['cliente_nome'] = pedido.get('cliente_nome')
    return embalagens


@router.patch("/{embalagem_id}/concluir")
async def concluir_embalagem(embalagem_id: str, request: ConcluirEmbalagemRequest = None, current_user: dict = Depends(get_current_user)):
    embalagem = await db.embalagem.find_one({"id": embalagem_id}, {"_id": 0})
    if not embalagem:
        raise HTTPException(status_code=404, detail="Embalagem não encontrada")
    
    if embalagem.get('data_conclusao'):
        raise HTTPException(status_code=400, detail="Embalagem já foi concluída")
    
    localizacao = request.localizacao if request else None
    responsavel_conclusao = request.responsavel if request else None
    
    update_data = {
        "data_conclusao": datetime.now(timezone.utc).isoformat()
    }
    if responsavel_conclusao:
        update_data["responsavel_conclusao"] = responsavel_conclusao
    
    await db.embalagem.update_one(
        {"id": embalagem_id},
        {"$set": update_data}
    )
    
    producao = await db.producao.find_one({"id": embalagem['producao_id']}, {"_id": 0})
    
    estoque = {
        "id": str(uuid.uuid4()),
        "produto_id": producao['produto_id'],
        "produto_nome": embalagem['produto_nome'],
        "quantidade": embalagem['quantidade'],
        "tipo_movimento": MovimentoEstoque.ENTRADA,
        "data_movimento": datetime.now(timezone.utc).isoformat(),
        "responsavel": responsavel_conclusao or embalagem.get('responsavel') or current_user['nome'],
        "observacoes": f"Entrada automática - Embalagem concluída (Produção: {producao['pedido_numero']})",
        "localizacao": localizacao
    }
    await db.estoque.insert_one(estoque)
    
    return {"message": "Embalagem concluída e produto adicionado ao estoque com sucesso"}
