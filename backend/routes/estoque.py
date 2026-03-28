"""
Estoque routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import Estoque, EstoqueCreate, MovimentoEstoque

router = APIRouter(prefix="/estoque", tags=["estoque"])


@router.post("", response_model=Estoque)
async def criar_movimento_estoque(estoque_data: EstoqueCreate, current_user: dict = Depends(get_current_user)):
    produto = await db.produtos.find_one({"id": estoque_data.produto_id}, {"_id": 0})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    estoque = Estoque(
        produto_id=estoque_data.produto_id,
        produto_nome=produto['nome'],
        quantidade=estoque_data.quantidade,
        tipo_movimento=estoque_data.tipo_movimento,
        responsavel=estoque_data.responsavel,
        observacoes=estoque_data.observacoes
    )
    
    doc = estoque.model_dump()
    doc['data_movimento'] = doc['data_movimento'].isoformat()
    await db.estoque.insert_one(doc)
    
    return estoque


@router.get("", response_model=List[Estoque])
async def listar_estoque(current_user: dict = Depends(get_current_user)):
    movimentos = await db.estoque.find({}, {"_id": 0}).sort("data_movimento", -1).to_list(1000)
    for m in movimentos:
        if isinstance(m['data_movimento'], str):
            m['data_movimento'] = datetime.fromisoformat(m['data_movimento'])
    return movimentos


@router.get("/saldo")
async def obter_saldo_estoque(current_user: dict = Depends(get_current_user)):
    movimentos = await db.estoque.find({}, {"_id": 0}).to_list(10000)
    
    saldos = {}
    for mov in movimentos:
        pid = mov['produto_id']
        if pid not in saldos:
            saldos[pid] = {
                "produto_id": pid,
                "produto_nome": mov['produto_nome'],
                "quantidade": 0,
                "localizacao": mov.get('localizacao')
            }
        
        if mov['tipo_movimento'] == MovimentoEstoque.ENTRADA or mov['tipo_movimento'] == 'entrada':
            saldos[pid]['quantidade'] += mov['quantidade']
            if mov.get('localizacao'):
                saldos[pid]['localizacao'] = mov.get('localizacao')
        elif mov['tipo_movimento'] == MovimentoEstoque.SAIDA or mov['tipo_movimento'] == 'saida':
            saldos[pid]['quantidade'] -= mov['quantidade']
        else:
            saldos[pid]['quantidade'] = mov['quantidade']
            if mov.get('localizacao'):
                saldos[pid]['localizacao'] = mov.get('localizacao')
    
    return list(saldos.values())
