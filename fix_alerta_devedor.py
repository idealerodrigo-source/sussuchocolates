f = open('frontend/src/pages/VendasPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = '                  </div>\n\n                  <div className="border-t border-[#8B5A3C]/15 pt-4">'

new = '''                  </div>

                  {formData.cliente_id && devedores[formData.cliente_id] && (
                    <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-start gap-2">
                      <span className="text-red-600 text-lg">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-red-700">Cliente com saldo pendente!</p>
                        <p className="text-xs text-red-600">
                          {devedores[formData.cliente_id].cliente_nome} possui {devedores[formData.cliente_id].num_vendas} venda(s) em aberto totalizando R$ {devedores[formData.cliente_id].total_pendente.toFixed(2).replace('.', ',')}.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#8B5A3C]/15 pt-4">'''

result = content.replace(old, new, 1)
open('frontend/src/pages/VendasPage.js', 'w', encoding='utf-8').write(result)
print("Done" if result != content else "NOT FOUND")