f = open('frontend/src/services/api.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "  pedidosStatusVendas: () => api.get('/relatorios/pedidos/status-vendas'),"
new = "  pedidosStatusVendas: () => api.get('/relatorios/pedidos/status-vendas'),\n  pedidosSemVenda: () => api.get('/relatorios/pedidos-sem-venda'),\n  duplicatas: () => api.get('/relatorios/duplicatas'),"
content = content.replace(old, new, 1)

open('frontend/src/services/api.js', 'w', encoding='utf-8').write(content)
print("Done" if 'pedidosSemVenda' in content else "NOT FOUND")