"""
Pedidos routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from auth import get_current_user
from models import Pedido, PedidoCreate, PedidoUpdate, PedidoStatus, ItemPedido

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


@router.post("", response_model=Pedido)
async def criar_pedido(pedido_data: PedidoCreate, current_user: dict = Depends(get_current_user)):
    cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    valor_total = sum(item.subtotal for item in pedido_data.items)
    
    # Calcular saldo restante
    valor_pago = pedido_data.valor_pago or 0.0
    valor_saldo = valor_total - valor_pago
    
    # Determinar status de pagamento
    if valor_pago >= valor_total:
        status_pagamento = "pago"
        valor_saldo = 0
    elif valor_pago > 0:
        status_pagamento = "parcial"
    else:
        status_pagamento = "pendente"
    
    count = await db.pedidos.count_documents({})
    numero_pedido = f"PED-{count + 1:06d}"
    
    pedido = Pedido(
        numero=numero_pedido,
        cliente_id=pedido_data.cliente_id,
        cliente_nome=cliente['nome'],
        cliente_telefone=cliente.get('telefone'),
        items=pedido_data.items,
        valor_total=valor_total,
        forma_pagamento=pedido_data.forma_pagamento,
        observacoes=pedido_data.observacoes,
        data_entrega=datetime.fromisoformat(pedido_data.data_entrega) if pedido_data.data_entrega else None,
        venda_vinculada_id=pedido_data.venda_vinculada_id,
        origem=pedido_data.origem or "manual",
        # Campos de pagamento
        status_pagamento=status_pagamento,
        valor_pago=valor_pago,
        valor_saldo=valor_saldo,
        pagamento_forma=pedido_data.pagamento_forma,
        pagamento_parcelas=pedido_data.pagamento_parcelas or 1,
        data_pagamento=datetime.now(timezone.utc) if valor_pago > 0 else None
    )
    
    doc = pedido.model_dump()
    doc['data_pedido'] = doc['data_pedido'].isoformat()
    if doc.get('data_entrega'):
        doc['data_entrega'] = doc['data_entrega'].isoformat()
    if doc.get('data_pagamento'):
        doc['data_pagamento'] = doc['data_pagamento'].isoformat()
    await db.pedidos.insert_one(doc)
    return pedido


@router.get("", response_model=List[Pedido])
async def listar_pedidos(current_user: dict = Depends(get_current_user)):
    pedidos = await db.pedidos.find({}, {"_id": 0}).sort("data_pedido", -1).to_list(1000)
    for p in pedidos:
        if isinstance(p['data_pedido'], str):
            p['data_pedido'] = datetime.fromisoformat(p['data_pedido'])
        if p.get('data_entrega') and isinstance(p['data_entrega'], str):
            p['data_entrega'] = datetime.fromisoformat(p['data_entrega'])
    return pedidos


@router.get("/{pedido_id}", response_model=Pedido)
async def obter_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if isinstance(pedido['data_pedido'], str):
        pedido['data_pedido'] = datetime.fromisoformat(pedido['data_pedido'])
    if pedido.get('data_entrega') and isinstance(pedido['data_entrega'], str):
        pedido['data_entrega'] = datetime.fromisoformat(pedido['data_entrega'])
    return pedido


@router.patch("/{pedido_id}/status")
async def atualizar_status_pedido(pedido_id: str, status: PedidoStatus, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {"status": status}
    if status == PedidoStatus.ENTREGUE:
        update_data["data_entrega"] = datetime.now(timezone.utc).isoformat()
    
    await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    return {"message": "Status atualizado com sucesso"}


@router.put("/{pedido_id}", response_model=Pedido)
async def atualizar_pedido(pedido_id: str, pedido_data: PedidoUpdate, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    update_data = {}
    
    if pedido_data.cliente_id:
        cliente = await db.clientes.find_one({"id": pedido_data.cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        update_data["cliente_id"] = pedido_data.cliente_id
        update_data["cliente_nome"] = cliente['nome']
    
    if pedido_data.items is not None:
        items_dict = [item.model_dump() for item in pedido_data.items]
        update_data["items"] = items_dict
        update_data["valor_total"] = sum(item.subtotal for item in pedido_data.items)
    
    if pedido_data.observacoes is not None:
        update_data["observacoes"] = pedido_data.observacoes
    
    if pedido_data.data_entrega is not None:
        update_data["data_entrega"] = pedido_data.data_entrega if pedido_data.data_entrega else None
    
    if update_data:
        await db.pedidos.update_one({"id": pedido_id}, {"$set": update_data})
    
    updated = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if isinstance(updated['data_pedido'], str):
        updated['data_pedido'] = datetime.fromisoformat(updated['data_pedido'])
    if updated.get('data_entrega') and isinstance(updated['data_entrega'], str):
        updated['data_entrega'] = datetime.fromisoformat(updated['data_entrega'])
    return updated


@router.patch("/{pedido_id}/item/{item_index}/entregue")
async def marcar_item_entregue(pedido_id: str, item_index: int, current_user: dict = Depends(get_current_user)):
    """
    Marca um item do pedido como 'já entregue' (retirado do estoque).
    Itens marcados como já entregues não precisam ser produzidos.
    Também remove da produção se já estiver em produção.
    """
    from models import MovimentoEstoque
    
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    items = pedido.get('items', [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Índice do item inválido")
    
    item = items[item_index]
    
    if item.get('ja_entregue'):
        raise HTTPException(status_code=400, detail="Este item já foi marcado como entregue")
    
    # Marcar o item como entregue
    items[item_index]['ja_entregue'] = True
    
    await db.pedidos.update_one(
        {"id": pedido_id},
        {"$set": {"items": items}}
    )
    
    # Verificar se há produção deste item e removê-la
    produto_nome = item.get('produto_nome')
    quantidade = item.get('quantidade')
    
    # Buscar produção vinculada ao pedido com mesmo produto
    producao = await db.producao.find_one({
        "pedido_id": pedido_id,
        "produto_nome": produto_nome,
        "quantidade": quantidade,
        "data_conclusao": None  # Apenas produções não concluídas
    }, {"_id": 0})
    
    acoes = []
    
    if producao:
        # Remover a produção pois o item foi entregue do estoque
        await db.producao.delete_one({"id": producao['id']})
        acoes.append(f"Produção de {produto_nome} removida")
    
    # Dar baixa no estoque
    produto = await db.produtos.find_one({"nome": produto_nome}, {"_id": 0})
    if produto:
        movimento_doc = {
            "id": str(uuid.uuid4()),
            "produto_id": produto['id'],
            "produto_nome": produto_nome,
            "tipo_movimento": "saida",
            "quantidade": quantidade,
            "data_movimento": datetime.now(timezone.utc).isoformat(),
            "responsavel": current_user.get('nome', 'Sistema'),
            "observacoes": f"Entrega antecipada - Pedido {pedido.get('numero')}"
        }
        await db.estoque.insert_one(movimento_doc)
        acoes.append(f"Baixa de {quantidade} {produto_nome} no estoque")
    
    # Verificar se todos os itens foram entregues
    todos_entregues = all(i.get('ja_entregue', False) for i in items)
    if todos_entregues:
        # Atualizar status do pedido para entregue
        await db.pedidos.update_one(
            {"id": pedido_id},
            {"$set": {"status": "entregue"}}
        )
        acoes.append("Pedido marcado como entregue")
    
    return {
        "success": True,
        "message": f"Item {produto_nome} marcado como entregue",
        "acoes": acoes
    }


@router.patch("/{pedido_id}/item/{item_index}/separado")
async def marcar_item_separado(pedido_id: str, item_index: int, current_user: dict = Depends(get_current_user)):
    """
    Marca um item do pedido como 'já separado' (retirado do estoque, pronto para entrega).
    - Remove da lista de produção pendente
    - Dá baixa no estoque
    - Fica disponível para finalizar a venda
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    items = pedido.get('items', [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Índice do item inválido")
    
    item = items[item_index]
    
    if item.get('ja_separado'):
        raise HTTPException(status_code=400, detail="Este item já foi marcado como separado")
    
    if item.get('ja_entregue'):
        raise HTTPException(status_code=400, detail="Este item já foi entregue")
    
    # Marcar o item como separado
    items[item_index]['ja_separado'] = True
    await db.pedidos.update_one(
        {"id": pedido_id},
        {"$set": {"items": items}}
    )
    
    # Verificar se há produção deste item e removê-la
    produto_nome = item.get('produto_nome')
    quantidade = item.get('quantidade', 1)
    
    producao = await db.producao.find_one({
        "pedido_id": pedido_id,
        "produto_nome": produto_nome,
        "status": {"$in": ["pendente", "em_andamento"]}
    }, {"_id": 0})
    
    acoes = []
    
    if producao:
        # Remover a produção pois o item foi separado do estoque
        await db.producao.delete_one({"id": producao['id']})
        acoes.append(f"Produção de {produto_nome} removida")
    
    # Dar baixa no estoque
    produto = await db.produtos.find_one({"nome": produto_nome}, {"_id": 0})
    if produto:
        movimento_doc = {
            "id": str(uuid.uuid4()),
            "produto_id": produto['id'],
            "produto_nome": produto_nome,
            "tipo_movimento": "saida",
            "quantidade": quantidade,
            "data_movimento": datetime.now(timezone.utc).isoformat(),
            "responsavel": current_user.get('nome', 'Sistema'),
            "observacoes": f"Separado para entrega - Pedido {pedido.get('numero')}"
        }
        await db.estoque.insert_one(movimento_doc)
        acoes.append(f"Baixa de {quantidade} {produto_nome} no estoque")
    
    return {
        "success": True,
        "message": f"Item {produto_nome} marcado como separado",
        "acoes": acoes
    }



@router.delete("/{pedido_id}/cancelar")
async def cancelar_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    """
    Cancela um pedido e reverte todas as operações relacionadas:
    - Se em produção: cancela a produção e retorna para pendente ou cancela
    - Se já produzido: retorna produtos ao estoque
    - Não gera venda se já concluído
    """
    from models import MovimentoEstoque
    
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    status_atual = pedido.get('status', 'pendente')
    acoes_realizadas = []
    
    # 1. Verificar se há produções vinculadas a este pedido
    producoes = await db.producao.find({"pedido_id": pedido_id}, {"_id": 0}).to_list(1000)
    
    if producoes:
        for producao in producoes:
            producao_id = producao['id']
            producao_concluida = producao.get('data_conclusao') is not None
            
            if producao_concluida:
                # Produção já concluída - devolver ao estoque
                await db.estoque.insert_one({
                    "id": str(uuid.uuid4()),
                    "produto_id": producao['produto_id'],
                    "produto_nome": producao['produto_nome'],
                    "quantidade": producao['quantidade'],
                    "tipo_movimento": MovimentoEstoque.ENTRADA,
                    "data_movimento": datetime.now(timezone.utc).isoformat(),
                    "responsavel": current_user['nome'],
                    "observacoes": f"Devolução por cancelamento do pedido {pedido.get('numero', pedido_id)}"
                })
                acoes_realizadas.append(f"Devolvido ao estoque: {producao['quantidade']}x {producao['produto_nome']}")
            
            # Marcar produção como cancelada (deletar ou marcar)
            await db.producao.delete_one({"id": producao_id})
            acoes_realizadas.append(f"Produção cancelada: {producao['produto_nome']}")
    
    # 2. Verificar se há embalagens vinculadas
    embalagens = await db.embalagem.find({"pedido_id": pedido_id}, {"_id": 0}).to_list(1000)
    
    if embalagens:
        for embalagem in embalagens:
            embalagem_id = embalagem['id']
            embalagem_concluida = embalagem.get('data_conclusao') is not None
            
            if embalagem_concluida:
                # Embalagem concluída - também devolver ao estoque
                await db.estoque.insert_one({
                    "id": str(uuid.uuid4()),
                    "produto_id": embalagem.get('produto_id', ''),
                    "produto_nome": embalagem['produto_nome'],
                    "quantidade": embalagem['quantidade'],
                    "tipo_movimento": MovimentoEstoque.ENTRADA,
                    "data_movimento": datetime.now(timezone.utc).isoformat(),
                    "responsavel": current_user['nome'],
                    "observacoes": f"Devolução embalagem por cancelamento do pedido {pedido.get('numero', pedido_id)}"
                })
                acoes_realizadas.append(f"Devolvido ao estoque (embalagem): {embalagem['quantidade']}x {embalagem['produto_nome']}")
            
            # Remover embalagem
            await db.embalagem.delete_one({"id": embalagem_id})
            acoes_realizadas.append(f"Embalagem cancelada: {embalagem['produto_nome']}")
    
    # 3. Verificar se há venda vinculada e cancelar se existir
    venda = await db.vendas.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if venda:
        # Marcar venda como cancelada
        await db.vendas.update_one(
            {"pedido_id": pedido_id},
            {"$set": {
                "status_venda": "cancelada",
                "data_cancelamento": datetime.now(timezone.utc).isoformat(),
                "motivo_cancelamento": f"Cancelamento do pedido {pedido.get('numero', pedido_id)}"
            }}
        )
        acoes_realizadas.append("Venda cancelada")
    
    # 4. Atualizar status do pedido para CANCELADO
    await db.pedidos.update_one(
        {"id": pedido_id},
        {"$set": {
            "status": PedidoStatus.CANCELADO,
            "data_cancelamento": datetime.now(timezone.utc).isoformat(),
            "motivo_cancelamento": "Cancelado pelo usuário"
        }}
    )
    
    return {
        "message": f"Pedido {pedido.get('numero', pedido_id)} cancelado com sucesso",
        "status_anterior": status_atual,
        "acoes_realizadas": acoes_realizadas
    }


@router.delete("/{pedido_id}")
async def excluir_pedido(pedido_id: str, current_user: dict = Depends(get_current_user)):
    """
    Exclui um pedido completamente (apenas se pendente)
    Para outros status, use /cancelar
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    if pedido.get('status') != 'pendente':
        raise HTTPException(
            status_code=400, 
            detail="Apenas pedidos pendentes podem ser excluídos. Use a opção 'Cancelar' para outros status."
        )
    
    await db.pedidos.delete_one({"id": pedido_id})
    return {"message": f"Pedido {pedido.get('numero', pedido_id)} excluído com sucesso"}



@router.patch("/{pedido_id}/sincronizar-producao")
async def sincronizar_itens_producao(pedido_id: str, current_user: dict = Depends(get_current_user)):
    """
    Sincroniza os itens do pedido com os itens que estão na produção.
    Adiciona ao pedido qualquer item que esteja na produção mas não esteja no pedido.
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    pedido_numero = pedido.get('numero')
    
    # Buscar itens de produção deste pedido
    producoes = await db.producao.find({"pedido_id": pedido_id}, {"_id": 0}).to_list(100)
    
    if not producoes:
        return {"message": "Nenhum item de produção encontrado para este pedido", "itens_adicionados": 0}
    
    # Identificar itens existentes no pedido
    items_pedido = pedido.get('items', [])
    items_existentes = {}
    for item in items_pedido:
        key = item.get('produto_id')
        items_existentes[key] = True
    
    # Identificar itens que faltam
    itens_para_adicionar = []
    for prod in producoes:
        produto_id = prod.get('produto_id')
        if produto_id not in items_existentes:
            # Buscar preço do produto
            produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
            if not produto:
                continue
            
            preco = produto.get('preco', 0)
            quantidade = prod.get('quantidade', 1)
            
            # Preparar sabores se existirem
            sabores_item = None
            if prod.get('sabores'):
                sabores_item = [{"sabor": s.get('sabor'), "proporcao": s.get('proporcao')} for s in prod.get('sabores')]
            
            novo_item = {
                "produto_id": produto_id,
                "produto_nome": prod.get('produto_nome', produto.get('nome')),
                "quantidade": quantidade,
                "preco_unitario": preco,
                "subtotal": preco * quantidade,
                "sabores": sabores_item,
                "ja_entregue": False,
                "ja_separado": False
            }
            
            itens_para_adicionar.append(novo_item)
            items_existentes[produto_id] = True  # Marcar como adicionado para evitar duplicatas
    
    if not itens_para_adicionar:
        return {"message": "Todos os itens da produção já estão no pedido", "itens_adicionados": 0}
    
    # Calcular novo valor total
    valor_adicional = sum(item['subtotal'] for item in itens_para_adicionar)
    novo_valor_total = pedido.get('valor_total', 0) + valor_adicional
    
    # Atualizar pedido
    await db.pedidos.update_one(
        {"id": pedido_id},
        {
            "$push": {"items": {"$each": itens_para_adicionar}},
            "$set": {"valor_total": novo_valor_total}
        }
    )
    
    nomes_adicionados = [item['produto_nome'] for item in itens_para_adicionar]
    
    return {
        "message": f"Sincronizado! {len(itens_para_adicionar)} item(ns) adicionado(s) ao pedido",
        "itens_adicionados": len(itens_para_adicionar),
        "itens": nomes_adicionados,
        "valor_adicional": valor_adicional,
        "novo_valor_total": novo_valor_total
    }



@router.delete("/{pedido_id}/item/{item_index}")
async def remover_item_pedido(pedido_id: str, item_index: int, current_user: dict = Depends(get_current_user)):
    """
    Remove um item específico do pedido pelo índice.
    Recalcula o valor total automaticamente.
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    items = pedido.get('items', [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Índice de item inválido")
    
    # Obter item a ser removido
    item_removido = items[item_index]
    subtotal_removido = item_removido.get('subtotal', 0)
    
    # Remover item
    items.pop(item_index)
    
    # Recalcular valor total
    novo_valor_total = sum(item.get('subtotal', 0) for item in items)
    
    # Atualizar pedido
    await db.pedidos.update_one(
        {"id": pedido_id},
        {
            "$set": {
                "items": items,
                "valor_total": novo_valor_total
            }
        }
    )
    
    return {
        "message": f"Item '{item_removido.get('produto_nome')}' removido com sucesso",
        "item_removido": item_removido.get('produto_nome'),
        "valor_removido": subtotal_removido,
        "novo_valor_total": novo_valor_total
    }


@router.patch("/{pedido_id}/item/{item_index}/sabores")
async def atualizar_sabores_item(
    pedido_id: str, 
    item_index: int, 
    sabores: List[dict],
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza os sabores de um item específico do pedido.
    Formato: [{"sabor": "PRESTÍGIO", "proporcao": 0.5}, {"sabor": "CEREJA", "proporcao": 0.5}]
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    items = pedido.get('items', [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Índice de item inválido")
    
    # Atualizar sabores do item
    items[item_index]['sabores'] = sabores
    
    # Atualizar pedido
    await db.pedidos.update_one(
        {"id": pedido_id},
        {"$set": {"items": items}}
    )
    
    return {
        "message": f"Sabores do item '{items[item_index].get('produto_nome')}' atualizados",
        "sabores": sabores
    }


@router.patch("/{pedido_id}/localizacao")
async def atualizar_localizacao_pedido(
    pedido_id: str, 
    localizacao: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Atualiza a localização no estoque de um pedido.
    """
    pedido = await db.pedidos.find_one({"id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    
    await db.pedidos.update_one(
        {"id": pedido_id},
        {"$set": {"localizacao_estoque": localizacao}}
    )
    
    return {
        "message": f"Localização do pedido {pedido.get('numero')} atualizada",
        "localizacao_estoque": localizacao
    }



