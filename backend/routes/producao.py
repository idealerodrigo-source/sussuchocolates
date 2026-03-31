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


@router.get("/relatorio/por-data-entrega")
async def relatorio_por_data_entrega(current_user: dict = Depends(get_current_user)):
    """
    Retorna relatório de itens a produzir agrupados por data de entrega.
    Inclui:
    - Itens já em produção (producao sem data_conclusao)
    - Itens de pedidos pendentes/em_producao que ainda não foram enviados para produção
    """
    # Agrupar por data de entrega
    por_data_entrega = {}
    
    # PARTE 1: Produções pendentes (já enviadas para produção)
    producoes_pendentes = await db.producao.find(
        {"data_conclusao": None, "pedido_id": {"$ne": None}},
        {"_id": 0}
    ).to_list(10000)
    
    pedidos_ids_producao = list(set([p['pedido_id'] for p in producoes_pendentes if p.get('pedido_id')]))
    
    # PARTE 2: Pedidos pendentes ou em_producao (incluir itens deles também)
    pedidos_pendentes = await db.pedidos.find(
        {"status": {"$in": ["pendente", "em_producao"]}, "id": {"$nin": pedidos_ids_producao}},
        {"_id": 0}
    ).to_list(1000)
    
    # Buscar todos os pedidos relacionados
    todos_pedidos_ids = list(set(pedidos_ids_producao + [p['id'] for p in pedidos_pendentes]))
    todos_pedidos = await db.pedidos.find(
        {"id": {"$in": todos_pedidos_ids}},
        {"_id": 0}
    ).to_list(1000)
    pedidos_dict = {p['id']: p for p in todos_pedidos}
    
    # Processar produções pendentes
    for prod in producoes_pendentes:
        pedido_id = prod.get('pedido_id')
        if not pedido_id or pedido_id not in pedidos_dict:
            continue
            
        pedido = pedidos_dict[pedido_id]
        data_entrega = pedido.get('data_entrega')
        
        # Formatar data de entrega
        if data_entrega:
            if isinstance(data_entrega, str):
                data_key = data_entrega[:10]
            else:
                data_key = data_entrega.strftime('%Y-%m-%d')
        else:
            data_key = "sem_data"
        
        if data_key not in por_data_entrega:
            por_data_entrega[data_key] = {
                "data_entrega": data_key if data_key != "sem_data" else None,
                "data_formatada": datetime.strptime(data_key, '%Y-%m-%d').strftime('%d/%m/%Y') if data_key != "sem_data" else "Sem data definida",
                "pedidos": {},
                "total_itens": 0,
                "total_quantidade": 0
            }
        
        pedido_numero = pedido.get('numero', prod.get('pedido_numero'))
        if pedido_numero not in por_data_entrega[data_key]["pedidos"]:
            por_data_entrega[data_key]["pedidos"][pedido_numero] = {
                "pedido_id": pedido_id,
                "pedido_numero": pedido_numero,
                "cliente_nome": pedido.get('cliente_nome', 'N/A'),
                "cliente_telefone": pedido.get('cliente_telefone', ''),
                "observacoes": pedido.get('observacoes', ''),
                "status": pedido.get('status', ''),
                "origem": "em_producao",
                "itens": []
            }
        
        # Formatar sabores
        sabores_texto = None
        if prod.get('sabores'):
            sabores_list = prod['sabores']
            if isinstance(sabores_list, list) and len(sabores_list) > 0:
                partes = []
                for s in sabores_list:
                    if isinstance(s, dict):
                        nome = s.get('nome', s.get('sabor', ''))
                        qtd = s.get('quantidade', 1)
                        if qtd == 0.5:
                            partes.append(f"½ {nome}")
                        elif qtd != 1:
                            partes.append(f"{qtd} {nome}")
                        else:
                            partes.append(nome)
                sabores_texto = " + ".join(partes)
        
        item_info = {
            "producao_id": prod['id'],
            "produto_nome": prod['produto_nome'],
            "quantidade": prod['quantidade'],
            "sabores": sabores_texto,
            "status": "em_producao",
            "observacoes": prod.get('observacoes', '')
        }
        
        por_data_entrega[data_key]["pedidos"][pedido_numero]["itens"].append(item_info)
        por_data_entrega[data_key]["total_itens"] += 1
        por_data_entrega[data_key]["total_quantidade"] += prod['quantidade']
    
    # Processar pedidos pendentes (ainda não enviados para produção)
    for pedido in pedidos_pendentes:
        data_entrega = pedido.get('data_entrega')
        
        if data_entrega:
            if isinstance(data_entrega, str):
                data_key = data_entrega[:10]
            else:
                data_key = data_entrega.strftime('%Y-%m-%d')
        else:
            data_key = "sem_data"
        
        if data_key not in por_data_entrega:
            por_data_entrega[data_key] = {
                "data_entrega": data_key if data_key != "sem_data" else None,
                "data_formatada": datetime.strptime(data_key, '%Y-%m-%d').strftime('%d/%m/%Y') if data_key != "sem_data" else "Sem data definida",
                "pedidos": {},
                "total_itens": 0,
                "total_quantidade": 0
            }
        
        pedido_numero = pedido.get('numero')
        if pedido_numero not in por_data_entrega[data_key]["pedidos"]:
            por_data_entrega[data_key]["pedidos"][pedido_numero] = {
                "pedido_id": pedido['id'],
                "pedido_numero": pedido_numero,
                "cliente_nome": pedido.get('cliente_nome', 'N/A'),
                "cliente_telefone": pedido.get('cliente_telefone', ''),
                "observacoes": pedido.get('observacoes', ''),
                "status": pedido.get('status', ''),
                "origem": "pendente",
                "itens": []
            }
        
        # Adicionar itens do pedido
        for item in pedido.get('items', []):
            # Formatar sabores do item
            sabores_texto = None
            if item.get('sabores'):
                sabores_list = item['sabores']
                if isinstance(sabores_list, list) and len(sabores_list) > 0:
                    partes = []
                    for s in sabores_list:
                        if isinstance(s, dict):
                            nome = s.get('nome', s.get('sabor', ''))
                            qtd = s.get('quantidade', 1)
                            if qtd == 0.5:
                                partes.append(f"½ {nome}")
                            elif qtd != 1:
                                partes.append(f"{qtd} {nome}")
                            else:
                                partes.append(nome)
                    sabores_texto = " + ".join(partes)
            
            item_info = {
                "producao_id": None,
                "produto_nome": item.get('produto_nome', ''),
                "quantidade": item.get('quantidade', 1),
                "sabores": sabores_texto,
                "status": "pendente",
                "observacoes": ""
            }
            
            por_data_entrega[data_key]["pedidos"][pedido_numero]["itens"].append(item_info)
            por_data_entrega[data_key]["total_itens"] += 1
            por_data_entrega[data_key]["total_quantidade"] += item.get('quantidade', 1)
    
    # Converter pedidos de dict para lista
    for data_key in por_data_entrega:
        por_data_entrega[data_key]["pedidos"] = list(por_data_entrega[data_key]["pedidos"].values())
    
    # Ordenar por data de entrega
    resultado = sorted(
        por_data_entrega.values(),
        key=lambda x: x['data_entrega'] or '9999-99-99'
    )
    
    # Calcular totais gerais
    total_geral_itens = sum(d['total_itens'] for d in resultado)
    total_geral_quantidade = sum(d['total_quantidade'] for d in resultado)
    
    return {
        "total_datas": len(resultado),
        "total_itens_pendentes": total_geral_itens,
        "total_quantidade": total_geral_quantidade,
        "por_data_entrega": resultado
    }


