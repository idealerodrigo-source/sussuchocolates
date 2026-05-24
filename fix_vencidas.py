f = open('frontend/src/pages/DashboardPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

# 1. Adicionar estado vendasVencidas
old1 = "  const [totalPendente, setTotalPendente] = useState(0);\n  const [numDevedores, setNumDevedores] = useState(0);"
new1 = "  const [totalPendente, setTotalPendente] = useState(0);\n  const [numDevedores, setNumDevedores] = useState(0);\n  const [vendasVencidas, setVendasVencidas] = useState([]);"
content = content.replace(old1, new1, 1)

# 2. Carregar vendas vencidas
old2 = "      try {\n        const devRes = await vendasAPI.resumoDevedores();\n        const total = devRes.data.reduce((acc, d) => acc + d.total_pendente, 0);\n        setTotalPendente(total);\n        setNumDevedores(devRes.data.length);\n      } catch (e) {}"
new2 = "      try {\n        const devRes = await vendasAPI.resumoDevedores();\n        const total = devRes.data.reduce((acc, d) => acc + d.total_pendente, 0);\n        setTotalPendente(total);\n        setNumDevedores(devRes.data.length);\n      } catch (e) {}\n      try {\n        const vendasRes = await vendasAPI.listar();\n        const hoje = new Date();\n        hoje.setHours(0,0,0,0);\n        const vencidas = vendasRes.data.filter(v =>\n          v.status_pagamento === 'pendente' &&\n          v.status_venda !== 'cancelada' &&\n          v.data_previsao_pagamento &&\n          new Date(v.data_previsao_pagamento) < hoje\n        );\n        setVendasVencidas(vencidas);\n      } catch (e) {}"
content = content.replace(old2, new2, 1)

# 3. Adicionar card vencidas apos card a receber
old3 = "      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">"
new3 = """      {vendasVencidas.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-sans uppercase tracking-wider font-semibold text-red-600 mb-1">Pagamentos Vencidos</p>
            <p className="text-3xl font-serif font-bold text-red-700">{vendasVencidas.length} venda(s)</p>
            <p className="text-sm text-red-600 mt-1">Com prazo de pagamento ultrapassado</p>
          </div>
          <div className="p-4 rounded-xl bg-red-100 text-red-600 text-4xl">⚠️</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">"""
content = content.replace(old3, new3, 1)

open('frontend/src/pages/DashboardPage.js', 'w', encoding='utf-8').write(content)
print("Done" if 'vendasVencidas' in content else "NOT FOUND")