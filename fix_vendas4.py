f = open('backend/routes/vendas.py', 'r', encoding='utf-8')
content = f.read()
f.close()

new_route = '''
@router.put("/{venda_id}/editar-pagamento")
async def editar_pagamento_venda(venda_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    venda = await db.vendas.find_one({"id": venda_id}, {"_id": 0})
    if not venda:
        raise HTTPException(status_code=404, detail="Venda nao encontrada")

    update_fields = {}

    status = request.get("status_pagamento")
    forma = request.get("forma_pagamento")
    valor_pago = request.get("valor_pago_parcial")
    valor_pendente = request.get("valor_pendente")

    if status:
        update_fields["status_pagamento"] = status
        if status == "pago":
            update_fields["data_pagamento"] = datetime.now(timezone.utc).isoformat()
            update_fields["entrega_posterior"] = False
        elif status == "pendente":
            update_fields["data_pagamento"] = None
            update_fields["entrega_posterior"] = True

    if forma:
        update_fields["forma_pagamento"] = forma

    if valor_pago is not None:
        update_fields["valor_pago_parcial"] = valor_pago

    if valor_pendente is not None:
        update_fields["valor_pendente"] = valor_pendente

    await db.vendas.update_one({"id": venda_id}, {"$set": update_fields})
    return {"message": "Pagamento editado com sucesso"}
'''

# Inserir antes da rota restaurar
insert_before = '@router.put("/{venda_id}/restaurar")'
content = content.replace(insert_before, new_route + '\n' + insert_before, 1)
open('backend/routes/vendas.py', 'w', encoding='utf-8').write(content)
print("Done")