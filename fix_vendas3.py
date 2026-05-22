f = open('backend/routes/vendas.py', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

new_lines = lines[:162] + [
    '    update_fields = {"entrega_posterior": False}\n',
    '    if request:\n',
    '        forma = request.get("forma_pagamento")\n',
    '        valor = request.get("valor_recebido")\n',
    '        quita = request.get("quita_total", True)\n',
    '        if forma:\n',
    '            update_fields["forma_pagamento"] = forma\n',
    '        if valor is not None and not quita:\n',
    '            total = venda.get("valor_total", 0)\n',
    '            pago = venda.get("valor_pago_parcial", 0) or 0\n',
    '            novo_pago = pago + valor\n',
    '            saldo = max(0, total - novo_pago)\n',
    '            update_fields["valor_pago_parcial"] = novo_pago\n',
    '            update_fields["valor_pendente"] = saldo\n',
    '            if saldo <= 0.01:\n',
    '                update_fields["status_pagamento"] = "pago"\n',
    '                update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()\n',
    '            else:\n',
    '                update_fields["status_pagamento"] = "pendente"\n',
    '        else:\n',
    '            update_fields["status_pagamento"] = "pago"\n',
    '            update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()\n',
    '    else:\n',
    '        update_fields["status_pagamento"] = "pago"\n',
    '        update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()\n',
    '    await db.vendas.update_one({"id": venda_id}, {"$set": update_fields})\n',
    '    return {"message": "Pagamento atualizado com sucesso"}\n',
] + lines[172:]

open('backend/routes/vendas.py', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")