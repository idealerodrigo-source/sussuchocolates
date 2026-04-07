"""
Relatórios routes
"""
from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import PedidoStatus

router = APIRouter(prefix="/relatorios", tags=["relatorios"])


@router.get("/vendas")
async def relatorio_vendas(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if data_inicio and data_fim:
        query['data_venda'] = {
            '$gte': data_inicio,
            '$lte': data_fim
        }
    
    vendas = await db.vendas.find(query, {"_id": 0}).to_list(10000)
    
    total_vendas = len(vendas)
    valor_total = sum(v['valor_total'] for v in vendas)
    
    vendas_por_dia = {}
    for v in vendas:
        data = v['data_venda'][:10] if isinstance(v['data_venda'], str) else v['data_venda'].date().isoformat()
        if data not in vendas_por_dia:
            vendas_por_dia[data] = {"data": data, "quantidade": 0, "valor": 0}
        vendas_por_dia[data]['quantidade'] += 1
        vendas_por_dia[data]['valor'] += v['valor_total']
    
    return {
        "total_vendas": total_vendas,
        "valor_total": valor_total,
        "ticket_medio": valor_total / total_vendas if total_vendas > 0 else 0,
        "vendas_por_dia": sorted(vendas_por_dia.values(), key=lambda x: x['data'])
    }


@router.get("/producao")
async def relatorio_producao(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if data_inicio and data_fim:
        query['data_inicio'] = {
            '$gte': data_inicio,
            '$lte': data_fim
        }
    
    producoes = await db.producao.find(query, {"_id": 0}).to_list(10000)
    
    total_producoes = len(producoes)
    concluidas = sum(1 for p in producoes if p.get('data_conclusao'))
    em_andamento = total_producoes - concluidas
    
    por_produto = {}
    for p in producoes:
        nome = p['produto_nome']
        if nome not in por_produto:
            por_produto[nome] = {"produto": nome, "quantidade": 0}
        por_produto[nome]['quantidade'] += p['quantidade']
    
    return {
        "total_producoes": total_producoes,
        "concluidas": concluidas,
        "em_andamento": em_andamento,
        "por_produto": list(por_produto.values())
    }


@router.get("/clientes")
async def relatorio_clientes(current_user: dict = Depends(get_current_user)):
    total_clientes = await db.clientes.count_documents({})
    
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    
    por_cliente = {}
    for v in vendas:
        cid = v['cliente_id']
        if cid not in por_cliente:
            por_cliente[cid] = {
                "cliente_id": cid,
                "cliente_nome": v['cliente_nome'],
                "total_compras": 0,
                "valor_total": 0
            }
        por_cliente[cid]['total_compras'] += 1
        por_cliente[cid]['valor_total'] += v['valor_total']
    
    top_clientes = sorted(
        por_cliente.values(),
        key=lambda x: x['valor_total'],
        reverse=True
    )[:10]
    
    return {
        "total_clientes": total_clientes,
        "clientes_ativos": len(por_cliente),
        "top_clientes": top_clientes
    }


@router.get("/producao/pendente")
async def relatorio_producao_pendente(current_user: dict = Depends(get_current_user)):
    """
    Relatório de itens a serem produzidos com quantidade solicitada, produzida e faltante
    """
    pedidos = await db.pedidos.find(
        {"status": {"$nin": ["entregue", "cancelado", "concluido"]}},
        {"_id": 0}
    ).to_list(1000)
    
    if not pedidos:
        return {
            "total_itens": 0,
            "quantidade_total_solicitada": 0,
            "quantidade_total_produzida": 0,
            "quantidade_total_faltante": 0,
            "itens": []
        }
    
    todas_producoes = await db.producao.find(
        {"data_conclusao": {"$ne": None}},
        {"_id": 0}
    ).to_list(5000)
    
    producao_por_pedido = {}
    for prod in todas_producoes:
        pedido_id = prod.get('pedido_id')
        if not pedido_id:
            continue
        
        if pedido_id not in producao_por_pedido:
            producao_por_pedido[pedido_id] = {}
        
        produto_nome = prod.get('produto_nome', 'Produto Desconhecido')
        quantidade = prod.get('quantidade', 0)
        
        if produto_nome not in producao_por_pedido[pedido_id]:
            producao_por_pedido[pedido_id][produto_nome] = 0
        producao_por_pedido[pedido_id][produto_nome] += quantidade
    
    produtos_agrupados = {}
    for pedido in pedidos:
        pedido_id = pedido.get('id')
        pedido_numero = pedido.get('numero', 'N/A')
        cliente_nome = pedido.get('cliente_nome', 'N/A')
        
        for item in pedido.get('items', []):
            produto_nome = item.get('produto_nome', 'Produto Desconhecido')
            quantidade_solicitada = item.get('quantidade', 0)
            
            quantidade_produzida = producao_por_pedido.get(pedido_id, {}).get(produto_nome, 0)
            quantidade_faltante = max(0, quantidade_solicitada - quantidade_produzida)
            
            if produto_nome not in produtos_agrupados:
                produtos_agrupados[produto_nome] = {
                    'produto_nome': produto_nome,
                    'quantidade_solicitada': 0,
                    'quantidade_produzida': 0,
                    'quantidade_faltante': 0,
                    'pedidos': []
                }
            
            produtos_agrupados[produto_nome]['quantidade_solicitada'] += quantidade_solicitada
            produtos_agrupados[produto_nome]['quantidade_produzida'] += quantidade_produzida
            produtos_agrupados[produto_nome]['quantidade_faltante'] += quantidade_faltante
            
            if quantidade_faltante > 0:
                produtos_agrupados[produto_nome]['pedidos'].append({
                    'pedido_id': pedido_id,
                    'pedido_numero': pedido_numero,
                    'cliente_nome': cliente_nome,
                    'quantidade_solicitada': quantidade_solicitada,
                    'quantidade_produzida': quantidade_produzida,
                    'quantidade_faltante': quantidade_faltante
                })
    
    resultado = [p for p in produtos_agrupados.values() if p['quantidade_faltante'] > 0]
    resultado.sort(key=lambda x: x['quantidade_faltante'], reverse=True)
    
    return {
        "total_itens": len(resultado),
        "quantidade_total_solicitada": sum(p['quantidade_solicitada'] for p in resultado),
        "quantidade_total_produzida": sum(p['quantidade_produzida'] for p in resultado),
        "quantidade_total_faltante": sum(p['quantidade_faltante'] for p in resultado),
        "itens": resultado
    }


@router.get("/producao/concluida")
async def relatorio_producao_concluida(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Relatório de itens já produzidos (agrupados por produto)
    """
    filtro = {"data_conclusao": {"$ne": None}}
    
    if data_inicio:
        filtro["data_conclusao"]["$gte"] = data_inicio
    if data_fim:
        filtro["data_conclusao"]["$lte"] = data_fim
    
    producoes = await db.producao.find(filtro, {"_id": 0}).to_list(5000)
    
    produtos_agrupados = {}
    for prod in producoes:
        produto_nome = prod.get('produto_nome', 'Produto Desconhecido')
        quantidade = prod.get('quantidade', 0)
        
        if produto_nome not in produtos_agrupados:
            produtos_agrupados[produto_nome] = {
                'produto_nome': produto_nome,
                'quantidade_total': 0,
                'producoes_count': 0
            }
        
        produtos_agrupados[produto_nome]['quantidade_total'] += quantidade
        produtos_agrupados[produto_nome]['producoes_count'] += 1
    
    resultado = list(produtos_agrupados.values())
    resultado.sort(key=lambda x: x['quantidade_total'], reverse=True)
    
    return {
        "total_tipos_produto": len(resultado),
        "quantidade_total_produzida": sum(p['quantidade_total'] for p in resultado),
        "itens": resultado
    }


@router.get("/pedidos/resumo")
async def relatorio_pedidos_resumo(current_user: dict = Depends(get_current_user)):
    """
    Relatório resumo de itens dos pedidos (pendentes e em produção)
    """
    pedidos = await db.pedidos.find(
        {"status": {"$in": ["pendente", "em_producao", "em_embalagem"]}},
        {"_id": 0}
    ).to_list(1000)
    
    produtos_agrupados = {}
    for pedido in pedidos:
        for item in pedido.get('items', []):
            produto_nome = item.get('produto_nome', 'Produto Desconhecido')
            quantidade = item.get('quantidade', 0)
            
            if produto_nome not in produtos_agrupados:
                produtos_agrupados[produto_nome] = {
                    'produto_nome': produto_nome,
                    'quantidade_total': 0,
                    'valor_total': 0,
                    'pedidos_count': 0
                }
            
            produtos_agrupados[produto_nome]['quantidade_total'] += quantidade
            produtos_agrupados[produto_nome]['valor_total'] += item.get('subtotal', 0)
            produtos_agrupados[produto_nome]['pedidos_count'] += 1
    
    resultado = list(produtos_agrupados.values())
    resultado.sort(key=lambda x: x['quantidade_total'], reverse=True)
    
    return {
        "total_tipos_produto": len(resultado),
        "quantidade_total": sum(p['quantidade_total'] for p in resultado),
        "valor_total": sum(p['valor_total'] for p in resultado),
        "itens": resultado
    }


@router.get("/pedidos/status-vendas")
async def relatorio_pedidos_status_vendas(current_user: dict = Depends(get_current_user)):
    """
    Relatório de pedidos separados por status de venda:
    - Pedidos pendentes de venda (ainda não vendidos)
    - Pedidos já finalizados com venda
    """
    # Buscar todos os pedidos não cancelados
    pedidos = await db.pedidos.find(
        {"status": {"$ne": "cancelado"}},
        {"_id": 0}
    ).to_list(5000)
    
    # Buscar todas as vendas para identificar pedidos vendidos
    vendas = await db.vendas.find(
        {"status_venda": {"$ne": "cancelada"}},
        {"_id": 0}
    ).to_list(5000)
    
    # Criar set de pedidos que já tem venda
    pedidos_vendidos = set()
    valor_total_vendido = 0
    for venda in vendas:
        if venda.get('pedido_id'):
            pedidos_vendidos.add(venda['pedido_id'])
            valor_total_vendido += venda.get('valor_total', 0)
    
    # Separar pedidos pendentes de venda e pedidos vendidos
    pedidos_sem_venda = []
    pedidos_com_venda = []
    
    for pedido in pedidos:
        pedido_id = pedido.get('id')
        pedido_info = {
            'pedido_id': pedido_id,
            'numero': pedido.get('numero', 'N/A'),
            'cliente_nome': pedido.get('cliente_nome', 'N/A'),
            'cliente_telefone': pedido.get('cliente_telefone'),
            'data_pedido': pedido.get('data_pedido'),
            'data_entrega': pedido.get('data_entrega'),
            'valor_total': pedido.get('valor_total', 0),
            'status': pedido.get('status', 'pendente'),
            'items_count': len(pedido.get('items', []))
        }
        
        if pedido_id in pedidos_vendidos:
            pedidos_com_venda.append(pedido_info)
        else:
            # Só incluir se não for 'concluido' sem venda (casos raros)
            if pedido.get('status') != 'concluido':
                pedidos_sem_venda.append(pedido_info)
    
    # Ordenar por data de entrega (mais urgentes primeiro)
    pedidos_sem_venda.sort(key=lambda x: (x.get('data_entrega') or '9999-12-31'))
    pedidos_com_venda.sort(key=lambda x: (x.get('data_pedido') or ''), reverse=True)
    
    # Calcular totais
    valor_total_pendente = sum(p['valor_total'] for p in pedidos_sem_venda)
    valor_total_finalizado = valor_total_vendido
    
    return {
        "pedidos_pendentes_venda": {
            "quantidade": len(pedidos_sem_venda),
            "valor_total": round(valor_total_pendente, 2),
            "pedidos": pedidos_sem_venda
        },
        "pedidos_finalizados": {
            "quantidade": len(pedidos_com_venda),
            "valor_total": round(valor_total_finalizado, 2),
            "pedidos": pedidos_com_venda
        },
        "resumo": {
            "total_pedidos": len(pedidos),
            "pendentes_venda": len(pedidos_sem_venda),
            "finalizados": len(pedidos_com_venda),
            "valor_total_pendente": round(valor_total_pendente, 2),
            "valor_total_finalizado": round(valor_total_finalizado, 2),
            "valor_total_geral": round(valor_total_pendente + valor_total_finalizado, 2)
        }
    }
