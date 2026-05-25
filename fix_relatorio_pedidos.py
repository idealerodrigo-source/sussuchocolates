f = open('backend/routes/relatorios.py', 'r', encoding='utf-8')
content = f.read()
f.close()

new_routes = '''
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


@router.get("/duplicatas")
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
    return duplicatas
'''

# Inserir antes do final do arquivo
content = content.rstrip() + '\n' + new_routes
open('backend/routes/relatorios.py', 'w', encoding='utf-8').write(content)
print("Done" if 'pedidos-sem-venda' in content else "NOT FOUND")