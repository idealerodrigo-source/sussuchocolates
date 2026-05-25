f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = "  const handleConfirmarPagamento = async (vendaId, formaPagamento, valorRecebido, quitaTotal) => {\n    try {\n      await vendasAPI.confirmarPagamento(vendaId, {"
new = "  const handleConfirmarPagamento = async (vendaId, formaPagamento, valorRecebido, quitaTotal, parcelas = 1) => {\n    try {\n      await vendasAPI.confirmarPagamento(vendaId, {"

content = content.replace(old, new, 1)

old2 = "        forma_pagamento: formaPagamento,\n        valor_recebido: valorRecebido,\n        quita_total: quitaTotal,"
new2 = "        forma_pagamento: formaPagamento,\n        valor_recebido: valorRecebido,\n        quita_total: quitaTotal,\n        parcelas: parcelas,"

content = content.replace(old2, new2, 1)

open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'parcelas' in content else "NOT FOUND")