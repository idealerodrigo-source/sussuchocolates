f = open('frontend/src/pages/RelatoriosPage.js', 'r', encoding='utf-8')
content = f.read()
f.close()

old = (
    "                    <td className=\"px-4 py-3 text-sm font-medium text-[#3E2723]\">{d.cliente_nome}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-[#705A4D]\">{d.pedido_numero}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-center\"><span className=\"px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold\">{d.produtos_em_comum}</span></td>\n"
)
new = (
    "                    <td className=\"px-4 py-3 text-sm font-medium text-[#3E2723]\">{d.cliente_nome}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-[#705A4D]\">{d.pedido_numero}</td>\n"
    "                    <td className=\"px-4 py-3 text-sm text-center\"><span className=\"px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold\">{d.num_vendas} vendas</span></td>\n"
    "                    <td className=\"px-4 py-3 text-xs text-[#705A4D]\">{d.vendas?.map((v,j) => <div key={j}>{v.venda_id}... {v.data} - R$ {v.valor?.toFixed(2).replace('.',',')}</div>)}</td>\n"
)
result = content.replace(old, new, 1)

old2 = (
    "                  <th className=\"text-left px-4 py-2 text-sm font-semibold text-[#3E2723]\">Cliente</th>\n"
    "                  <th className=\"text-left px-4 py-2 text-sm font-semibold text-[#3E2723]\">Pedido</th>\n"
    "                  <th className=\"text-center px-4 py-2 text-sm font-semibold text-[#3E2723]\">Produtos Duplicados</th>\n"
)
new2 = (
    "                  <th classNam
