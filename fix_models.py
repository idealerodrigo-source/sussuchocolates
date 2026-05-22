f = open('backend/models.py', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Adicionar após linha 300 (pedido_producao_id)
new_lines = lines[:300] + [
    '    valor_pago_parcial: Optional[float] = None  # Valor parcialmente pago\n',
    '    valor_pendente: Optional[float] = None  # Saldo pendente\n',
] + lines[300:]

open('backend/models.py', 'w', encoding='utf-8').write(''.join(new_lines))
print("Done")