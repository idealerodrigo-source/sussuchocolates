f = open('backend/routes/relatorios.py', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '    return {\n        "total_vendas": total_vendas,\n        "valor_total": valor_total,\n        "ticket_medio": valor_total / total_vendas if total_vendas > 0 else 0,\n        "vendas_por_dia": sorted(vendas_por_dia.values(), key=lambda x: x[\'data\'])\n    }'
new = '    vendas_lista = [{\n        "data": v["data_venda"][:10] if isinstance(v["data_venda"], str) else str(v["data_venda"])[:10],\n        "cliente": v.get("cliente_nome",""),\n        "tipo": v.get("tipo_venda",""),\n        "forma_pagamento": v.get("forma_pagamento",""),\n        "status_pagamento": v.get("status_pagamento",""),\n        "status_venda": v.get("status_venda",""),\n        "valor_total": v.get("valor_total",0),\n        "valor_pago_parcial": v.get("valor_pago_parcial"),\n        "valor_pendente": v.get("valor_pendente")\n    } for v in vendas]\n\n    return {\n        "total_vendas": total_vendas,\n        "valor_total": valor_total,\n        "ticket_medio": valor_total / total_vendas if total_vendas > 0 else 0,\n        "vendas_por_dia": sorted(vendas_por_dia.values(), key=lambda x: x[\'data\']),\n        "vendas_lista": vendas_lista\n    }'

result = content.replace(old, new, 1)
open('backend/routes/relatorios.py', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")