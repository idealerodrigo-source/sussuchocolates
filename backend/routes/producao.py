"""
Producao routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
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
        
        # Apenas atualizar status do pedido para "em_producao"
        # NÃO adicionar itens de produção ao pedido - eles são apenas para controle interno
        # Os itens de produção podem ser diferentes dos itens do pedido 
        # (ex: um item "2 SABORES" pode gerar 2 itens de produção separados)
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


@router.patch("/{producao_id}/retornar")
async def retornar_producao(producao_id: str, current_user: dict = Depends(get_current_user)):
    """Retorna uma produção concluída de volta ao status de produção"""
    producao = await db.producao.find_one({"id": producao_id}, {"_id": 0})
    if not producao:
        raise HTTPException(status_code=404, detail="Produção não encontrada")
    
    # Verificar se a produção já foi concluída
    if not producao.get('data_conclusao'):
        raise HTTPException(status_code=400, detail="Esta produção ainda não foi concluída")
    
    # Verificar se a embalagem associada já foi concluída
    embalagem = await db.embalagem.find_one({"producao_id": producao_id}, {"_id": 0})
    if embalagem and embalagem.get('data_conclusao'):
        raise HTTPException(
            status_code=400, 
            detail="Não é possível retornar. A embalagem já foi concluída."
        )
    
    # Remover o registro de embalagem pendente (se existir)
    if embalagem:
        await db.embalagem.delete_one({"producao_id": producao_id})
    
    # Limpar a data de conclusão da produção
    await db.producao.update_one(
        {"id": producao_id},
        {"$set": {"data_conclusao": None}}
    )
    
    # Atualizar o status do pedido de volta para "em_producao"
    if producao.get('pedido_id'):
        await db.pedidos.update_one(
            {"id": producao['pedido_id']},
            {"$set": {"status": PedidoStatus.EM_PRODUCAO}}
        )
    
    return {"message": "Produção retornada com sucesso. O item voltou para produção."}


@router.get("/relatorio/por-data-entrega")
async def relatorio_por_data_entrega(
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna relatório de itens a produzir agrupados por data de entrega.
    Parâmetros opcionais:
    - data_inicio: Data inicial (formato YYYY-MM-DD)
    - data_fim: Data final (formato YYYY-MM-DD)
    Inclui:
    - Resumo agregado por produto (ex: "20.5 Ovo 05 recheado PRESTÍGIO")
    - Detalhes por pedido
    """
    # Estrutura para agrupar por data de entrega
    por_data_entrega = {}
    
    # Função auxiliar para verificar se data está no período
    def data_no_periodo(data_str):
        if not data_str or data_str == "sem_data":
            return True  # Incluir itens sem data
        if not data_inicio and not data_fim:
            return True  # Sem filtro
        
        try:
            data = datetime.strptime(data_str, '%Y-%m-%d').date()
            
            if data_inicio:
                inicio = datetime.strptime(data_inicio, '%Y-%m-%d').date()
                if data < inicio:
                    return False
            
            if data_fim:
                fim = datetime.strptime(data_fim, '%Y-%m-%d').date()
                if data > fim:
                    return False
            
            return True
        except:
            return True
    
    # Função auxiliar para formatar sabores
    def formatar_sabores(sabores_list):
        if not sabores_list or not isinstance(sabores_list, list):
            return None
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
        return " + ".join(partes) if partes else None
    
    # Função para adicionar item ao agrupamento
    def adicionar_item(data_key, data_entrega_valor, pedido, produto_nome, quantidade, sabores_texto, origem):
        if data_key not in por_data_entrega:
            por_data_entrega[data_key] = {
                "data_entrega": data_key if data_key != "sem_data" else None,
                "data_formatada": datetime.strptime(data_key, '%Y-%m-%d').strftime('%d/%m/%Y') if data_key != "sem_data" else "Sem data definida",
                "resumo_produtos": {},  # Agregado por produto
                "pedidos": {},
                "total_itens": 0,
                "total_quantidade": 0
            }
        
        # Chave para agrupar produto (produto + sabores)
        chave_produto = f"{produto_nome}|{sabores_texto or ''}"
        
        # Atualizar resumo agregado por produto
        if chave_produto not in por_data_entrega[data_key]["resumo_produtos"]:
            por_data_entrega[data_key]["resumo_produtos"][chave_produto] = {
                "produto_nome": produto_nome,
                "sabores": sabores_texto,
                "quantidade_total": 0,
                "pedidos_count": 0
            }
        por_data_entrega[data_key]["resumo_produtos"][chave_produto]["quantidade_total"] += quantidade
        por_data_entrega[data_key]["resumo_produtos"][chave_produto]["pedidos_count"] += 1
        
        # Atualizar detalhes por pedido
        pedido_numero = pedido.get('numero')
        if pedido_numero not in por_data_entrega[data_key]["pedidos"]:
            por_data_entrega[data_key]["pedidos"][pedido_numero] = {
                "pedido_id": pedido.get('id'),
                "pedido_numero": pedido_numero,
                "cliente_nome": pedido.get('cliente_nome', 'N/A'),
                "cliente_telefone": pedido.get('cliente_telefone', ''),
                "observacoes": pedido.get('observacoes', ''),
                "status": pedido.get('status', ''),
                "origem": origem,
                "itens": []
            }
        
        por_data_entrega[data_key]["pedidos"][pedido_numero]["itens"].append({
            "produto_nome": produto_nome,
            "quantidade": quantidade,
            "sabores": sabores_texto,
            "status": origem
        })
        
        por_data_entrega[data_key]["total_itens"] += 1
        por_data_entrega[data_key]["total_quantidade"] += quantidade
    
    # PARTE 1: Produções pendentes (já enviadas para produção)
    producoes_pendentes = await db.producao.find(
        {"data_conclusao": None, "pedido_id": {"$ne": None}},
        {"_id": 0}
    ).to_list(10000)
    
    pedidos_ids_producao = list(set([p['pedido_id'] for p in producoes_pendentes if p.get('pedido_id')]))
    
    # PARTE 2: Pedidos pendentes ou em_producao
    pedidos_pendentes = await db.pedidos.find(
        {"status": {"$in": ["pendente", "em_producao"]}, "id": {"$nin": pedidos_ids_producao}},
        {"_id": 0}
    ).to_list(1000)
    
    # Buscar todos os pedidos
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
        
        if data_entrega:
            data_key = data_entrega[:10] if isinstance(data_entrega, str) else data_entrega.strftime('%Y-%m-%d')
        else:
            data_key = "sem_data"
        
        # Verificar se está no período filtrado
        if not data_no_periodo(data_key):
            continue
        
        sabores_texto = formatar_sabores(prod.get('sabores'))
        adicionar_item(data_key, data_entrega, pedido, prod['produto_nome'], prod['quantidade'], sabores_texto, "em_producao")
    
    # Processar pedidos pendentes
    for pedido in pedidos_pendentes:
        data_entrega = pedido.get('data_entrega')
        
        if data_entrega:
            data_key = data_entrega[:10] if isinstance(data_entrega, str) else data_entrega.strftime('%Y-%m-%d')
        else:
            data_key = "sem_data"
        
        # Verificar se está no período filtrado
        if not data_no_periodo(data_key):
            continue
        
        for item in pedido.get('items', []):
            # Pular itens já entregues
            if item.get('ja_entregue', False):
                continue
            sabores_texto = formatar_sabores(item.get('sabores'))
            adicionar_item(data_key, data_entrega, pedido, item.get('produto_nome', ''), item.get('quantidade', 1), sabores_texto, "pendente")
    
    # Converter dicts para listas e ordenar
    for data_key in por_data_entrega:
        # Ordenar resumo de produtos por quantidade (maior primeiro)
        resumo_lista = sorted(
            por_data_entrega[data_key]["resumo_produtos"].values(),
            key=lambda x: (-x['quantidade_total'], x['produto_nome'])
        )
        por_data_entrega[data_key]["resumo_produtos"] = resumo_lista
        
        # Converter pedidos para lista
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

