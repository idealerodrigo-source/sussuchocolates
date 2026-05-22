content = open('backend/routes/vendas.py', 'r', encoding='utf-8').read()
old = '    await db.vendas.update_one(\n        {"id": venda_id},\n        {"$set": {\n            "status_pagamento": "pago",\n            "data_pagamento": datetime.now(timezone.utc).isoformat(),\n            "entrega_posterior": False\n        }}\n    )\n\n    return {"message": "Pagamento confirmado com sucesso"}'
new = '''    update_fields = {"entrega_posterior": False}
    if request:
        forma = request.get("forma_pagamento")
        valor = request.get("valor_recebido")
        quita = request.get("quita_total", True)
        if forma:
            update_fields["forma_pagamento"] = forma
        if valor is not None and not quita:
            total = venda.get("valor_total", 0)
            pago = venda.get("valor_pago_parcial", 0) or 0
            novo_pago = pago + valor
            saldo = max(0, total - novo_pago)
            update_fields["valor_pago_parcial"] = novo_pago
            update_fields["valor_pendente"] = saldo
            if saldo <= 0.01:
                update_fields["status_pagamento"] = "pago"
                update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()
            else:
                update_fields["status_pagamento"] = "pendente"
        else:
            update_fields["status_pagamento"] = "pago"
            update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()
    else:
        update_fields["status_pagamento"] = "pago"
        update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()
    await db.vendas.update_one({"id": venda_id}, {"$set": update_fields})
    return {"message": "Pagamento atualizado com sucesso"}'''
result = content.replace(old, new, 1)
if result == content:
    print("NOT FOUND - no change made")
else:
    open('backend/routes/vendas.py', 'w', encoding='utf-8').write(result)
    print("Done")