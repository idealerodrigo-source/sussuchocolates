f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# Adicionar funcao buscarDevedores antes de buscarRelatorioVendas
old1 = "  const buscarRelatorioVendas = async () => {"
new1 = """  const buscarDevedores = async () => {
    try {
      const res = await vendasAPI.resumoDevedores();
      setDevedores(res.data || []);
    } catch (e) {
      setDevedores([]);
    }
  };

  const buscarRelatorioVendas = async () => {"""
content = content.replace(old1, new1, 1)

# Adicionar cards de devedores apos os 3 cards existentes
old2 = "              {relatorioVendas.vendas_por_dia?.length > 0 && ("
new2 = """              <div className="bg-[#FFFDF8] border border-orange-200 rounded-xl p-6 shadow-sm md:col-span-3">
                <p className="text-xs font-sans uppercase tracking-wider font-semibold text-orange-600 mb-2">Total em Aberto (A Receber)</p>
                <p className="text-3xl font-serif font-bold text-orange-700">{formatCurrency(devedores.reduce((acc, d) => acc + d.total_pendente, 0))}</p>
                <p className="text-sm text-orange-600 mt-1">{devedores.length} cliente(s) com saldo pendente</p>
              </div>

              {relatorioVendas.vendas_por_dia?.length > 0 && ("""
content = content.replace(old2, new2, 1)

# Adicionar tabela de devedores apos o grafico
old3 = "            </>\n          )}\n        </div>\n      )}\n\n      {/* TAB: PRODUÇÃO GERAL */"
new3 = """            {devedores.length > 0 && (
              <div className="bg-[#FFFDF8] border border-[#8B5A3C]/15 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-serif font-semibold text-[#3E2723] mb-4">Clientes com Saldo Pendente</h3>
                <table className="w-full">
                  <thead className="bg-[#E8D5C4]">
                    <tr>
                      <th className="text-left px-4 py-2 text-sm font-semibold text-[#3E2723]">Cliente</th>
                      <th className="text-center px-4 py-2 text-sm font-semibold text-[#3E2723]">Vendas em Aberto</th>
                      <th className="text-right px-4 py-2 text-sm font-semibold text-[#3E2723]">Total Pendente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devedores.sort((a,b) => b.total_pendente - a.total_pendente).map((d, i) => (
                      <tr key={i} className="border-t border-[#8B5A3C]/10 hover:bg-[#F5E6D3]/50">
                        <td className="px-4 py-3 text-sm text-[#3E2723] font-medium">{d.cliente_nome}</td>
                        <td className="px-4 py-3 text-sm text-center text-[#705A4D]">{d.num_vendas}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-orange-600">{formatCurrency(d.total_pendente)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {/* TAB: PRODUÇÃO GERAL */"""
content = content.replace(old3, new3, 1)

open('frontend/src/pages/RelatoriosPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'buscarDevedores' in content else "NOT FOUND")