@router.get("/relatorio/pendente")
async def relatorio_producao_pendente(current_user: dict = Depends(get_current_user)):
    """
    Retorna relatório de produção pendente agrupado por produto.
    Exemplo de uso: "Faltam 10.5 ovos sabor Prestígio"
    """
    # Buscar todas as produções pendentes (sem data_conclusao)
    producoes_pendentes = await db.producao.find(
        {"data_conclusao": None},
        {"_id": 0}
    ).to_list(10000)
    
    # Agrupar por produto
    resumo_por_produto = {}
    
    for p in producoes_pendentes:
        produto_id = p['produto_id']
        produto_nome = p['produto_nome']
        quantidade = p['quantidade']
        observacoes = p.get('observacoes', '')
        
        # Extrair sabor das observações se existir
        sabor_info = None
        if observacoes and 'Sabor:' in observacoes:
            try:
                sabor_info = observacoes.split('Sabor:')[1].split('|')[0].strip()
            except:
                pass
        
        # Chave única para agrupamento
        chave = f"{produto_id}_{sabor_info}" if sabor_info else produto_id
        
        if chave not in resumo_por_produto:
            resumo_por_produto[chave] = {
                "produto_id": produto_id,
                "produto_nome": produto_nome,
                "sabor": sabor_info,
                "quantidade_total": 0,
                "quantidade_itens": 0
            }
        
        resumo_por_produto[chave]["quantidade_total"] += quantidade
        resumo_por_produto[chave]["quantidade_itens"] += 1
    
    # Converter para lista ordenada
    resultado = sorted(
        resumo_por_produto.values(),
        key=lambda x: (x['produto_nome'], x['sabor'] or '')
    )
    
    return {
        "total_itens_pendentes": len(producoes_pendentes),
        "produtos_agrupados": resultado
    }

