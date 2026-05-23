f = open('frontend/src/components/vendas/VendasTable.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '  devedores = {}, onConfirmarPagamento, onEditarPagamento,'
new = '  devedores = {}, onConfirmarPagamento, onEditarPagamento,'

# Verificar se já está correto
if 'devedores = {}' in content:
    print("devedores default OK")
else:
    content = content.replace(
        'onConfirmarPagamento, onEditarPagamento,',
        'devedores = {}, onConfirmarPagamento, onEditarPagamento,',
        1
    )
    print("fixed")

# Verificar linha 265
lines = content.split('\n')
print(f"Line 263-267: {lines[262:267]}")
open('frontend/src/components/vendas/VendasTable.js', 'w', encoding='utf-8').write(content)