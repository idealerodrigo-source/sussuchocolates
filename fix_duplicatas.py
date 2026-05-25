f = open('backend/routes/relatorios.py', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '''@router.get("/duplicatas")
async def duplicatas(current_user: dict = Depends(get_current_user)):
    """Clientes com pedidos e vendas duplicadas (mesmo produto)"""
    vendas = await db.vendas.find(
        {"status_venda": {"$ne": "cancelada"}},
        {"_id": 0, "cliente_id": 1, "cliente_nome": 1, "items": 1, "data_venda": 1, "id": 1}
    ).to_list(1000)

    pedidos = await db.pedidos.find(
        {"status": {"$ne": "cancelado"}},
        {"_id": 0, "cliente_id": 1, "cliente_nome": 1, "items": 1, "data_pedido": 1, "id": 1, "numero": 1}
    ).to_list(1000)

    duplicatas = []
    for venda in vendas:
        cliente_id = venda.get("cliente_id")
        produtos_venda = {i.get("produto_id") for i in venda.get("items", [])}
        for pedido in pedidos:
            if pedido.get("cliente_id") != cliente_id:
                continue
            if pedido.get("id") == venda.get("pedido_id"):
                continue
            produtos_pedido = {i.get("produto_id") for i in pedido.get("items", [])}
            comum = produtos_venda & produtos_pedido
            if comum:
                duplicatas.append({
                    "cliente_nome": venda.get("cliente_nome"),
                    "pedido_numero": pedido.get("numero"),
                    "venda_id": venda.get("id"),
                    "produtos_em_comum": len(comum)
                })
    return duplicatas'''

new = '''@router.get("/duplicatas")
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
    return resultado'''

result = content.replace(old, new, 1)
open('backend/routes/relatorios.py', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")