content = open('backend/routes/vendas.py', 'r', encoding='utf-8').read()
old = '@router.put("/{venda_id}/confirmar-pagamento")\nasync def confirmar_pagamento_venda(venda_id: str, current_user: dict = Depends(get_current_user)):'
new = '@router.put("/{venda_id}/confirmar-pagamento")\nasync def confirmar_pagamento_venda(venda_id: str, request: dict = None, current_user: dict = Depends(get_current_user)):'
result = content.replace(old, new, 1)
open('backend/routes/vendas.py', 'w', encoding='utf-8').write(result)
print("Done")