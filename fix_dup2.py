f = open('backend/routes/relatorios.py', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "@router.get(\"/duplicatas\")"
new = "@router.get(\"/duplicatas-old\")"
content = content.replace(old, new, 1)

new_route = '''
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
'''

content = content.rstrip() + '\n' + new_route
open('backend/routes/relatorios.py', 'w', encoding='utf-8').write(content)
print("Done" if 'pedidos_map' in content else "NOT FOUND")