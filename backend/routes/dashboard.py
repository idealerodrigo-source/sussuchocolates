"""
Dashboard and Analytics routes
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone

from database import db
from auth import get_current_user
from models import PedidoStatus

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
async def dashboard_stats(current_user: dict = Depends(get_current_user)):
    hoje = datetime.now(timezone.utc).date().isoformat()
    mes_atual = datetime.now(timezone.utc).strftime("%Y-%m")
    
    total_clientes = await db.clientes.count_documents({})
    total_produtos = await db.produtos.count_documents({})
    
    pedidos_pendentes = await db.pedidos.count_documents({"status": PedidoStatus.PENDENTE})
    pedidos_em_producao = await db.pedidos.count_documents({"status": PedidoStatus.EM_PRODUCAO})
    
    vendas_mes = await db.vendas.find({
        "data_venda": {"$regex": f"^{mes_atual}"}
    }, {"_id": 0}).to_list(10000)
    
    valor_vendas_mes = sum(v['valor_total'] for v in vendas_mes)
    
    vendas_hoje = [v for v in vendas_mes if v['data_venda'].startswith(hoje)]
    valor_vendas_hoje = sum(v['valor_total'] for v in vendas_hoje)
    
    return {
        "total_clientes": total_clientes,
        "total_produtos": total_produtos,
        "pedidos_pendentes": pedidos_pendentes,
        "pedidos_em_producao": pedidos_em_producao,
        "vendas_mes": len(vendas_mes),
        "valor_vendas_mes": valor_vendas_mes,
        "vendas_hoje": len(vendas_hoje),
        "valor_vendas_hoje": valor_vendas_hoje
    }


@router.get("/analise/lucratividade")
async def analise_lucratividade(current_user: dict = Depends(get_current_user)):
    """Análise de lucratividade por produto."""
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    
    lucratividade_por_produto = {}
    
    for produto in produtos:
        pid = produto['id']
        custo = produto.get('custo_producao') or 0
        preco = produto.get('preco', 0)
        lucro = preco - custo
        margem = (lucro / preco * 100) if preco > 0 else 0
        
        if pid not in lucratividade_por_produto:
            lucratividade_por_produto[pid] = {
                "produto_id": pid,
                "produto_nome": produto['nome'],
                "categoria": produto.get('categoria'),
                "preco_venda": preco,
                "custo_producao": custo,
                "lucro_unitario": lucro,
                "margem_percentual": margem,
                "quantidade_vendida": 0,
                "receita_total": 0,
                "custo_total": 0,
                "lucro_total": 0
            }
    
    for venda in vendas:
        for item in venda['items']:
            pid = item['produto_id']
            if pid in lucratividade_por_produto:
                quantidade = item['quantidade']
                receita = item['subtotal']
                custo = lucratividade_por_produto[pid]['custo_producao'] * quantidade
                
                lucratividade_por_produto[pid]['quantidade_vendida'] += quantidade
                lucratividade_por_produto[pid]['receita_total'] += receita
                lucratividade_por_produto[pid]['custo_total'] += custo
                lucratividade_por_produto[pid]['lucro_total'] += (receita - custo)
    
    produtos_lucrativos = sorted(
        [p for p in lucratividade_por_produto.values() if p['quantidade_vendida'] > 0],
        key=lambda x: x['lucro_total'],
        reverse=True
    )
    
    receita_total_geral = sum(p['receita_total'] for p in produtos_lucrativos)
    lucro_total_geral = sum(p['lucro_total'] for p in produtos_lucrativos)
    custo_total_geral = sum(p['custo_total'] for p in produtos_lucrativos)
    
    return {
        "resumo": {
            "receita_total": receita_total_geral,
            "custo_total": custo_total_geral,
            "lucro_total": lucro_total_geral,
            "margem_geral": (lucro_total_geral / receita_total_geral * 100) if receita_total_geral > 0 else 0
        },
        "produtos": produtos_lucrativos,
        "top_5_mais_lucrativos": produtos_lucrativos[:5],
        "top_5_maior_margem": sorted(
            [p for p in produtos_lucrativos if p['quantidade_vendida'] > 0],
            key=lambda x: x['margem_percentual'],
            reverse=True
        )[:5]
    }


@router.get("/analise/produtos-desempenho")
async def analise_produtos_desempenho(current_user: dict = Depends(get_current_user)):
    """Análise de desempenho de produtos nas vendas."""
    vendas = await db.vendas.find({}, {"_id": 0}).to_list(10000)
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(1000)
    
    desempenho = {}
    
    for produto in produtos:
        pid = produto['id']
        desempenho[pid] = {
            "produto_id": pid,
            "produto_nome": produto['nome'],
            "categoria": produto.get('categoria'),
            "total_vendido": 0,
            "frequencia_vendas": 0,
            "receita_gerada": 0
        }
    
    for venda in vendas:
        for item in venda['items']:
            pid = item['produto_id']
            if pid in desempenho:
                desempenho[pid]['total_vendido'] += item['quantidade']
                desempenho[pid]['frequencia_vendas'] += 1
                desempenho[pid]['receita_gerada'] += item['subtotal']
    
    produtos_desempenho = sorted(
        desempenho.values(),
        key=lambda x: x['receita_gerada'],
        reverse=True
    )
    
    return {
        "produtos": produtos_desempenho,
        "mais_vendidos": sorted(produtos_desempenho, key=lambda x: x['total_vendido'], reverse=True)[:10],
        "maior_receita": produtos_desempenho[:10]
    }
