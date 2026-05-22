f = open('backend/routes/vendas.py', 'r', encoding='utf-8')
content = f.read()
f.close()

new_route = '''
@router.get("/devedores/resumo")
async def resumo_devedores(current_user: dict = Depends(get_current_user)):
    """Retorna resumo de clientes com saldo pendente"""
    vendas = await db.vendas.find(
        {"status_pagamento": "pendente", "status_venda": {"$ne": "cancelada"}},
        {"_id": 0, "cliente_id": 1, "cliente_nome": 1, "valor_total": 1, "valor_pendente": 1, "valor_pago_parcial": 1}
    ).to_list(1000)

    devedores = {}
    for venda in vendas:
        cliente_id = venda.get("cliente_id")
        if not cliente_id:
            continue
        valor_pendente = venda.get("valor_pendente") or venda.get("valor_total") or 0
        if cliente_id not in devedores:
            devedores[cliente_id] = {
                "cliente_id": cliente_id,
                "cliente_nome": venda.get("cliente_nome"),
                "total_pendente": 0,
                "num_vendas": 0
            }
        devedores[cliente_id]["total_pendente"] += valor_pendente
        devedores[cliente_id]["num_vendas"] += 1

    return list(devedores.values())
'''

insert_before = '@router.get("", response_model=List[Venda])'
content = content.replace(insert_before, new_route + '\n' + insert_before, 1)
open('backend/routes/vendas.py', 'w', encoding='utf-8').write(content)
print("Done" if new_route[:20] in content else "NOT FOUND")