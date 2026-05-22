f = open('frontend/src/services/api.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = 'confirmarPagamento: (id, data) => api.put(`/vendas/${id}/confirmar-pagamento`, data),'
new = 'confirmarPagamento: (id, data) => api.put(`/vendas/${id}/confirmar-pagamento`, data),\n  editarPagamento: (id, data) => api.put(`/vendas/${id}/editar-pagamento`, data),'

result = content.replace(old, new, 1)
open('frontend/src/services/api.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")