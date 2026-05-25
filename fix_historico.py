f = open('backend/models.py', 'r', encoding='utf-8')
lines = f.readlines()
f.close()

# Adicionar classe HistoricoPagamento antes do modelo Venda
for i, line in enumerate(lines):
    if '# Venda Models' in line:
        insert_at = i
        break

new_class = [
    '\n',
    'class HistoricoPagamento(BaseModel):\n',
    '    data: str\n',
    '    valor: float\n',
    '    forma_pagamento: str\n',
    '    quita_total: bool = False\n',
    '    responsavel: Optional[str] = None\n',
    '\n',
]

new_lines = lines[:insert_at] + new_class + lines[insert_at:]

# Adicionar campo historico_pagamentos no modelo Venda (apos valor_pendente)
content = ''.join(new_lines)
old = '    valor_pago_parcial: Optional[float] = None  # Valor parcialmente pago\n    valor_pendente: Optional[float] = None  # Saldo pendente'
new = '    valor_pago_parcial: Optional[float] = None  # Valor parcialmente pago\n    valor_pendente: Optional[float] = None  # Saldo pendente\n    historico_pagamentos: Optional[List[HistoricoPagamento]] = None  # Historico de pagamentos'
content = content.replace(old, new, 1)

open('backend/models.py', 'w', encoding='utf-8').write(content)
print("Done" if 'HistoricoPagamento' in content else "NOT FOUND")