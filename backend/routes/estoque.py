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


@router.get("/alertas")
async def obter_alertas_estoque(current_user: dict = Depends(get_current_user)):
    """Retorna produtos com estoque abaixo do mínimo"""
    # Obter todos os produtos com estoque mínimo definido
    produtos = await db.produtos.find({"estoque_minimo": {"$gt": 0}}, {"_id": 0}).to_list(1000)
    
    # Obter saldos atuais
    movimentos = await db.estoque.find({}, {"_id": 0}).to_list(10000)
    
    saldos = {}
    for mov in movimentos:
        pid = mov['produto_id']
        if pid not in saldos:
            saldos[pid] = 0
        
        if mov['tipo_movimento'] == MovimentoEstoque.ENTRADA or mov['tipo_movimento'] == 'entrada':
            saldos[pid] += mov['quantidade']
        elif mov['tipo_movimento'] == MovimentoEstoque.SAIDA or mov['tipo_movimento'] == 'saida':
            saldos[pid] -= mov['quantidade']
        else:
            saldos[pid] = mov['quantidade']
    
    # Identificar produtos com estoque baixo
    alertas = []
    for produto in produtos:
        saldo_atual = saldos.get(produto['id'], 0)
        estoque_minimo = produto.get('estoque_minimo', 0)
        
        if saldo_atual < estoque_minimo:
            faltante = estoque_minimo - saldo_atual
            alertas.append({
                "produto_id": produto['id'],
                "produto_nome": produto['nome'],
                "categoria": produto.get('categoria', ''),
                "saldo_atual": round(saldo_atual, 1),
                "estoque_minimo": estoque_minimo,
                "quantidade_faltante": round(faltante, 1),
                "percentual_estoque": round((saldo_atual / estoque_minimo) * 100, 1) if estoque_minimo > 0 else 0,
                "status": "critico" if saldo_atual <= 0 else "baixo"
            })
    
    # Ordenar por criticidade (críticos primeiro, depois por quantidade faltante)
    alertas.sort(key=lambda x: (0 if x['status'] == 'critico' else 1, -x['quantidade_faltante']))
    
    return {
        "total_alertas": len(alertas),
        "criticos": len([a for a in alertas if a['status'] == 'critico']),
        "baixos": len([a for a in alertas if a['status'] == 'baixo']),
        "alertas": alertas
    }


@router.get("/relatorio-saldos")
async def relatorio_saldos_estoque(current_user: dict = Depends(get_current_user)):
    """Relatório completo de saldos de estoque com comparação ao mínimo"""
    # Obter todos os produtos
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    produtos_dict = {p['id']: p for p in produtos}
    
    # Obter saldos atuais
    movimentos = await db.estoque.find({}, {"_id": 0}).to_list(10000)
    
    saldos = {}
    localizacoes = {}
    for mov in movimentos:
        pid = mov['produto_id']
        if pid not in saldos:
            saldos[pid] = 0
            localizacoes[pid] = None
        
        if mov['tipo_movimento'] == MovimentoEstoque.ENTRADA or mov['tipo_movimento'] == 'entrada':
            saldos[pid] += mov['quantidade']
            if mov.get('localizacao'):
                localizacoes[pid] = mov.get('localizacao')
        elif mov['tipo_movimento'] == MovimentoEstoque.SAIDA or mov['tipo_movimento'] == 'saida':
            saldos[pid] -= mov['quantidade']
        else:
            saldos[pid] = mov['quantidade']
            if mov.get('localizacao'):
                localizacoes[pid] = mov.get('localizacao')
    
    # Montar relatório
    itens = []
    total_valor_estoque = 0
    produtos_abaixo_minimo = 0
    produtos_zerados = 0
    
    for produto in produtos:
        pid = produto['id']
        saldo_atual = round(saldos.get(pid, 0), 1)
        estoque_minimo = produto.get('estoque_minimo', 0)
        preco = produto.get('preco', 0)
        custo = produto.get('custo', 0)
        valor_estoque = saldo_atual * custo if custo > 0 else saldo_atual * preco
        
        # Determinar status
        if saldo_atual <= 0:
            status = "zerado"
            produtos_zerados += 1
        elif estoque_minimo > 0 and saldo_atual < estoque_minimo:
            status = "baixo"
            produtos_abaixo_minimo += 1
        else:
            status = "ok"
        
        total_valor_estoque += valor_estoque
        
        itens.append({
            "produto_id": pid,
            "produto_nome": produto['nome'],
            "categoria": produto.get('categoria', ''),
            "saldo_atual": saldo_atual,
            "estoque_minimo": estoque_minimo,
            "quantidade_faltante": round(max(0, estoque_minimo - saldo_atual), 1),
            "preco": preco,
            "custo": custo,
            "valor_estoque": round(valor_estoque, 2),
            "localizacao": localizacoes.get(pid),
            "status": status
        })
    
    # Ordenar: zerados primeiro, depois baixos, depois por nome
    ordem_status = {"zerado": 0, "baixo": 1, "ok": 2}
    itens.sort(key=lambda x: (ordem_status.get(x['status'], 2), x['produto_nome']))
    
    return {
        "total_produtos": len(itens),
        "produtos_zerados": produtos_zerados,
        "produtos_abaixo_minimo": produtos_abaixo_minimo,
        "valor_total_estoque": round(total_valor_estoque, 2),
        "itens": itens
    }


from models import Producao


@router.post("/produzir-faltantes")
async def produzir_itens_faltantes(
    itens: List[dict],
    responsavel: str = "Sistema",
    current_user: dict = Depends(get_current_user)
):
    """Cria produções para itens com estoque faltante"""
    producoes_criadas = []
    erros = []
    
    for item in itens:
        try:
            produto_id = item.get('produto_id')
            quantidade = item.get('quantidade', 0)
            
            if not produto_id or quantidade <= 0:
                continue
            
            produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
            if not produto:
                erros.append(f"Produto {produto_id} não encontrado")
                continue
            
            # Criar número de produção para estoque
            count = await db.producao.count_documents({"tipo_producao": "estoque"})
            pedido_numero = f"EST-{count + 1:06d}"
            
            producao = Producao(
                pedido_id=None,
                pedido_numero=pedido_numero,
                produto_id=produto_id,
                produto_nome=produto['nome'],
                quantidade=quantidade,
                responsavel=responsavel,
                observacoes=f"Produção para reposição de estoque (mínimo: {item.get('estoque_minimo', 0)})",
                tipo_producao="estoque",
                data_inicio=datetime.now(timezone.utc)
            )
            
            await db.producao.insert_one(producao.model_dump())
            producoes_criadas.append({
                "produto_nome": produto['nome'],
                "quantidade": quantidade,
                "pedido_numero": pedido_numero
            })
            
        except Exception as e:
            erros.append(f"Erro ao criar produção: {str(e)}")
    
    return {
        "sucesso": len(producoes_criadas),
        "erros": len(erros),
        "producoes": producoes_criadas,
        "detalhes_erros": erros
    }

