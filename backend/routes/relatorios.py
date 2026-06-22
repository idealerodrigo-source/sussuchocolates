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
    
    vendas_lista = [{
        "data": v["data_venda"][:10] if isinstance(v["data_venda"], str) else str(v["data_venda"])[:10],
        "cliente": v.get("cliente_nome",""),
        "tipo": v.get("tipo_venda",""),
        "forma_pagamento": v.get("forma_pagamento",""),
        "status_pagamento": v.get("status_pagamento",""),
        "status_venda": v.get("status_venda",""),
        "valor_total": v.get("valor_total",0),
        "valor_pago_parcial": v.get("valor_pago_parcial"),
        "valor_pendente": v.get("valor_pendente")
    } for v in vendas]

    return {
        "total_vendas": total_vendas,
        "valor_total": valor_total,
        "ticket_medio": valor_total / total_vendas if total_vendas > 0 else 0,
        "vendas_por_dia": sorted(vendas_por_dia.values(), key=lambda x: x['data']),
        "vendas_lista": vendas_lista
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
    - Vendas diretas (sem pedido vinculado)
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
    
    # Separar vendas de pedidos e vendas diretas
    pedidos_vendidos = set()
    valor_vendas_pedidos = 0
    vendas_diretas = []
    valor_vendas_diretas = 0
    
    for venda in vendas:
        if venda.get('pedido_id'):
            # Venda vinculada a pedido
            pedidos_vendidos.add(venda['pedido_id'])
            valor_vendas_pedidos += venda.get('valor_total', 0)
        else:
            # Venda direta (sem pedido)
            venda_info = {
                'venda_id': venda.get('id'),
                'cliente_nome': venda.get('cliente_nome', 'N/A'),
                'data_venda': venda.get('data_venda'),
                'valor_total': venda.get('valor_total', 0),
                'forma_pagamento': venda.get('forma_pagamento', '-'),
                'items_count': len(venda.get('items', []))
            }
            vendas_diretas.append(venda_info)
            valor_vendas_diretas += venda.get('valor_total', 0)
    
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
    vendas_diretas.sort(key=lambda x: (x.get('data_venda') or ''), reverse=True)
    
    # Calcular totais
    valor_total_pendente = sum(p['valor_total'] for p in pedidos_sem_venda)
    valor_total_pedidos_finalizados = valor_vendas_pedidos
    valor_total_vendas_diretas = valor_vendas_diretas
    valor_total_finalizado = valor_total_pedidos_finalizados + valor_total_vendas_diretas
    
    return {
        "pedidos_pendentes_venda": {
            "quantidade": len(pedidos_sem_venda),
            "valor_total": round(valor_total_pendente, 2),
            "pedidos": pedidos_sem_venda
        },
        "pedidos_finalizados": {
            "quantidade": len(pedidos_com_venda),
            "valor_total": round(valor_total_pedidos_finalizados, 2),
            "pedidos": pedidos_com_venda
        },
        "vendas_diretas": {
            "quantidade": len(vendas_diretas),
            "valor_total": round(valor_total_vendas_diretas, 2),
            "vendas": vendas_diretas
        },
        "resumo": {
            "total_pedidos": len(pedidos),
            "pendentes_venda": len(pedidos_sem_venda),
            "pedidos_finalizados": len(pedidos_com_venda),
            "vendas_diretas": len(vendas_diretas),
            "valor_total_pendente": round(valor_total_pendente, 2),
            "valor_pedidos_finalizados": round(valor_total_pedidos_finalizados, 2),
            "valor_vendas_diretas": round(valor_total_vendas_diretas, 2),
            "valor_total_finalizado": round(valor_total_finalizado, 2),
            "valor_total_geral": round(valor_total_pendente + valor_total_finalizado, 2)
        }
    }

@router.get("/pedidos-sem-venda")
async def pedidos_sem_venda(current_user: dict = Depends(get_current_user)):
    """Pedidos concluidos sem venda registrada"""
    pedidos = await db.pedidos.find(
        {"status": {"$in": ["concluido", "entregue"]}},
        {"_id": 0}
    ).to_list(1000)

    resultado = []
    for pedido in pedidos:
        venda = await db.vendas.find_one({
            "pedido_id": pedido["id"],
            "status_venda": {"$ne": "cancelada"}
        }, {"_id": 0})
        if not venda:
            resultado.append({
                "pedido_id": pedido["id"],
                "numero": pedido.get("numero"),
                "cliente_nome": pedido.get("cliente_nome"),
                "valor_total": pedido.get("valor_total"),
                "data_pedido": pedido.get("data_pedido"),
                "status": pedido.get("status")
            })
    return resultado


@router.get("/duplicatas-old")
async def duplicatas(current_user: dict = Depends(get_current_user)):
    """Clientes com pedidos e vendas duplicadas (mesmo produto)"""
    vendas = await db.vendas.find(
        {"status_venda": {"$ne": "cancelada"}},
        {"_id": 0, "cliente_id": 1, "cliente_nome": 1, "items": 1, "data_venda": 1, "id": 1, "pedido_id": 1}
    ).to_list(1000)

    pedidos = await db.pedidos.find(
        {"status": {"$ne": "cancelado"}},
        {"_id": 0, "cliente_id": 1, "cliente_nome": 1, "items": 1, "data_pedido": 1, "id": 1, "numero": 1}
    ).to_list(1000)

    resultado = []
    vistos = set()
    for venda in vendas:
        cliente_id = venda.get("cliente_id")
        itens_venda = {i.get("produto_id"): i.get("produto_nome") for i in venda.get("items", [])}
        for pedido in pedidos:
            if pedido.get("cliente_id") != cliente_id:
                continue
            if pedido.get("id") == venda.get("pedido_id"):
                continue
            chave = f"{venda.get('id')}_{pedido.get('id')}"
            if chave in vistos:
                continue
            vistos.add(chave)
            itens_pedido = {i.get("produto_id"): i.get("produto_nome") for i in pedido.get("items", [])}
            ids_comuns = set(itens_venda.keys()) & set(itens_pedido.keys())
            if ids_comuns:
                produtos_comuns = [itens_venda[pid] for pid in ids_comuns]
                resultado.append({
                    "cliente_nome": venda.get("cliente_nome"),
                    "pedido_numero": pedido.get("numero"),
                    "pedido_data": str(pedido.get("data_pedido", ""))[:10],
                    "venda_id": venda.get("id"),
                    "venda_data": str(venda.get("data_venda", ""))[:10],
                    "produtos_em_comum": len(ids_comuns),
                    "produtos_nomes": produtos_comuns
                })
    return resultado

@router.get("/duplicatas")
async def duplicatas(current_user: dict = Depends(get_current_user)):
    """Pedidos com mais de uma venda ativa (cobrado duas vezes)"""
    vendas = await db.vendas.find(
        {"status_venda": {"$ne": "cancelada"}, "pedido_id": {"$ne": None}},
        {"_id": 0, "pedido_id": 1, "cliente_nome": 1, "id": 1, "data_venda": 1, "valor_total": 1}
    ).to_list(1000)

    # Agrupar por pedido_id
    pedidos_map = {}
    for venda in vendas:
        pid = venda.get("pedido_id")
        if pid not in pedidos_map:
            pedidos_map[pid] = []
        pedidos_map[pid].append(venda)

    resultado = []
    for pid, vendas_pedido in pedidos_map.items():
        if len(vendas_pedido) > 1:
            pedido = await db.pedidos.find_one({"id": pid}, {"_id": 0, "numero": 1})
            resultado.append({
                "pedido_id": pid,
                "pedido_numero": pedido.get("numero") if pedido else pid[:8],
                "cliente_nome": vendas_pedido[0].get("cliente_nome"),
                "num_vendas": len(vendas_pedido),
                "vendas": [{"venda_id": v.get("id")[:8], "data": str(v.get("data_venda",""))[:10], "valor": v.get("valor_total")} for v in vendas_pedido]
            })

    return resultado


@router.get("/inadimplencia")
async def relatorio_inadimplencia(current_user: dict = Depends(get_current_user)):
    """Relatório detalhado de inadimplência com aging por cliente"""
    from datetime import datetime, timezone, date

    hoje = datetime.now(timezone.utc).date()

    vendas = await db.vendas.find(
        {"status_pagamento": "pendente", "status_venda": {"$ne": "cancelada"}},
        {"_id": 0, "id": 1, "cliente_id": 1, "cliente_nome": 1,
         "valor_total": 1, "valor_pendente": 1, "valor_pago_parcial": 1,
         "data_venda": 1, "data_previsao_pagamento": 1,
         "forma_pagamento": 1, "tipo_venda": 1, "pedido_id": 1}
    ).sort("data_previsao_pagamento", 1).to_list(5000)

    clientes: dict = {}
    total_geral = 0.0
    aging = {"ate_30": 0.0, "31_60": 0.0, "61_90": 0.0, "acima_90": 0.0, "sem_vencimento": 0.0}

    for v in vendas:
        cid = v.get("cliente_id") or "sem_cliente"
        pendente = v.get("valor_pendente") or v.get("valor_total") or 0

        # Calcular dias de atraso
        prev_str = v.get("data_previsao_pagamento")
        if prev_str:
            try:
                prev = date.fromisoformat(str(prev_str)[:10])
                dias_atraso = (hoje - prev).days
            except Exception:
                dias_atraso = None
        else:
            dias_atraso = None

        # Bucket de aging
        if dias_atraso is None:
            aging["sem_vencimento"] += pendente
            bucket = "Sem vencimento"
        elif dias_atraso <= 0:
            aging["sem_vencimento"] += pendente
            bucket = "No prazo"
        elif dias_atraso <= 30:
            aging["ate_30"] += pendente
            bucket = "1-30 dias"
        elif dias_atraso <= 60:
            aging["31_60"] += pendente
            bucket = "31-60 dias"
        elif dias_atraso <= 90:
            aging["61_90"] += pendente
            bucket = "61-90 dias"
        else:
            aging["acima_90"] += pendente
            bucket = "Acima de 90 dias"

        total_geral += pendente

        if cid not in clientes:
            clientes[cid] = {
                "cliente_id": cid,
                "cliente_nome": v.get("cliente_nome") or "Sem nome",
                "total_pendente": 0.0,
                "num_vendas": 0,
                "dias_maior_atraso": 0,
                "vendas": []
            }

        clientes[cid]["total_pendente"] += pendente
        clientes[cid]["num_vendas"] += 1
        if dias_atraso and dias_atraso > clientes[cid]["dias_maior_atraso"]:
            clientes[cid]["dias_maior_atraso"] = dias_atraso

        data_venda_str = str(v.get("data_venda", ""))[:10]
        clientes[cid]["vendas"].append({
            "id": v.get("id", "")[:8],
            "data_venda": data_venda_str,
            "data_vencimento": str(prev_str)[:10] if prev_str else None,
            "dias_atraso": max(0, dias_atraso) if dias_atraso and dias_atraso > 0 else 0,
            "bucket": bucket,
            "valor_total": v.get("valor_total"),
            "valor_pendente": pendente,
            "forma_pagamento": v.get("forma_pagamento"),
            "tipo_venda": v.get("tipo_venda"),
        })

    lista = sorted(clientes.values(), key=lambda x: x["total_pendente"], reverse=True)

    return {
        "total_geral": round(total_geral, 2),
        "num_clientes": len(lista),
        "num_vendas": len(vendas),
        "aging": {k: round(v, 2) for k, v in aging.items()},
        "clientes": lista
    }
