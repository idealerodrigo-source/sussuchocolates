f = open('frontend/src/components/vendas/VendasTable.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '  onConfirmarPagamento, onEditarPagamento,'
new = '  devedores = {}, onConfirmarPagamento, onEditarPagamento,'
content = content.replace(old, new, 1)

old2 = '<td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">{venda.cliente_nome}</td>'
new2 = '''<td className="px-6 py-4 text-sm text-[#4A3B32] font-sans font-medium">
                      {venda.cliente_nome}
                      {devedores[venda.cliente_id] && (
                        <span className="ml-1 text-[10px] text-red-600 font-bold" title={`Devedor: R$ ${devedores[venda.cliente_id].total_pendente.toFixed(2).replace('.', ',')}`}>⚠️ Devedor</span>
                      )}
                    </td>'''
content = content.replace(old2, new2, 1)

open('frontend/src/components/vendas/VendasTable.js', 'w', encoding='utf-8').write(content)
print("Done" if 'Devedor' in content else "NOT FOUND")