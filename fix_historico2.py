f = open('backend/routes/vendas.py', 'r', encoding='utf-8')
content = f.read()
f.close()

# Adicionar import HistoricoPagamento
old1 = 'from models import Venda, VendaCreate, CancelarVendaRequest, MovimentoEstoque, PedidoStatus, ItemPedido'
new1 = 'from models import Venda, VendaCreate, CancelarVendaRequest, MovimentoEstoque, PedidoStatus, ItemPedido, HistoricoPagamento'
content = content.replace(old1, new1, 1)

# Adicionar registro no historico ao confirmar pagamento
old2 = '    await db.vendas.update_one({"id": venda_id}, {"$set": update_fields})\n    return {"message": "Pagamento atualizado com sucesso"}'
new2 = '''    # Registrar no historico
    novo_registro = {
        "data": datetime.now(timezone.utc).isoformat(),
        "valor": update_fields.get("valor_pago_parcial", venda.get("valor_total", 0)),
        "forma_pagamento": update_fields.get("forma_pagamento", venda.get("forma_pagamento", "")),
        "quita_total": update_fields.get("status_pagamento") == "pago",
        "responsavel": current_user.get("nome", "")
    }
    await db.vendas.update_one({"id": venda_id}, {"$set": update_fields, "$push": {"historico_pagamentos": novo_registro}})
    return {"message": "Pagamento atualizado com sucesso"}'''
content = content.replace(old2, new2, 1)

open('backend/routes/vendas.py', 'w', encoding='utf-8').write(content)
print("Done" if 'historico_pagamentos' in content else "NOT FOUND")