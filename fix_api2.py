f = open('frontend/src/services/api.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '  editarPagamento: (id, data) => api.put(`/vendas/${id}/editar-pagamento`, data),'
new = '  editarPagamento: (id, data) => api.put(`/vendas/${id}/editar-pagamento`, data),\n  resumoDevedores: () => api.get(\'/vendas/devedores/resumo\'),'

result = content.replace(old, new, 1)
open('frontend/src/services/api.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")